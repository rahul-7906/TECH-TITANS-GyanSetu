/**
 * room.js — GyanSetu Live Collaboration Room
 * Backend: Supabase Realtime (Broadcast) + Supabase Database (state persistence)
 *
 * HOW IT WORKS (plain English):
 * ─────────────────────────────
 * Two Supabase features work together:
 *
 * 1. REALTIME BROADCAST — instant messaging between live peers.
 *    Every keystroke / drawing stroke / chat message is sent through
 *    a named channel. Anyone subscribed gets it in <100ms.
 *
 * 2. DATABASE (room_state table) — stores the latest code + whiteboard
 *    image for each room. When a NEW person joins, they load the saved
 *    state from the database so they see what was already there.
 *    The state is saved automatically every few seconds while you work.
 */

document.addEventListener('DOMContentLoaded', () => {

  lucide.createIcons();

  // ── Guard: make sure the config was filled in ──────────────────────────────
  // NOTE: must use typeof to safely check — const/let don't attach to window
  const _url  = (typeof SUPABASE_URL  !== 'undefined') ? SUPABASE_URL  : '';
  const _key  = (typeof SUPABASE_ANON !== 'undefined') ? SUPABASE_ANON : '';
  const _urlOk = _url.startsWith('https://') && !_url.includes('PASTE');
  const _keyOk = _key.startsWith('eyJ')      && !_key.includes('PASTE');
  if (!_urlOk || !_keyOk) {
    document.getElementById('join-btn').disabled = true;
    document.getElementById('join-error').textContent =
      !_urlOk ? '⚙️ SUPABASE_URL is missing — check js/supabase-config.js'
              : '⚙️ SUPABASE_ANON key is wrong — must start with eyJ...';
    document.getElementById('join-error').classList.remove('hidden');
    return;
  }

  // ── Supabase client ────────────────────────────────────────────────────────
  const supabase = window.supabase.createClient(_url, _key);

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED STATE
  // ═══════════════════════════════════════════════════════════════════════════
  let myName    = '';
  let myRoom    = '';
  let myId      = crypto.randomUUID();   // unique ID for this browser tab
  let myColor   = randomColor();
  let channel   = null;   // the Supabase Realtime channel
  let cmEditor  = null;
  let suppressCodeSync = false;
  let onlineCount = 1;

  // Debounce timers for saving state to the DB
  let saveCodeTimer   = null;
  let saveCanvasTimer = null;

  const wb = {
    canvas: null, ctx: null,
    tool: 'pen', color: '#B9F044', size: 3,
    drawing: false, startX: 0, startY: 0,
    snapshot: null,
    history: [], redoStack: [],
  };

  const peerCursors = {};  // peerId → DOM element

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. JOIN OVERLAY
  // ═══════════════════════════════════════════════════════════════════════════
  const joinOverlay   = document.getElementById('join-overlay');
  const workspace     = document.getElementById('workspace');
  const inputName     = document.getElementById('input-name');
  const inputRoom     = document.getElementById('input-room');
  const joinBtn       = document.getElementById('join-btn');
  const randomRoomBtn = document.getElementById('random-room-btn');

  // Pre-fill room from URL ?room=xxx
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
    if (!myName || !myRoom) { showJoinError('Please fill in both fields.'); return; }
    joinBtn.textContent = 'Connecting…';
    joinBtn.disabled = true;
    joinError().classList.add('hidden');
    initSupabase();
  }

  function showJoinError(msg) {
    const el = joinError();
    el.textContent = msg;
    el.classList.remove('hidden');
    joinBtn.textContent = 'Join Room →';
    joinBtn.disabled = false;
  }

  function joinError() { return document.getElementById('join-error'); }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SUPABASE REALTIME
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Supabase Realtime "Broadcast" works like this:
   *   - We subscribe to a channel named after the room ID.
   *   - We call channel.send({ type:'broadcast', event:'...', payload:{...} })
   *     to send a message.
   *   - Every other subscriber gets an 'event' callback instantly.
   *
   * "Presence" tracks who is online in the channel right now.
   * We use it to show the peer count badge.
   */
  function initSupabase() {
    // Channel name = the room ID (everyone with the same ID joins the same channel)
    channel = supabase.channel(`gyansetu-room-${myRoom}`, {
      config: {
        broadcast : { self: false },   // don't echo our own messages back to us
        presence  : { key: myId },
      }
    });

    // ── Listen for events from other peers ──────────────────────────────────

    channel.on('broadcast', { event: 'code-change' }, ({ payload }) => {
      suppressCodeSync = true;
      if (cmEditor && cmEditor.getValue() !== payload.code) cmEditor.setValue(payload.code);
      if (payload.lang) setEditorLang(payload.lang);
      suppressCodeSync = false;
    });

    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      showTypingIndicator(`${payload.name} is typing…`);
    });

    channel.on('broadcast', { event: 'wb-stroke' }, ({ payload }) => {
      drawRemoteStroke(payload.stroke);
    });

    channel.on('broadcast', { event: 'wb-clear' }, () => {
      clearCanvas(false);
    });

    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      updatePeerCursor(payload.id, payload.name, payload.color, payload.x, payload.y);
    });

    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      appendChatBubble(payload.name, payload.text, payload.color, false);
    });

    // ── Presence: track who is online ───────────────────────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      onlineCount = Object.keys(state).length;
      updatePeerCount(onlineCount);
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      newPresences.forEach(p => appendSystemMsg(`${p.name || 'Someone'} joined the room`));
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      leftPresences.forEach(p => {
        appendSystemMsg(`${p.name || 'Someone'} left the room`);
        removePeerCursor(p.id || '');
      });
    });

    // ── Subscribe and enter the room once connected ──────────────────────────
    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ id: myId, name: myName, color: myColor });
        enterRoom();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        showJoinError('⚠️ Could not connect to Supabase. Check your config in js/supabase-config.js');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2b. DATABASE — save and load room state for late joiners
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * We keep one row per room in a table called "room_state".
   * The row has: room_id (text), code (text), lang (text), canvas (text = base64 PNG).
   * upsert = insert if not exists, update if exists.
   */
  async function loadRoomState() {
    try {
      const { data, error } = await supabase
        .from('room_state')
        .select('code, lang, canvas')
        .eq('room_id', myRoom)
        .maybeSingle();
      if (error) { console.warn('Could not load room state:', error.message); return; }
      if (!data) return;   // room is brand new, nothing to load
      if (data.code && cmEditor) {
        suppressCodeSync = true;
        cmEditor.setValue(data.code);
        suppressCodeSync = false;
      }
      if (data.lang) setEditorLang(data.lang);
      if (data.canvas) restoreCanvasFromDataURL(data.canvas);
    } catch (e) { console.warn('loadRoomState error:', e); }
  }

  function saveCodeToDb(code, lang) {
    clearTimeout(saveCodeTimer);
    saveCodeTimer = setTimeout(async () => {
      try {
        await supabase.from('room_state').upsert(
          { room_id: myRoom, code, lang, updated_at: new Date().toISOString() },
          { onConflict: 'room_id' }
        );
      } catch (e) { console.warn('saveCodeToDb error:', e); }
    }, 1500);  // wait 1.5s after last keystroke before saving
  }

  function saveCanvasToDb() {
    clearTimeout(saveCanvasTimer);
    saveCanvasTimer = setTimeout(async () => {
      if (!wb.canvas) return;
      try {
        const dataURL = wb.canvas.toDataURL('image/jpeg', 0.6);  // compress: JPEG 60%
        await supabase.from('room_state').upsert(
          { room_id: myRoom, canvas: dataURL, updated_at: new Date().toISOString() },
          { onConflict: 'room_id' }
        );
      } catch (e) { console.warn('saveCanvasToDb error:', e); }
    }, 2000);  // wait 2s after last stroke before saving
  }

  function restoreCanvasFromDataURL(dataURL) {
    const img = new Image();
    img.onload = () => {
      if (!wb.canvas) return;
      const r = wb.canvas.getBoundingClientRect();
      wb.ctx.drawImage(img, 0, 0, r.width, r.height);
      pushHistory();
    };
    img.src = dataURL;
  }

  // ── Broadcast helper ────────────────────────────────────────────────────────
  function broadcast(event, payload) {
    if (!channel) return;
    channel.send({ type: 'broadcast', event, payload });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ENTER ROOM
  // ═══════════════════════════════════════════════════════════════════════════
  function enterRoom() {
    joinOverlay.classList.add('hidden');
    workspace.style.removeProperty('display');
    document.getElementById('room-label').textContent = `Room: ${myRoom}`;
    window.history.replaceState({}, '', `?room=${encodeURIComponent(myRoom)}`);
    updatePeerCount(onlineCount);
    initEditor();
    initWhiteboard();
    // Load saved state AFTER editor + canvas are ready
    loadRoomState();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CODE EDITOR  (CodeMirror)
  // ═══════════════════════════════════════════════════════════════════════════
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
      const code = cmEditor.getValue();
      const lang = getCurrentLang();
      broadcast('code-change', { code, lang });
      saveCodeToDb(code, lang);         // ← persist to DB for late joiners
      clearTimeout(typingTimer);
      broadcast('typing', { name: myName });
      typingTimer = setTimeout(() => showTypingIndicator(''), 2000);
    });

    document.getElementById('lang-select').addEventListener('change', e => {
      setEditorLang(e.target.value);
      broadcast('code-change', { code: cmEditor.getValue(), lang: e.target.value });
    });

    document.getElementById('copy-code-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(cmEditor.getValue()).then(() => showToast('Code copied!'));
    });

    document.getElementById('clear-code-btn').addEventListener('click', () => {
      if (!confirm('Clear the shared editor for everyone?')) return;
      cmEditor.setValue('');
      const lang = getCurrentLang();
      broadcast('code-change', { code: '', lang });
      saveCodeToDb('', lang);
    });
  }

  function setEditorLang(lang) {
    const modeMap = { javascript: 'javascript', python: 'python', clike: 'text/x-csrc', java: 'text/x-java' };
    cmEditor.setOption('mode', modeMap[lang] || 'javascript');
    document.getElementById('lang-select').value = lang;
  }

  function getCurrentLang() { return document.getElementById('lang-select').value; }

  let typingMsgTimer = null;
  function showTypingIndicator(msg) {
    document.getElementById('typing-indicator').textContent = msg;
    clearTimeout(typingMsgTimer);
    if (msg) typingMsgTimer = setTimeout(() => showTypingIndicator(''), 3000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. WHITEBOARD  (HTML5 Canvas, pure JS)
  // ═══════════════════════════════════════════════════════════════════════════
  function initWhiteboard() {
    wb.canvas = document.getElementById('wb-canvas');
    wb.ctx    = wb.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    wb.canvas.addEventListener('mousedown',  onPointerDown);
    wb.canvas.addEventListener('mousemove',  onPointerMove);
    wb.canvas.addEventListener('mouseup',    onPointerUp);
    wb.canvas.addEventListener('mouseleave', onPointerUp);

    wb.canvas.addEventListener('touchstart',  e => { e.preventDefault(); onPointerDown(touchToMouse(e)); }, { passive: false });
    wb.canvas.addEventListener('touchmove',   e => { e.preventDefault(); onPointerMove(touchToMouse(e)); }, { passive: false });
    wb.canvas.addEventListener('touchend',    e => { e.preventDefault(); onPointerUp(); }, { passive: false });

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
    wb.canvas.width  = Math.floor(rect.width  * window.devicePixelRatio);
    wb.canvas.height = Math.floor(rect.height * window.devicePixelRatio);
    wb.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const img = new Image();
    img.onload = () => { wb.ctx.drawImage(img, 0, 0, rect.width, rect.height); };
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
      const text = prompt('Enter text:');
      if (!text) return;
      applyStyle();
      wb.ctx.font = `${wb.size * 4 + 10}px "Plus Jakarta Sans", sans-serif`;
      wb.ctx.fillStyle = wb.color;
      wb.ctx.fillText(text, x, y);
      pushHistory();
      broadcast('wb-stroke', { stroke: { type: 'text', text, x, y, color: wb.color, size: wb.size } });
    }
  }

  function onPointerMove(e) {
    const { x, y } = getXY(e);

    // Throttle cursor broadcasts to ~20fps
    const now = Date.now();
    if (!onPointerMove._t || now - onPointerMove._t > 50) {
      onPointerMove._t = now;
      const r = wb.canvas.getBoundingClientRect();
      broadcast('cursor', {
        id: myId, name: myName, color: myColor,
        x: (e.clientX - r.left) / r.width,
        y: (e.clientY - r.top)  / r.height,
      });
    }

    if (!wb.drawing) return;
    applyStyle();

    if (wb.tool === 'pen') {
      wb.ctx.lineTo(x, y);
      wb.ctx.stroke();
      broadcast('wb-stroke', { stroke: { type: 'segment', x1: wb.startX, y1: wb.startY, x2: x, y2: y, color: wb.color, size: wb.size } });
      wb.startX = x; wb.startY = y;
    }

    if (wb.tool === 'eraser') {
      wb.ctx.globalCompositeOperation = 'destination-out';
      wb.ctx.lineWidth = wb.size * 4;
      wb.ctx.lineTo(x, y);
      wb.ctx.stroke();
      wb.ctx.globalCompositeOperation = 'source-over';
      broadcast('wb-stroke', { stroke: { type: 'erase', x1: wb.startX, y1: wb.startY, x2: x, y2: y, size: wb.size * 4 } });
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
      broadcast('wb-stroke', { stroke: { type: wb.tool, x1: wb.startX, y1: wb.startY, x2: endX, y2: endY, color: wb.color, size: wb.size } });
    }
    if (wb.tool === 'pen' || wb.tool === 'eraser') pushHistory();
    wb.ctx.closePath();
    saveCanvasToDb();   // ← persist whiteboard to DB after every stroke
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
      const cx = Math.min(x1, x2) + rx,  cy = Math.min(y1, y2) + ry;
      wb.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      wb.ctx.stroke();
    }
  }

  function drawRemoteStroke(d) {
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
    const s = wb.redoStack.pop();
    wb.history.push(s);
    wb.ctx.putImageData(s, 0, 0);
  }

  function clearCanvas(shouldBroadcast) {
    wb.ctx.clearRect(0, 0, wb.canvas.width, wb.canvas.height);
    wb.history = []; wb.redoStack = [];
    if (shouldBroadcast) {
      broadcast('wb-clear', {});
      saveCanvasToDb();   // save the now-empty canvas to DB
    }
  }

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CHAT
  // ═══════════════════════════════════════════════════════════════════════════
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
    broadcast('chat', { name: myName, color: myColor, text });
  }

  function appendChatBubble(name, text, color, isMine) {
    const wrap   = document.createElement('div');
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. TABS
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. LEAVE
  // ═══════════════════════════════════════════════════════════════════════════
  document.getElementById('leave-btn').addEventListener('click', async () => {
    if (channel) await channel.unsubscribe();
    window.location.href = 'index.html';
  });

  window.addEventListener('beforeunload', () => {
    if (channel) channel.unsubscribe();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
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
