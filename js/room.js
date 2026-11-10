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
  let myId      = crypto.randomUUID();
  let myColor   = randomColor();
  let channel   = null;
  let cmEditor  = null;
  let suppressCodeSync = false;
  let onlineCount = 1;

  // ── Role / Permission state ──────────────────────────────────────────────
  // isHost  : true if this tab created the room (first joiner)
  // canEdit : true if this tab is allowed to type/draw
  // pendingPermRequest: { id, name } of guest currently requesting permission
  let isHost    = false;
  let canEdit   = false;
  let pendingPermRequest = null;

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

    // ── Permission system events ─────────────────────────────────────────────
    // Guest → Host: "I want to edit"
    channel.on('broadcast', { event: 'perm-request' }, ({ payload }) => {
      if (!isHost) return;   // only host handles this
      pendingPermRequest = { id: payload.id, name: payload.name };
      document.getElementById('perm-toast-msg').textContent = `${payload.name} wants permission to edit`;
      document.getElementById('perm-toast').classList.remove('hidden');
    });

    // Host → specific guest: decision
    channel.on('broadcast', { event: 'perm-decision' }, ({ payload }) => {
      if (payload.targetId !== myId) return;  // not for me
      if (payload.allowed) {
        canEdit = true;
        setEditPermission(true);
        showToast('✅ Host allowed you to edit!');
      } else {
        showToast('❌ Host denied your request.');
        setGuestBannerDenied();
      }
    });

    // ── Voice Call signaling events ──────────────────────────────────────────
    channel.on('broadcast', { event: 'voice-signal' }, ({ payload }) => {
      handleVoiceSignal(payload);
    });

    // ── Presence: track who is online ───────────────────────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      onlineCount = Object.keys(state).length;
      updatePeerCount(onlineCount);
      // First joiner = host (only one person in room)
      if (onlineCount === 1 && !isHost) {
        isHost = true;
        canEdit = true;
        setEditPermission(true);
        showHostBadge();
      }
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      newPresences.forEach(p => {
        appendSystemMsg(`${p.name || 'Someone'} joined the room`);
        // Tell a participant who joined the room later that this client is
        // already in voice, so they can establish the WebRTC connection.
        if (inVoiceCall && p.id) {
          broadcast('voice-signal', {
            action: 'voice-join',
            from: myId,
            name: myName,
            to: p.id
          });
        }
      });
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      leftPresences.forEach(p => {
        appendSystemMsg(`${p.name || 'Someone'} left the room`);
        removePeerCursor(p.id || '');
        if (p.id) closePeerVoice(p.id);
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
        // Strip old Unicode-ellipsis placeholders saved before the fix
        const cleaned = data.code.replace(/…/g, '...');
        // Don't restore if it's just a placeholder comment with no real code
        const isOnlyPlaceholder = /^(\/\/|#)\s*Start coding here/.test(cleaned.trim()) &&
                                   cleaned.trim().split('\n').length <= 1;
        if (!isOnlyPlaceholder) {
          suppressCodeSync = true;
          cmEditor.setValue(cleaned);
          suppressCodeSync = false;
        }
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
    initPermissionUI();
    initRunCode();
    loadRoomState();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CODE EDITOR  (CodeMirror)
  // ═══════════════════════════════════════════════════════════════════════════
  // Default starter comment per language
  const PLACEHOLDERS = {
    javascript: '// Start coding here\n',
    python:     '# Start coding here\n',
    clike:      '// Start coding here\n',
    java:       '// Start coding here\n',
  };

  function initEditor() {
    cmEditor = CodeMirror(document.getElementById('editor-wrap'), {
      value: '// Start coding here\n',
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
      const newLang = e.target.value;
      // If editor still has the old placeholder, swap it for the new language's placeholder
      const currentVal = cmEditor.getValue();
      const oldPlaceholder = PLACEHOLDERS[getCurrentLang()] || '';
      if (currentVal === oldPlaceholder || currentVal.trim() === '') {
        suppressCodeSync = true;
        cmEditor.setValue(PLACEHOLDERS[newLang] || '');
        suppressCodeSync = false;
      }
      setEditorLang(newLang);
      broadcast('code-change', { code: cmEditor.getValue(), lang: newLang });
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
  // 3b. PERMISSION UI
  // ═══════════════════════════════════════════════════════════════════════════
  function initPermissionUI() {
    // Host: allow / deny buttons on the permission toast
    document.getElementById('perm-allow').addEventListener('click', () => {
      if (!pendingPermRequest) return;
      broadcast('perm-decision', { targetId: pendingPermRequest.id, allowed: true });
      document.getElementById('perm-toast').classList.add('hidden');
      pendingPermRequest = null;
    });

    document.getElementById('perm-deny').addEventListener('click', () => {
      if (!pendingPermRequest) return;
      broadcast('perm-decision', { targetId: pendingPermRequest.id, allowed: false });
      document.getElementById('perm-toast').classList.add('hidden');
      pendingPermRequest = null;
    });

    // Guest: request permission button
    document.getElementById('request-perm-btn').addEventListener('click', () => {
      broadcast('perm-request', { id: myId, name: myName });
      document.getElementById('guest-banner-title').textContent = 'Request Sent';
      document.getElementById('guest-banner-msg').textContent = 'Waiting for the host to allow you…';
      document.getElementById('request-perm-btn').disabled = true;
    });

    // Guest: dismiss banner and stay as viewer
    document.getElementById('guest-dismiss-btn').addEventListener('click', () => {
      document.getElementById('guest-banner').classList.add('hidden');
    });
  }

  function setEditPermission(allowed) {
    canEdit = allowed;
    if (allowed) {
      // Hide guest banner, show permitted badge
      document.getElementById('guest-banner').classList.add('hidden');
      document.getElementById('guest-badge').classList.add('hidden');
      document.getElementById('permitted-badge').classList.remove('hidden');
      document.getElementById('permitted-badge').classList.add('flex');
      if (cmEditor) cmEditor.setOption('readOnly', false);
    } else {
      // Show guest banner
      document.getElementById('guest-banner').classList.remove('hidden');
      document.getElementById('guest-badge').classList.remove('hidden');
      document.getElementById('guest-badge').classList.add('flex');
      if (cmEditor) cmEditor.setOption('readOnly', true);
    }
  }

  function showHostBadge() {
    document.getElementById('host-badge').classList.remove('hidden');
    document.getElementById('host-badge').classList.add('flex');
    document.getElementById('guest-badge').classList.add('hidden');
    document.getElementById('guest-banner').classList.add('hidden');
  }

  function setGuestBannerDenied() {
    document.getElementById('guest-banner-icon').innerHTML = '<i data-lucide="x-circle" class="h-7 w-7"></i>';
    document.getElementById('guest-banner-title').textContent = 'Request Denied';
    document.getElementById('guest-banner-msg').textContent = 'The host did not allow editing. You can still view.';
    document.getElementById('request-perm-btn').textContent = 'Request Again';
    document.getElementById('request-perm-btn').disabled = false;
    document.getElementById('guest-banner').classList.remove('hidden');
    lucide.createIcons();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4b. RUN CODE
  // JS  → runs locally via new Function(), console.log captured
  // Python → runs in-browser via Pyodide (WebAssembly, no external API)
  // C / Java → not supported in-browser; friendly message shown
  // ═══════════════════════════════════════════════════════════════════════════
  let pyodideReady = null;   // promise, resolved once Pyodide is loaded

  function initRunCode() {
    const btn      = document.getElementById('run-code-btn');
    const panel    = document.getElementById('output-panel');
    const content  = document.getElementById('output-content');
    const closeBtn = document.getElementById('output-close');

    closeBtn.addEventListener('click', () => {
      panel.classList.add('hidden');
      panel.classList.remove('flex');
    });

    btn.addEventListener('click', async () => {
      const code = cmEditor.getValue();
      const lang = getCurrentLang();

      // Show panel
      content.innerHTML = '<span class="text-slate-500 italic">Running…</span>';
      panel.classList.remove('hidden');
      panel.classList.add('flex');

      if (lang === 'javascript') {
        // ── JavaScript: run locally, capture console.log ──────────────────
        const logs = [];
        const _log = console.log;
        const _err = console.error;
        console.log   = (...a) => { logs.push(a.map(String).join(' ')); _log(...a); };
        console.error = (...a) => { logs.push('ERROR: ' + a.map(String).join(' ')); _err(...a); };
        try {
          // eslint-disable-next-line no-new-func
          new Function(code)();
          content.innerHTML = logs.length
            ? logs.map(l => `<div>${escHtml(l)}</div>`).join('')
            : '<span class="text-slate-500 italic">No output.</span>';
        } catch (err) {
          content.innerHTML = `<span class="text-red-400">${escHtml(String(err))}</span>`;
        } finally {
          console.log   = _log;
          console.error = _err;
        }

      } else if (lang === 'python') {
        // ── Python: run via Pyodide (WASM in-browser) ─────────────────────
        try {
          if (!pyodideReady) {
            content.innerHTML = '<span class="text-slate-500 italic">Loading Python runtime… (first run only, ~10s)</span>';
            pyodideReady = loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' });
          }
          const pyodide = await pyodideReady;

          // Sanitize: replace Unicode ellipsis (old placeholder artifact) and
          // convert JS-style // comment lines to Python # comments
          const pyCode = code
            .replace(/…/g, '...')
            .split('\n')
            .map(line => line.match(/^\s*\/\//) ? '# ' + line.replace(/^\s*\/\/\s*/, '') : line)
            .join('\n');

          // Redirect Python stdout/stderr
          const outLines = [];
          pyodide.setStdout({ batched: s => outLines.push(escHtml(s)) });
          pyodide.setStderr({ batched: s => outLines.push(`<span class="text-red-400">${escHtml(s)}</span>`) });

          await pyodide.runPythonAsync(pyCode);

          content.innerHTML = outLines.length
            ? outLines.map(l => `<div>${l}</div>`).join('')
            : '<span class="text-slate-500 italic">No output.</span>';
        } catch (err) {
          // Pyodide throws Python tracebacks as JS errors
          content.innerHTML = `<span class="text-red-400">${escHtml(String(err))}</span>`;
        }

      } else {
        // ── C / Java: cannot run in-browser ───────────────────────────────
        const name = lang === 'clike' ? 'C / C++' : 'Java';
        content.innerHTML = `<span class="text-yellow-400">⚠ ${escHtml(name)} cannot run directly in the browser.</span>
          <div class="mt-1 text-slate-400">Copy your code and paste it into
            <a href="https://onecompiler.com/" target="_blank" class="text-[#B9F044] underline">OneCompiler</a>
            or <a href="https://godbolt.org/" target="_blank" class="text-[#B9F044] underline">Godbolt</a> to execute it.
          </div>`;
      }
    });
  }

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    leaveVoiceCall();
    if (channel) await channel.unsubscribe();
    window.location.href = 'index.html';
  });

  window.addEventListener('beforeunload', () => {
    leaveVoiceCall();
    if (channel) channel.unsubscribe();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8b. WEBRTC VOICE CALL ENGINE (P2P Audio via Supabase Signaling)
  // ═══════════════════════════════════════════════════════════════════════════
  let localVoiceStream = null;
  let inVoiceCall = false;
  let isMicMuted = false;
  const peerConnections = new Map();     // peerId -> RTCPeerConnection
  const voiceMembers = new Set();        // peerId set of current voice participants
  const iceCandidateQueues = new Map();  // peerId -> Array of candidate objects
  let audioContext = null;
  let micAnalyser = null;
  let micSourceNode = null;
  let speakingPollTimer = null;

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  async function joinVoiceCall() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support microphone access.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      localVoiceStream = stream;
      inVoiceCall = true;
      isMicMuted = false;

      // Update UI
      document.getElementById('voice-connect-btn')?.classList.add('hidden');
      document.getElementById('voice-active-group')?.classList.remove('hidden');
      updateMicButtonUI();
      updateVoiceStatusText();
      lucide.createIcons();

      // Start volume meter for speaking pulse
      startSpeakingDetector();

      // Broadcast to room that we joined voice
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'voice-signal',
          payload: { action: 'voice-join', from: myId, name: myName }
        });
      }

      showToast('🎙️ Voice connected! Speak now.');
      appendSystemMsg('You joined the voice call 🎙️');
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Could not access microphone: ' + (err.message || err.name));
    }
  }

  function startSpeakingDetector() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !localVoiceStream) return;
      audioContext = new AudioCtx();
      micSourceNode = audioContext.createMediaStreamSource(localVoiceStream);
      micAnalyser = audioContext.createAnalyser();
      micAnalyser.fftSize = 256;
      micSourceNode.connect(micAnalyser);

      const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);
      const pill = document.getElementById('voice-status-pill');

      speakingPollTimer = setInterval(() => {
        if (!inVoiceCall || isMicMuted || !micAnalyser) {
          if (pill) pill.classList.remove('voice-speaking');
          return;
        }
        micAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        if (avg > 14) {
          if (pill) pill.classList.add('voice-speaking');
        } else {
          if (pill) pill.classList.remove('voice-speaking');
        }
      }, 120);
    } catch (e) {
      console.warn('Speaking detector init failed:', e);
    }
  }

  function toggleVoiceMute() {
    if (!inVoiceCall || !localVoiceStream) return;
    const audioTracks = localVoiceStream.getAudioTracks();
    if (!audioTracks.length) {
      showToast('⚠️ No microphone track is available');
      return;
    }

    isMicMuted = !isMicMuted;
    audioTracks.forEach(track => { track.enabled = !isMicMuted; });
    updateMicButtonUI();
    showToast(isMicMuted ? '🔇 Microphone muted' : '🎙️ Microphone active');
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'voice-signal',
        payload: { action: 'voice-mute-change', from: myId, muted: isMicMuted }
      });
    }
  }

  function updateMicButtonUI() {
    const micIcon = document.getElementById('voice-mic-icon');
    const micLabel = document.getElementById('voice-mic-label');
    if (isMicMuted) {
      if (micIcon) {
        micIcon.setAttribute('data-lucide', 'mic-off');
        micIcon.classList.remove('text-[#B9F044]');
        micIcon.classList.add('text-red-400');
      }
      if (micLabel) micLabel.textContent = 'Unmute';
    } else {
      if (micIcon) {
        micIcon.setAttribute('data-lucide', 'mic');
        micIcon.classList.remove('text-red-400');
        micIcon.classList.add('text-[#B9F044]');
      }
      if (micLabel) micLabel.textContent = 'Mute';
    }
    lucide.createIcons();
  }

  function updateVoiceStatusText() {
    const el = document.getElementById('voice-status-text');
    if (!el) return;
    const total = voiceMembers.size + 1; // peers + me
    el.textContent = total > 1 ? `Voice (${total})` : 'Voice Connected';
  }

  function createPeerConnection(peerId, peerName) {
    const pc = new RTCPeerConnection(rtcConfig);

    // Add local tracks if available
    if (localVoiceStream) {
      localVoiceStream.getAudioTracks().forEach(track => {
        pc.addTrack(track, localVoiceStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && channel) {
        channel.send({
          type: 'broadcast',
          event: 'voice-signal',
          payload: {
            action: 'ice-candidate',
            candidate: event.candidate,
            from: myId,
            to: peerId
          }
        });
      }
    };

    pc.ontrack = (event) => {
      let audioEl = document.getElementById(`audio-peer-${peerId}`);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `audio-peer-${peerId}`;
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        const container = document.getElementById('remote-audio-container');
        if (container) container.appendChild(audioEl);
      }
      audioEl.srcObject = event.streams[0];
      audioEl.play().catch(e => console.warn('Autoplay error:', e));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeerVoice(peerId);
      }
    };

    return pc;
  }

  async function initiateVoiceConnection(peerId, peerName) {
    try {
      const pc = createPeerConnection(peerId, peerName);
      peerConnections.set(peerId, pc);
      voiceMembers.add(peerId);
      updateVoiceStatusText();

      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'voice-signal',
          payload: {
            action: 'offer',
            sdp: pc.localDescription,
            from: myId,
            name: myName,
            to: peerId
          }
        });
      }
    } catch (e) {
      console.error('Error initiating voice connection with', peerId, e);
    }
  }

  async function handleVoiceOffer(peerId, peerName, sdp) {
    try {
      const pc = createPeerConnection(peerId, peerName);
      peerConnections.set(peerId, pc);
      voiceMembers.add(peerId);
      updateVoiceStatusText();

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush any queued candidates
      if (iceCandidateQueues.has(peerId)) {
        const queue = iceCandidateQueues.get(peerId);
        for (const c of queue) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        iceCandidateQueues.delete(peerId);
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'voice-signal',
          payload: {
            action: 'answer',
            sdp: pc.localDescription,
            from: myId,
            name: myName,
            to: peerId
          }
        });
      }
    } catch (e) {
      console.error('Error handling voice offer from', peerId, e);
    }
  }

  async function handleVoiceSignal(payload) {
    if (!payload || payload.from === myId) return;
    if (payload.to && payload.to !== myId) return;

    if (payload.action === 'voice-join') {
      if (inVoiceCall) {
        initiateVoiceConnection(payload.from, payload.name);
        appendSystemMsg(`${payload.name || 'Someone'} joined voice 🎙️`);
      }
      return;
    }

    if (payload.action === 'voice-leave') {
      closePeerVoice(payload.from);
      appendSystemMsg('A peer left voice');
      return;
    }

    if (payload.action === 'offer') {
      if (inVoiceCall) {
        handleVoiceOffer(payload.from, payload.name, payload.sdp);
      }
      return;
    }

    if (payload.action === 'answer') {
      const pc = peerConnections.get(payload.from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        if (iceCandidateQueues.has(payload.from)) {
          const queue = iceCandidateQueues.get(payload.from);
          for (const c of queue) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          iceCandidateQueues.delete(payload.from);
        }
      }
      return;
    }

    if (payload.action === 'ice-candidate') {
      const pc = peerConnections.get(payload.from);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } else {
        if (!iceCandidateQueues.has(payload.from)) {
          iceCandidateQueues.set(payload.from, []);
        }
        iceCandidateQueues.get(payload.from).push(payload.candidate);
      }
      return;
    }
  }

  function closePeerVoice(peerId) {
    const pc = peerConnections.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.delete(peerId);
    }
    const audioEl = document.getElementById(`audio-peer-${peerId}`);
    if (audioEl) audioEl.remove();
    voiceMembers.delete(peerId);
    updateVoiceStatusText();
  }

  function leaveVoiceCall() {
    if (!inVoiceCall) return;
    inVoiceCall = false;

    if (localVoiceStream) {
      localVoiceStream.getTracks().forEach(track => track.stop());
      localVoiceStream = null;
    }
    if (speakingPollTimer) {
      clearInterval(speakingPollTimer);
      speakingPollTimer = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }

    for (const [peerId, pc] of peerConnections.entries()) {
      pc.close();
      const audioEl = document.getElementById(`audio-peer-${peerId}`);
      if (audioEl) audioEl.remove();
    }
    peerConnections.clear();
    voiceMembers.clear();
    iceCandidateQueues.clear();

    // Reset UI
    document.getElementById('voice-active-group')?.classList.add('hidden');
    document.getElementById('voice-connect-btn')?.classList.remove('hidden');
    const pill = document.getElementById('voice-status-pill');
    if (pill) pill.classList.remove('voice-speaking');

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'voice-signal',
        payload: { action: 'voice-leave', from: myId }
      });
    }

    showToast('Voice call disconnected');
    appendSystemMsg('You left the voice call');
  }

  // Voice button listeners
  document.getElementById('voice-connect-btn')?.addEventListener('click', joinVoiceCall);
  document.getElementById('voice-mic-btn')?.addEventListener('click', toggleVoiceMute);
  document.getElementById('voice-disconnect-btn')?.addEventListener('click', leaveVoiceCall);

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
