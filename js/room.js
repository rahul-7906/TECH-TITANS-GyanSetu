/**
 * room.js — GyanSetu Live Collaboration Room
 *
 * HOW IT WORKS (beginner-friendly):
 * ──────────────────────────────────
 * We use PeerJS, which is built on top of WebRTC — the same
 * technology browsers use for video calls.
 *
 * Think of it like a walkie-talkie network:
 *   1. The FIRST person to open a room gets assigned a "host ID"
 *      (which is just the Room ID you typed, e.g. "dsa-tree-467").
 *      Their browser becomes the host.
 *
 *   2. Every SECOND person types the same Room ID and their browser
 *      dials the host directly — peer-to-peer, browser to browser.
 *      The host also connects back so everyone is in a full mesh.
 *
 *   3. After that, every time you type code, draw on the board, or
 *      send a chat message, your browser sends a tiny JSON packet
 *      directly to every other connected peer. No server is involved
 *      at all after the initial handshake.
 *
 * The free 0.peerjs.com broker server is only used for 1–2 seconds
 * at the start to help peers find each other (like a phone directory).
 * After that the connection is completely direct.
 */

document.addEventListener('DOMContentLoaded', () => {

  lucide.createIcons();

  // ═══════════════════════════════════════════════════════════
  // SHARED STATE
  // ═══════════════════════════════════════════════════════════
  let myName   = '';
  let myRoom   = '';
  let myColor  = randomColor();
  let myPeer   = null;          // our PeerJS instance
  let myPeerId = '';            // our unique peer ID on the PeerJS network

  // Map of peerId → DataConnection (one per connected peer)
  const connections = {};

  let cmEditor = null;
  let suppressCodeSync = false;

  const wb = {
    canvas: null, ctx: null,
    tool: 'pen', color: '#B9F044', size: 3,
    drawing: false, startX: 0, startY: 0,
    snapshot: null,
    history: [], redoStack: [],
  };

  const peerCursors = {};   // peerId → { name, color, el }

  // ═══════════════════════════════════════════════════════════
  // 1. JOIN OVERLAY
  // ═══════════════════════════════════════════════════════════
  const joinOverlay   = document.getElementById('join-overlay');
  const workspace     = document.getElementById('workspace');
  const inputName     = document.getElementById('input-name');
  const inputRoom     = document.getElementById('input-room');
  const joinBtn       = document.getElementById('join-btn');
  const joinError     = document.getElementById('join-error');
  const randomRoomBtn = document.getElementById('random-room-btn');

  const urlRoom = new URLSearchParams(window.location.search).get('room');
  if (urlRoom) inputRoom.value = urlRoom;

  randomRoomBtn.addEventListener('click', () => {
    const words = ['dsa','tree','graph','dp','os','sql','react','algo','array','heap'];
    const pick  = a => a[Math.floor(Math.random() * a.length)];
    inputRoom.value = `${pick(words)}-${pick(words)}-${Math.floor(Math.random() * 900 + 100)}`;
  });

  joinBtn.addEventListener('click', tryJoin);
  inputName.addEventListener('keydown', e => { if (e.key === 'Enter') tryJoin(); });
  inputRoom.addEventListener('keydown', e => { if (e.key === 'Enter') tryJoin(); });

  function tryJoin() {
    myName = inputName.value.trim();
    myRoom = inputRoom.value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!myName || !myRoom) {
      showJoinError('Please fill in both fields.');
      return;
    }
    joinBtn.textContent = 'Connecting…';
    joinBtn.disabled = true;
    joinError.classList.add('hidden');
    initPeer();
  }

  function showJoinError(msg) {
    joinError.textContent = msg;
    joinError.classList.remove('hidden');
    joinBtn.textContent = 'Join Room →';
    joinBtn.disabled = false;
  }

  // ═══════════════════════════════════════════════════════════
  // 2. PEERJS — WebRTC backbone
  // ═══════════════════════════════════════════════════════════
  /**
   * PeerJS gives every browser tab a unique ID on a global network.
   * We use "gyansetu-<roomId>-host" as the host's fixed ID.
   * The first peer who successfully registers that ID becomes the host.
   * Everyone else connects to that ID.
   *
   * Message types we send over the data channel:
   *   hello          → { name, color }           (first handshake)
   *   code-change    → { code, lang }             (editor update)
   *   typing         → { name }                   (typing indicator)
   *   wb-stroke      → { ...strokeData }          (whiteboard paint)
   *   wb-clear       → {}                         (clear board)
   *   cursor         → { name, color, x, y }      (mouse position 0-1)
   *   chat           → { name, color, text }       (chat message)
   *   peer-list      → { peers: [{id,name,color}] } (host → new joiner)
   *   sync-state     → { code, lang, canvas }     (host sends full state to new joiner)
   */

  const HOST_ID_PREFIX = 'gyansetu-room-';

  function initPeer() {
    // Create our PeerJS instance with a random unique ID
    myPeer = new Peer(undefined, {
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    });

    myPeer.on('open', id => {
      myPeerId = id;
      // Try to become the host by connecting as a guest first
      tryConnectAsGuest();
    });

    myPeer.on('error', err => {
      // If nobody claimed the host slot and we get "peer-unavailable", we become host
      if (err.type === 'peer-unavailable') {
        // The host doesn't exist yet — we become the host
        becomeHost();
      } else {
        showJoinError('⚠️ Connection error: ' + err.message + '. Try again.');
        console.error('PeerJS error:', err);
      }
    });

    // When a REMOTE peer connects TO us (we're the host, or mesh reconnect)
    myPeer.on('connection', conn => {
      setupConnection(conn, false);
    });
  }

  // ── Try connecting to the existing host ────────────────────
  function tryConnectAsGuest() {
    const hostId = HOST_ID_PREFIX + myRoom;
    const conn   = myPeer.connect(hostId, {
      reliable: true,
      metadata: { name: myName, color: myColor },
    });

    conn.on('open', () => {
      setupConnection(conn, true);
      // After connecting to host, enter the room
      enterRoom();
    });

    // The 'peer-unavailable' error fires on myPeer.on('error'), not here,
    // so we don't need an error handler on conn itself for that case.
  }

  // ── Become the host ────────────────────────────────────────
  function becomeHost() {
    const hostId = HOST_ID_PREFIX + myRoom;
    // Destroy the anonymous peer and create a new one with the fixed host ID
    myPeer.destroy();

    myPeer = new Peer(hostId, {
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    });

    myPeer.on('open', id => {
      myPeerId = id;
      enterRoom();
    });

    myPeer.on('error', err => {
      // Another tab already claimed the host ID between our two attempts
      if (err.type === 'unavailable-id') {
        // That's fine — re-try as guest
        myPeer.destroy();
        initPeer();
      } else {
        showJoinError('⚠️ Connection error: ' + err.message);
        console.error('PeerJS error:', err);
      }
    });

    myPeer.on('connection', conn => {
      setupConnection(conn, false);
    });
  }

  // ── Wire up a data connection in both directions ───────────
  function setupConnection(conn, weInitiated) {
    conn.on('open', () => {
      const peerId = conn.peer;
      connections[peerId] = conn;
      updatePeerCount(Object.keys(connections).length + 1);

      // Send our hello
      send(conn, { type: 'hello', name: myName, color: myColor });

      // If WE are the host and THEY just connected, send full state
      if (isHost() && !weInitiated) {
        setTimeout(() => {
          const canvas = wb.canvas ? wb.canvas.toDataURL() : null;
          send(conn, {
            type: 'sync-state',
            code  : cmEditor ? cmEditor.getValue() : '',
            lang  : getCurrentLang(),
            canvas: canvas,
          });
          // Also tell them about all existing peers
          const peerList = Object.entries(connections)
            .filter(([id]) => id !== peerId)
            .map(([id, c]) => ({ id, name: c._meta?.name || '?', color: c._meta?.color || '#fff' }));
          if (peerList.length) send(conn, { type: 'peer-list', peers: peerList });
        }, 300);
      }
    });

    conn.on('data', data => {
      handleMessage(conn.peer, data);
    });

    conn.on('close', () => {
      const meta = conn._meta || {};
      delete connections[conn.peer];
      updatePeerCount(Object.keys(connections).length + 1);
      appendSystemMsg(`${meta.name || 'Someone'} left the room`);
      removePeerCursor(conn.peer);
    });

    conn.on('error', err => {
      console.warn('Connection error with', conn.peer, err);
    });
  }

  function isHost() {
    return myPeerId === HOST_ID_PREFIX + myRoom;
  }

  // ── Send a JSON object over a single connection ────────────
  function send(conn, data) {
    try { if (conn.open) conn.send(data); } catch(e) { console.warn('send failed', e); }
  }

  // ── Broadcast to ALL connected peers ──────────────────────
  function broadcast(data, exceptId) {
    Object.entries(connections).forEach(([id, conn]) => {
      if (id !== exceptId) send(conn, data);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 3. MESSAGE HANDLER
  // ═══════════════════════════════════════════════════════════
  function handleMessage(fromId, data) {
    switch (data.type) {

      case 'hello':
        // Store metadata on the connection object for later reference
        if (connections[fromId]) connections[fromId]._meta = { name: data.name, color: data.color };
        appendSystemMsg(`${data.name} joined the room`);
        updatePeerCount(Object.keys(connections).length + 1);
        break;

      case 'peer-list':
        // Host told us about other existing peers — connect to each
        data.peers.forEach(({ id }) => {
          if (!connections[id] && id !== myPeerId) {
            const conn = myPeer.connect(id, { reliable: true });
            setupConnection(conn, true);
          }
        });
        break;

      case 'sync-state':
        // Host sent us the full room state on join
        if (data.code !== undefined && cmEditor) {
          suppressCodeSync = true;
          cmEditor.setValue(data.code);
          suppressCodeSync = false;
        }
        if (data.lang) setEditorLang(data.lang);
        if (data.canvas) restoreCanvasFromDataURL(data.canvas);
        break;

      case 'code-change':
        suppressCodeSync = true;
        if (cmEditor && cmEditor.getValue() !== data.code) cmEditor.setValue(data.code);
        if (data.lang) setEditorLang(data.lang);
        suppressCodeSync = false;
        // Re-broadcast (mesh relay if needed, host forwards to all)
        if (isHost()) broadcast(data, fromId);
        break;

      case 'typing':
        showTypingIndicator(`${data.name} is typing…`);
        if (isHost()) broadcast(data, fromId);
        break;

      case 'wb-stroke':
        drawRemoteStroke(data);
        if (isHost()) broadcast(data, fromId);
        break;

      case 'wb-clear':
        clearCanvas(false);
        if (isHost()) broadcast(data, fromId);
        break;

      case 'cursor':
        updatePeerCursor(fromId, data.name, data.color, data.x, data.y);
        if (isHost()) broadcast(data, fromId);
        break;

      case 'chat':
        appendChatBubble(data.name, data.text, data.color, false);
        if (isHost()) broadcast(data, fromId);
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 4. ENTER ROOM — runs once we're connected
  // ═══════════════════════════════════════════════════════════
  function enterRoom() {
    joinOverlay.classList.add('hidden');
    workspace.style.removeProperty('display');
    document.getElementById('room-label').textContent = `Room: ${myRoom}`;
    window.history.replaceState({}, '', `?room=${encodeURIComponent(myRoom)}`);
    updatePeerCount(Object.keys(connections).length + 1);
    initEditor();
    initWhiteboard();
  }

  // ═══════════════════════════════════════════════════════════
  // 5. CODE EDITOR
  // ═══════════════════════════════════════════════════════════
  function initEditor() {
    cmEditor = CodeMirror(document.getElementById('editor-wrap'), {
      value: '// Start coding here…\n',
      mode: 'javascript',
      theme: 'dracula',
      lineNumbers: true,
      tabSize: 2,
      indentWithTabs: false,
      autoCloseBrackets: true,
      lineWrapping: false,
      autofocus: true,
    });
    cmEditor.setSize('100%', '100%');

    let typingTimer = null;
    cmEditor.on('change', () => {
      if (suppressCodeSync) return;
      const payload = { type: 'code-change', code: cmEditor.getValue(), lang: getCurrentLang() };
      broadcast(payload);
      clearTimeout(typingTimer);
      broadcast({ type: 'typing', name: myName });
      typingTimer = setTimeout(() => showTypingIndicator(''), 2000);
    });

    document.getElementById('lang-select').addEventListener('change', e => {
      setEditorLang(e.target.value);
      broadcast({ type: 'code-change', code: cmEditor.getValue(), lang: e.target.value });
    });

    document.getElementById('copy-code-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(cmEditor.getValue()).then(() => showToast('Code copied!'));
    });

    document.getElementById('clear-code-btn').addEventListener('click', () => {
      if (!confirm('Clear the shared editor for everyone?')) return;
      cmEditor.setValue('');
      broadcast({ type: 'code-change', code: '', lang: getCurrentLang() });
    });
  }

  function setEditorLang(lang) {
    const modeMap = { javascript: 'javascript', python: 'python', clike: 'text/x-csrc', java: 'text/x-java' };
    cmEditor.setOption('mode', modeMap[lang] || 'javascript');
    document.getElementById('lang-select').value = lang;
  }

  function getCurrentLang() {
    return document.getElementById('lang-select').value;
  }

  let typingMsgTimer = null;
  function showTypingIndicator(msg) {
    document.getElementById('typing-indicator').textContent = msg;
    clearTimeout(typingMsgTimer);
    if (msg) typingMsgTimer = setTimeout(() => showTypingIndicator(''), 3000);
  }

  // ═══════════════════════════════════════════════════════════
  // 6. WHITEBOARD
  // ═══════════════════════════════════════════════════════════
  function initWhiteboard() {
    wb.canvas = document.getElementById('wb-canvas');
    wb.ctx    = wb.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    wb.canvas.addEventListener('mousedown', onPointerDown);
    wb.canvas.addEventListener('mousemove', onPointerMove);
    wb.canvas.addEventListener('mouseup',   onPointerUp);
    wb.canvas.addEventListener('mouseleave', onPointerUp);

    wb.canvas.addEventListener('touchstart',  e => { e.preventDefault(); onPointerDown(touchToMouse(e)); }, { passive: false });
    wb.canvas.addEventListener('touchmove',   e => { e.preventDefault(); onPointerMove(touchToMouse(e)); }, { passive: false });
    wb.canvas.addEventListener('touchend',    e => { e.preventDefault(); onPointerUp();                  }, { passive: false });

    document.querySelectorAll('.wb-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.wb-tool').forEach(b => b.classList.remove('active-tool'));
        btn.classList.add('active-tool');
        wb.tool = btn.dataset.tool;
        wb.canvas.style.cursor = wb.tool === 'eraser' ? 'cell' : 'crosshair';
      });
    });

    document.getElementById('wb-color').addEventListener('input', e => { wb.color = e.target.value; });
    document.getElementById('wb-size') .addEventListener('input', e => { wb.size  = parseInt(e.target.value); });

    document.getElementById('wb-undo')    .addEventListener('click', undoWhiteboard);
    document.getElementById('wb-redo')    .addEventListener('click', redoWhiteboard);
    document.getElementById('wb-clear')   .addEventListener('click', () => {
      if (!confirm('Clear the whiteboard for everyone?')) return;
      clearCanvas(true);
    });
    document.getElementById('wb-download').addEventListener('click', () => {
      const temp = document.createElement('canvas');
      temp.width = wb.canvas.width; temp.height = wb.canvas.height;
      const tc = temp.getContext('2d');
      tc.fillStyle = '#ffffff'; tc.fillRect(0, 0, temp.width, temp.height);
      tc.drawImage(wb.canvas, 0, 0);
      const a = document.createElement('a');
      a.download = `gyansetu-board-${myRoom}.png`;
      a.href = temp.toDataURL('image/png');
      a.click();
    });
  }

  function resizeCanvas() {
    if (!wb.canvas) return;
    const rect   = wb.canvas.getBoundingClientRect();
    const backup = wb.canvas.toDataURL();
    wb.canvas.width  = rect.width  * window.devicePixelRatio;
    wb.canvas.height = rect.height * window.devicePixelRatio;
    wb.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const img = new Image();
    img.onload = () => { const r = wb.canvas.getBoundingClientRect(); wb.ctx.drawImage(img, 0, 0, r.width, r.height); };
    img.src = backup;
  }

  function touchToMouse(e) {
    const t = e.touches[0] || e.changedTouches[0];
    return { clientX: t.clientX, clientY: t.clientY };
  }

  function getXY(e) {
    const r = wb.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onPointerDown(e) {
    const { x, y } = getXY(e);
    wb.drawing = true;
    wb.startX = x; wb.startY = y;

    if (wb.tool === 'pen' || wb.tool === 'eraser') {
      wb.ctx.beginPath();
      wb.ctx.moveTo(x, y);
    }
    if (wb.tool === 'line' || wb.tool === 'rect' || wb.tool === 'circle') {
      wb.snapshot = wb.ctx.getImageData(0, 0, wb.canvas.width, wb.canvas.height);
    }
    if (wb.tool === 'text') {
      wb.drawing = false;
      const text = prompt('Enter text to place on the board:');
      if (!text) return;
      applyStyle();
      wb.ctx.font = `${wb.size * 4 + 10}px "Plus Jakarta Sans", sans-serif`;
      wb.ctx.fillStyle = wb.color;
      wb.ctx.fillText(text, x, y);
      pushHistory();
      broadcast({ type: 'wb-stroke', stroke: { type: 'text', text, x, y, color: wb.color, size: wb.size } });
    }
  }

  function onPointerMove(e) {
    const { x, y } = getXY(e);

    // Broadcast cursor at ~20fps (throttle by checking a timestamp)
    const now = Date.now();
    if (!onPointerMove._last || now - onPointerMove._last > 50) {
      onPointerMove._last = now;
      const rect = wb.canvas.getBoundingClientRect();
      broadcast({ type: 'cursor', name: myName, color: myColor,
                  x: (e.clientX - rect.left) / rect.width,
                  y: (e.clientY - rect.top)  / rect.height });
    }

    if (!wb.drawing) return;
    applyStyle();

    if (wb.tool === 'pen') {
      wb.ctx.lineTo(x, y);
      wb.ctx.stroke();
      broadcast({ type: 'wb-stroke', stroke: { type: 'segment', x1: wb.startX, y1: wb.startY, x2: x, y2: y, color: wb.color, size: wb.size } });
      wb.startX = x; wb.startY = y;
    }

    if (wb.tool === 'eraser') {
      wb.ctx.globalCompositeOperation = 'destination-out';
      wb.ctx.lineWidth = wb.size * 4;
      wb.ctx.lineTo(x, y);
      wb.ctx.stroke();
      wb.ctx.globalCompositeOperation = 'source-over';
      broadcast({ type: 'wb-stroke', stroke: { type: 'erase', x1: wb.startX, y1: wb.startY, x2: x, y2: y, size: wb.size * 4 } });
      wb.startX = x; wb.startY = y;
    }

    if (wb.tool === 'line' || wb.tool === 'rect' || wb.tool === 'circle') {
      wb.ctx.putImageData(wb.snapshot, 0, 0);
      drawShape(wb.tool, wb.startX, wb.startY, x, y, wb.color, wb.size);
    }
  }

  function onPointerUp(e) {
    if (!wb.drawing) return;
    wb.drawing = false;
    let endX = wb.startX, endY = wb.startY;
    if (e && e.clientX !== undefined) { const p = getXY(e); endX = p.x; endY = p.y; }

    if (wb.tool === 'line' || wb.tool === 'rect' || wb.tool === 'circle') {
      pushHistory();
      broadcast({ type: 'wb-stroke', stroke: { type: wb.tool, x1: wb.startX, y1: wb.startY, x2: endX, y2: endY, color: wb.color, size: wb.size } });
    }
    if (wb.tool === 'pen' || wb.tool === 'eraser') pushHistory();
    wb.ctx.closePath();
  }

  function applyStyle() {
    wb.ctx.strokeStyle = wb.color;
    wb.ctx.lineWidth   = wb.size;
    wb.ctx.lineCap     = 'round';
    wb.ctx.lineJoin    = 'round';
    wb.ctx.globalCompositeOperation = 'source-over';
  }

  function drawShape(type, x1, y1, x2, y2, color, size) {
    wb.ctx.strokeStyle = color; wb.ctx.lineWidth = size;
    wb.ctx.lineCap = 'round'; wb.ctx.lineJoin = 'round';
    wb.ctx.globalCompositeOperation = 'source-over';
    wb.ctx.beginPath();
    if (type === 'line') {
      wb.ctx.moveTo(x1, y1); wb.ctx.lineTo(x2, y2); wb.ctx.stroke();
    } else if (type === 'rect') {
      wb.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    } else if (type === 'circle') {
      const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
      const cx = Math.min(x1, x2) + rx, cy = Math.min(y1, y2) + ry;
      wb.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); wb.ctx.stroke();
    }
  }

  function drawRemoteStroke(data) {
    const d = data.stroke;
    if (!d) return;
    const ctx = wb.ctx;
    ctx.globalCompositeOperation = 'source-over';
    if (d.type === 'segment') {
      ctx.strokeStyle = d.color; ctx.lineWidth = d.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
    } else if (d.type === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = d.size; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (d.type === 'text') {
      ctx.fillStyle = d.color;
      ctx.font = `${d.size * 4 + 10}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(d.text, d.x, d.y);
    } else {
      drawShape(d.type, d.x1, d.y1, d.x2, d.y2, d.color, d.size);
    }
    pushHistory();
  }

  function pushHistory() {
    wb.history.push(wb.ctx.getImageData(0, 0, wb.canvas.width, wb.canvas.height));
    if (wb.history.length > 40) wb.history.shift();
    wb.redoStack = [];
  }

  function undoWhiteboard() {
    if (wb.history.length < 2) return;
    wb.redoStack.push(wb.history.pop());
    wb.ctx.putImageData(wb.history[wb.history.length - 1], 0, 0);
  }

  function redoWhiteboard() {
    if (!wb.redoStack.length) return;
    const state = wb.redoStack.pop();
    wb.history.push(state);
    wb.ctx.putImageData(state, 0, 0);
  }

  function clearCanvas(broadcast_) {
    wb.ctx.clearRect(0, 0, wb.canvas.width, wb.canvas.height);
    wb.history = []; wb.redoStack = [];
    if (broadcast_) broadcast({ type: 'wb-clear' });
  }

  function restoreCanvasFromDataURL(dataURL) {
    const img = new Image();
    img.onload = () => {
      const r = wb.canvas.getBoundingClientRect();
      wb.ctx.drawImage(img, 0, 0, r.width, r.height);
      pushHistory();
    };
    img.src = dataURL;
  }

  // ── Peer cursors ──────────────────────────────────────────
  function updatePeerCursor(id, name, color, rx, ry) {
    if (!wb.canvas) return;
    const rect      = wb.canvas.getBoundingClientRect();
    const container = wb.canvas.parentElement;
    container.style.position = 'relative';

    if (!peerCursors[id]) {
      const el  = document.createElement('div'); el.className = 'peer-cursor';
      const dot = document.createElement('div'); dot.className = 'peer-cursor-dot'; dot.style.background = color;
      const lbl = document.createElement('div'); lbl.className = 'peer-cursor-name'; lbl.style.color = color; lbl.textContent = name;
      el.appendChild(dot); el.appendChild(lbl);
      container.appendChild(el);
      peerCursors[id] = { el };
    }
    peerCursors[id].el.style.left = (rx * rect.width)  + 'px';
    peerCursors[id].el.style.top  = (ry * rect.height) + 'px';
  }

  function removePeerCursor(id) {
    if (peerCursors[id]) { peerCursors[id].el.remove(); delete peerCursors[id]; }
  }

  // ═══════════════════════════════════════════════════════════
  // 7. CHAT
  // ═══════════════════════════════════════════════════════════
  const chatMessages = document.getElementById('chat-messages');
  const chatInput    = document.getElementById('chat-input');
  const chatBadge    = document.getElementById('chat-badge');
  let   chatUnread   = 0;

  document.getElementById('chat-send').addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendChat(); });

  function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    appendChatBubble(myName, text, myColor, true);
    broadcast({ type: 'chat', name: myName, color: myColor, text });
  }

  function appendChatBubble(name, text, color, isMine) {
    const wrap  = document.createElement('div');
    wrap.className = `chat-bubble flex flex-col ${isMine ? 'me' : 'peer'}`;
    const nameEl = document.createElement('div'); nameEl.className = 'name'; nameEl.textContent = isMine ? 'You' : name;
    const msgEl  = document.createElement('div'); msgEl.className  = 'msg';  msgEl.textContent  = text;
    wrap.appendChild(nameEl); wrap.appendChild(msgEl);
    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (!isMine && document.getElementById('tab-chat').classList.contains('hidden')) {
      chatUnread++;
      chatBadge.textContent = chatUnread;
      chatBadge.classList.remove('hidden');
    }
  }

  function appendSystemMsg(text) {
    const el = document.createElement('div'); el.className = 'chat-system'; el.textContent = text;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ═══════════════════════════════════════════════════════════
  // 8. TABS
  // ═══════════════════════════════════════════════════════════
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
      btn.classList.add('active-tab');
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(`tab-${target}`).classList.remove('hidden');
      if (target === 'chat') {
        chatUnread = 0; chatBadge.classList.add('hidden');
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      if (target === 'whiteboard' && wb.canvas) resizeCanvas();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 9. LEAVE
  // ═══════════════════════════════════════════════════════════
  document.getElementById('leave-btn').addEventListener('click', () => {
    if (myPeer) myPeer.destroy();
    window.location.href = 'index.html';
  });

  window.addEventListener('beforeunload', () => {
    if (myPeer) myPeer.destroy();
  });

  // ═══════════════════════════════════════════════════════════
  // 10. HELPERS
  // ═══════════════════════════════════════════════════════════
  function updatePeerCount(n) {
    document.getElementById('peer-count').textContent = n;
  }

  function randomColor() {
    const p = ['#B9F044','#60A5FA','#F472B6','#FB923C','#A78BFA','#34D399','#FACC15','#F87171'];
    return p[Math.floor(Math.random() * p.length)];
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#B9F044;color:#0B1F17;font-size:12px;font-weight:700;padding:8px 18px;border-radius:999px;z-index:9999;pointer-events:none;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

}); // end DOMContentLoaded
