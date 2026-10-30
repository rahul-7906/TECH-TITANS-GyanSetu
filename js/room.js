/**
 * room.js — GyanSetu Live Collaboration Room
 *
 * How it works (beginner-friendly summary):
 * ─────────────────────────────────────────
 * We use Socket.io, a library that keeps an open two-way connection
 * (called a WebSocket) between every browser tab and a free public
 * signalling server (socketio-demo.onrender.com).
 *
 * Think of the server like a post office:
 *   - You "join" a room by name (your Room ID).
 *   - Whenever YOU type code, draw a stroke, or send a chat message,
 *     your browser sends a small packet to that post office.
 *   - The post office immediately forwards it to everyone else in the
 *     same room — and their screens update in real time.
 *
 * Nothing is stored permanently. If everyone leaves, the room is gone.
 */

// ════════════════════════════════════════════════════════════
// 0.  WAIT FOR THE DOM, THEN BOOT EVERYTHING
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // Render Lucide icons into every <i data-lucide="…"> tag
  lucide.createIcons();

  // ── State that the whole module shares ──────────────────
  let myName    = '';
  let myRoom    = '';
  let myColor   = randomColor();   // unique colour per peer (for cursor + chat)
  let socket    = null;            // the Socket.io connection (null until joined)
  let cmEditor  = null;            // the CodeMirror editor instance
  let suppressCodeSync = false;    // prevents echo when we receive remote code

  // Whiteboard state
  const wb = {
    canvas : null,
    ctx    : null,
    tool   : 'pen',
    color  : '#B9F044',
    size   : 3,
    drawing: false,
    startX : 0,
    startY : 0,
    snapshot: null,             // used for live-preview of shapes (rect / circle / line)
    history : [],               // array of ImageData snapshots for undo
    redoStack: [],
  };

  // Map of socketId → { name, color, el } for remote peer cursors on the whiteboard
  const peerCursors = {};

  // ════════════════════════════════════════════════════════════
  // 1.  JOIN OVERLAY
  // ════════════════════════════════════════════════════════════
  const joinOverlay  = document.getElementById('join-overlay');
  const workspace    = document.getElementById('workspace');
  const inputName    = document.getElementById('input-name');
  const inputRoom    = document.getElementById('input-room');
  const joinBtn      = document.getElementById('join-btn');
  const joinError    = document.getElementById('join-error');
  const randomRoomBtn = document.getElementById('random-room-btn');

  // Pre-fill room from URL query param ?room=xxx  (handy for sharing links)
  const urlRoom = new URLSearchParams(window.location.search).get('room');
  if (urlRoom) inputRoom.value = urlRoom;

  // Generate a random readable room ID
  randomRoomBtn.addEventListener('click', () => {
    const words = ['dsa','tree','graph','dp','os','sql','react','algo','array','heap'];
    const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
    inputRoom.value = `${pick(words)}-${pick(words)}-${Math.floor(Math.random()*900+100)}`;
  });

  joinBtn.addEventListener('click', tryJoin);
  inputName.addEventListener('keydown', e => { if (e.key === 'Enter') tryJoin(); });
  inputRoom.addEventListener('keydown', e => { if (e.key === 'Enter') tryJoin(); });

  function tryJoin() {
    myName = inputName.value.trim();
    myRoom = inputRoom.value.trim().toLowerCase().replace(/\s+/g,'-');
    if (!myName || !myRoom) { joinError.classList.remove('hidden'); return; }
    joinError.classList.add('hidden');
    joinBtn.textContent = 'Connecting…';
    joinBtn.disabled = true;
    initSocket();
  }

  // ════════════════════════════════════════════════════════════
  // 2.  SOCKET.IO  — real-time backbone
  // ════════════════════════════════════════════════════════════
  /**
   * We connect to a free public Socket.io relay server.
   * It's only a relay — it never reads your code or messages,
   * it just forwards packets to everyone in the same named room.
   *
   * For production you'd run your own Node.js server, but for a
   * hackathon / prototype this public server is perfect.
   */
  function initSocket() {
    // Free public Socket.io relay (no signup needed)
    socket = io('https://socketio-demo.onrender.com', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      // Tell the server "put me in room <myRoom>"
      socket.emit('join-room', { room: myRoom, name: myName, color: myColor });
    });

    socket.on('connect_error', (err) => {
      joinBtn.textContent = 'Join Room →';
      joinBtn.disabled = false;
      joinError.textContent = '⚠️ Could not connect. Check your internet and try again.';
      joinError.classList.remove('hidden');
      console.error('Socket connect error:', err);
    });

    // ── Server confirms we joined ─────────────────────────
    socket.on('room-joined', ({ peers, fullCode, fullCanvas }) => {
      // Hide overlay, show workspace
      joinOverlay.classList.add('hidden');
      workspace.style.removeProperty('display');

      document.getElementById('room-label').textContent = `Room: ${myRoom}`;
      updatePeerCount(peers);

      // Update the browser URL so it can be copy-pasted
      window.history.replaceState({}, '', `?room=${encodeURIComponent(myRoom)}`);

      // Boot editor and whiteboard (needs the canvas to be visible first)
      initEditor();
      initWhiteboard();

      // If the room already had content, load it
      if (fullCode)   { suppressCodeSync = true; cmEditor.setValue(fullCode); suppressCodeSync = false; }
      if (fullCanvas) restoreCanvasFromDataURL(fullCanvas);
    });

    // ── A new peer joined ─────────────────────────────────
    socket.on('peer-joined', ({ name, peers }) => {
      updatePeerCount(peers);
      appendSystemMsg(`${name} joined the room`);
    });

    // ── A peer left ───────────────────────────────────────
    socket.on('peer-left', ({ name, peers, id }) => {
      updatePeerCount(peers);
      appendSystemMsg(`${name} left the room`);
      removePeerCursor(id);
    });

    // ── Remote code change ────────────────────────────────
    socket.on('code-change', ({ code, lang }) => {
      suppressCodeSync = true;
      if (cmEditor.getValue() !== code) cmEditor.setValue(code);
      if (lang) setEditorLang(lang);
      suppressCodeSync = false;
    });

    // ── Remote typing indicator ───────────────────────────
    socket.on('peer-typing', ({ name }) => {
      showTypingIndicator(`${name} is typing…`);
    });

    // ── Remote whiteboard stroke ──────────────────────────
    socket.on('wb-stroke', (strokeData) => {
      drawRemoteStroke(strokeData);
    });

    // ── Remote whiteboard clear ───────────────────────────
    socket.on('wb-clear', () => {
      clearCanvas(false);  // false = don't re-broadcast
    });

    // ── Remote cursor position ────────────────────────────
    socket.on('peer-cursor', ({ id, name, color, x, y }) => {
      updatePeerCursor(id, name, color, x, y);
    });

    // ── Remote chat message ───────────────────────────────
    socket.on('chat-message', ({ name, color, text }) => {
      appendChatBubble(name, text, color, false);
    });
  }

  // ════════════════════════════════════════════════════════════
  // 3.  CODE EDITOR  (CodeMirror)
  // ════════════════════════════════════════════════════════════
  function initEditor() {
    cmEditor = CodeMirror(document.getElementById('editor-wrap'), {
      value        : '// Start coding here…\n',
      mode         : 'javascript',
      theme        : 'dracula',
      lineNumbers  : true,
      tabSize      : 2,
      indentWithTabs: false,
      autoCloseBrackets: true,
      lineWrapping : false,
      autofocus    : true,
    });

    // Make the editor fill its parent height
    cmEditor.setSize('100%', '100%');

    // ── Broadcast every keystroke to the room ─────────────
    let typingTimer = null;
    cmEditor.on('change', () => {
      if (suppressCodeSync || !socket) return;
      socket.emit('code-change', { room: myRoom, code: cmEditor.getValue(), lang: getCurrentLang() });

      // Typing indicator: debounce so we don't spam events
      clearTimeout(typingTimer);
      socket.emit('peer-typing', { room: myRoom, name: myName });
      typingTimer = setTimeout(() => showTypingIndicator(''), 2000);
    });

    // Language switcher
    document.getElementById('lang-select').addEventListener('change', (e) => {
      setEditorLang(e.target.value);
      if (socket) socket.emit('code-change', { room: myRoom, code: cmEditor.getValue(), lang: e.target.value });
    });

    // Copy code
    document.getElementById('copy-code-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(cmEditor.getValue()).then(() => showToast('Code copied!'));
    });

    // Clear editor
    document.getElementById('clear-code-btn').addEventListener('click', () => {
      if (!confirm('Clear the shared editor for everyone?')) return;
      cmEditor.setValue('');
      if (socket) socket.emit('code-change', { room: myRoom, code: '', lang: getCurrentLang() });
    });
  }

  function setEditorLang(lang) {
    const modeMap = { javascript:'javascript', python:'python', clike:'text/x-csrc', java:'text/x-java' };
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

  // ════════════════════════════════════════════════════════════
  // 4.  WHITEBOARD  (HTML5 Canvas, pure JS — no rects/SVG)
  // ════════════════════════════════════════════════════════════
  function initWhiteboard() {
    wb.canvas = document.getElementById('wb-canvas');
    wb.ctx    = wb.canvas.getContext('2d');

    // Make canvas pixel-perfect at the right size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ── Drawing events (mouse) ────────────────────────────
    wb.canvas.addEventListener('mousedown',  onPointerDown);
    wb.canvas.addEventListener('mousemove',  onPointerMove);
    wb.canvas.addEventListener('mouseup',    onPointerUp);
    wb.canvas.addEventListener('mouseleave', onPointerUp);

    // ── Drawing events (touch — works on phones) ──────────
    wb.canvas.addEventListener('touchstart',  e => { e.preventDefault(); onPointerDown(touchToMouse(e)); }, { passive: false });
    wb.canvas.addEventListener('touchmove',   e => { e.preventDefault(); onPointerMove(touchToMouse(e)); }, { passive: false });
    wb.canvas.addEventListener('touchend',    e => { e.preventDefault(); onPointerUp();                  }, { passive: false });

    // ── Tool buttons ──────────────────────────────────────
    document.querySelectorAll('.wb-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.wb-tool').forEach(b => b.classList.remove('active-tool'));
        btn.classList.add('active-tool');
        wb.tool = btn.dataset.tool;
        wb.canvas.style.cursor = wb.tool === 'eraser' ? 'cell' : 'crosshair';
      });
    });

    document.getElementById('wb-color').addEventListener('input',  e => { wb.color = e.target.value; });
    document.getElementById('wb-size') .addEventListener('input',  e => { wb.size  = parseInt(e.target.value); });

    document.getElementById('wb-undo')    .addEventListener('click', undoWhiteboard);
    document.getElementById('wb-redo')    .addEventListener('click', redoWhiteboard);
    document.getElementById('wb-clear')   .addEventListener('click', () => {
      if (!confirm('Clear the whiteboard for everyone?')) return;
      clearCanvas(true);
    });
    document.getElementById('wb-download').addEventListener('click', () => {
      // Temporarily draw on a white background for PNG export
      const temp = document.createElement('canvas');
      temp.width  = wb.canvas.width;
      temp.height = wb.canvas.height;
      const tc = temp.getContext('2d');
      tc.fillStyle = '#ffffff';
      tc.fillRect(0, 0, temp.width, temp.height);
      tc.drawImage(wb.canvas, 0, 0);
      const a = document.createElement('a');
      a.download = `gyansetu-board-${myRoom}.png`;
      a.href = temp.toDataURL('image/png');
      a.click();
    });
  }

  // Keep canvas resolution in sync with its CSS size
  function resizeCanvas() {
    if (!wb.canvas) return;
    const rect   = wb.canvas.getBoundingClientRect();
    const backup = wb.canvas.toDataURL();   // save current drawing
    wb.canvas.width  = rect.width  * window.devicePixelRatio;
    wb.canvas.height = rect.height * window.devicePixelRatio;
    wb.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    // Re-draw saved content after resize
    const img = new Image();
    img.onload = () => wb.ctx.drawImage(img, 0, 0, rect.width, rect.height);
    img.src = backup;
  }

  // Convert a touch event into a fake mouse event object
  function touchToMouse(e) {
    const t = e.touches[0] || e.changedTouches[0];
    return { clientX: t.clientX, clientY: t.clientY };
  }

  // Get canvas coordinates from a mouse/touch event
  function getXY(e) {
    const r = wb.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onPointerDown(e) {
    const { x, y } = getXY(e);
    wb.drawing  = true;
    wb.startX   = x;
    wb.startY   = y;

    // For freehand pen/eraser we start a new path
    if (wb.tool === 'pen' || wb.tool === 'eraser') {
      wb.ctx.beginPath();
      wb.ctx.moveTo(x, y);
    }

    // For shapes we save the current pixels so we can redraw the clean slate each mousemove
    if (wb.tool === 'line' || wb.tool === 'rect' || wb.tool === 'circle') {
      wb.snapshot = wb.ctx.getImageData(0, 0, wb.canvas.width, wb.canvas.height);
    }

    // For text tool, show a prompt
    if (wb.tool === 'text') {
      wb.drawing = false;
      const text = prompt('Enter text to place on the board:');
      if (!text) return;
      applyStyle();
      wb.ctx.font = `${wb.size * 4 + 10}px "Plus Jakarta Sans", sans-serif`;
      wb.ctx.fillStyle = wb.color;
      wb.ctx.fillText(text, x, y);
      pushHistory();
      if (socket) {
        socket.emit('wb-stroke', {
          room: myRoom,
          type: 'text', text, x, y,
          color: wb.color, size: wb.size,
        });
      }
    }
  }

  function onPointerMove(e) {
    const { x, y } = getXY(e);

    // Broadcast cursor position so peers see where you are
    if (socket) {
      socket.emit('peer-cursor', {
        room: myRoom, name: myName, color: myColor,
        x: x / wb.canvas.getBoundingClientRect().width,   // send as 0-1 ratio
        y: y / wb.canvas.getBoundingClientRect().height,
      });
    }

    if (!wb.drawing) return;

    applyStyle();

    if (wb.tool === 'pen') {
      wb.ctx.lineTo(x, y);
      wb.ctx.stroke();
      // Emit incremental stroke segment
      if (socket) {
        socket.emit('wb-stroke', {
          room: myRoom,
          type: 'segment',
          x1: wb.startX, y1: wb.startY, x2: x, y2: y,
          color: wb.color, size: wb.size,
        });
      }
      wb.startX = x; wb.startY = y;
    }

    if (wb.tool === 'eraser') {
      wb.ctx.globalCompositeOperation = 'destination-out';
      wb.ctx.lineWidth = wb.size * 4;
      wb.ctx.lineTo(x, y);
      wb.ctx.stroke();
      wb.ctx.globalCompositeOperation = 'source-over';
      if (socket) {
        socket.emit('wb-stroke', {
          room: myRoom,
          type: 'erase',
          x1: wb.startX, y1: wb.startY, x2: x, y2: y,
          size: wb.size * 4,
        });
      }
      wb.startX = x; wb.startY = y;
    }

    // For shapes: restore the snapshot, then draw a fresh preview
    if (wb.tool === 'line' || wb.tool === 'rect' || wb.tool === 'circle') {
      wb.ctx.putImageData(wb.snapshot, 0, 0);
      drawShape(wb.tool, wb.startX, wb.startY, x, y, wb.color, wb.size);
    }
  }

  function onPointerUp(e) {
    if (!wb.drawing) return;
    wb.drawing = false;

    const endX = e ? getXY(e).x : wb.startX;
    const endY = e ? getXY(e).y : wb.startY;

    if (wb.tool === 'line' || wb.tool === 'rect' || wb.tool === 'circle') {
      pushHistory();
      if (socket) {
        socket.emit('wb-stroke', {
          room: myRoom,
          type: wb.tool,
          x1: wb.startX, y1: wb.startY, x2: endX, y2: endY,
          color: wb.color, size: wb.size,
        });
      }
    }

    if (wb.tool === 'pen' || wb.tool === 'eraser') {
      pushHistory();
    }

    wb.ctx.closePath();
  }

  // Set up line style for the drawing context
  function applyStyle() {
    wb.ctx.strokeStyle = wb.color;
    wb.ctx.lineWidth   = wb.size;
    wb.ctx.lineCap     = 'round';
    wb.ctx.lineJoin    = 'round';
    wb.ctx.globalCompositeOperation = 'source-over';
  }

  // Draw a shape (line, rectangle, circle) at given coords
  function drawShape(type, x1, y1, x2, y2, color, size) {
    wb.ctx.strokeStyle = color;
    wb.ctx.lineWidth   = size;
    wb.ctx.lineCap     = 'round';
    wb.ctx.lineJoin    = 'round';
    wb.ctx.globalCompositeOperation = 'source-over';
    wb.ctx.beginPath();
    if (type === 'line') {
      wb.ctx.moveTo(x1, y1);
      wb.ctx.lineTo(x2, y2);
      wb.ctx.stroke();
    } else if (type === 'rect') {
      wb.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    } else if (type === 'circle') {
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      const cx = Math.min(x1, x2) + rx;
      const cy = Math.min(y1, y2) + ry;
      wb.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      wb.ctx.stroke();
    }
  }

  // Draw a stroke that came from a remote peer
  function drawRemoteStroke(d) {
    const ctx = wb.ctx;
    ctx.globalCompositeOperation = 'source-over';

    if (d.type === 'segment') {
      ctx.strokeStyle = d.color; ctx.lineWidth = d.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
    } else if (d.type === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = d.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (d.type === 'text') {
      ctx.fillStyle = d.color;
      ctx.font = `${d.size * 4 + 10}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(d.text, d.x, d.y);
    } else if (d.type === 'line' || d.type === 'rect' || d.type === 'circle') {
      drawShape(d.type, d.x1, d.y1, d.x2, d.y2, d.color, d.size);
    }
    pushHistory();
  }

  // ── Undo / Redo ────────────────────────────────────────────
  function pushHistory() {
    wb.history.push(wb.ctx.getImageData(0, 0, wb.canvas.width, wb.canvas.height));
    if (wb.history.length > 40) wb.history.shift();   // cap memory
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

  function clearCanvas(broadcast) {
    wb.ctx.clearRect(0, 0, wb.canvas.width, wb.canvas.height);
    wb.history  = [];
    wb.redoStack = [];
    if (broadcast && socket) socket.emit('wb-clear', { room: myRoom });
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

  // ── Peer cursors on the whiteboard ─────────────────────────
  function updatePeerCursor(id, name, color, rx, ry) {
    if (!wb.canvas) return;
    const rect = wb.canvas.getBoundingClientRect();
    const x    = rx * rect.width;
    const y    = ry * rect.height;

    const container = wb.canvas.parentElement;

    if (!peerCursors[id]) {
      const el      = document.createElement('div');
      el.className  = 'peer-cursor';
      const dot     = document.createElement('div');
      dot.className = 'peer-cursor-dot';
      dot.style.background = color;
      const lbl     = document.createElement('div');
      lbl.className = 'peer-cursor-name';
      lbl.style.color = color;
      lbl.textContent = name;
      el.appendChild(dot);
      el.appendChild(lbl);
      container.style.position = 'relative';
      container.appendChild(el);
      peerCursors[id] = { name, color, el };
    }
    const c = peerCursors[id];
    c.el.style.left = x + 'px';
    c.el.style.top  = y + 'px';
  }

  function removePeerCursor(id) {
    if (peerCursors[id]) {
      peerCursors[id].el.remove();
      delete peerCursors[id];
    }
  }

  // ════════════════════════════════════════════════════════════
  // 5.  CHAT
  // ════════════════════════════════════════════════════════════
  const chatMessages = document.getElementById('chat-messages');
  const chatInput    = document.getElementById('chat-input');
  const chatSend     = document.getElementById('chat-send');
  const chatBadge    = document.getElementById('chat-badge');
  let   chatUnread   = 0;

  chatSend.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendChat(); });

  function sendChat() {
    const text = chatInput.value.trim();
    if (!text || !socket) return;
    chatInput.value = '';
    appendChatBubble(myName, text, myColor, true);   // show instantly for sender
    socket.emit('chat-message', { room: myRoom, name: myName, color: myColor, text });
  }

  function appendChatBubble(name, text, color, isMine) {
    const wrap = document.createElement('div');
    wrap.className = `chat-bubble flex flex-col ${isMine ? 'me' : 'peer'}`;

    const nameEl     = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = isMine ? 'You' : name;

    const msgEl      = document.createElement('div');
    msgEl.className  = 'msg';
    msgEl.textContent = text;

    wrap.appendChild(nameEl);
    wrap.appendChild(msgEl);
    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Show red badge on chat tab if chat is not visible
    if (!isMine && document.getElementById('tab-chat').classList.contains('hidden')) {
      chatUnread++;
      chatBadge.textContent = chatUnread;
      chatBadge.classList.remove('hidden');
    }
  }

  function appendSystemMsg(text) {
    const el = document.createElement('div');
    el.className = 'chat-system';
    el.textContent = text;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ════════════════════════════════════════════════════════════
  // 6.  TAB SWITCHING  (Whiteboard ↔ Chat)
  // ════════════════════════════════════════════════════════════
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
      btn.classList.add('active-tab');
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(`tab-${target}`).classList.remove('hidden');

      if (target === 'chat') {
        chatUnread = 0;
        chatBadge.classList.add('hidden');
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      // Resize canvas when its tab becomes visible (it may have been 0×0)
      if (target === 'whiteboard' && wb.canvas) resizeCanvas();
    });
  });

  // ════════════════════════════════════════════════════════════
  // 7.  LEAVE ROOM
  // ════════════════════════════════════════════════════════════
  document.getElementById('leave-btn').addEventListener('click', () => {
    if (socket) { socket.emit('leave-room', { room: myRoom, name: myName }); socket.disconnect(); }
    window.location.href = 'index.html';
  });

  // Also disconnect cleanly when the tab/window is closed
  window.addEventListener('beforeunload', () => {
    if (socket) { socket.emit('leave-room', { room: myRoom, name: myName }); }
  });

  // ════════════════════════════════════════════════════════════
  // 8.  HELPERS
  // ════════════════════════════════════════════════════════════
  function updatePeerCount(peers) {
    document.getElementById('peer-count').textContent = peers;
  }

  function randomColor() {
    const palette = ['#B9F044','#60A5FA','#F472B6','#FB923C','#A78BFA','#34D399','#FACC15','#F87171'];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#B9F044;color:#0B1F17;font-size:12px;font-weight:700;padding:8px 18px;border-radius:999px;z-index:9999;pointer-events:none;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

}); // end DOMContentLoaded
