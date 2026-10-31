/**
 * session.js — GyanSetu Session Booking & Credit System
 *
 * COMPLETE END-TO-END WORKFLOW:
 * ──────────────────────────────
 * 1. Request: Learner specifies Mentor, Topic, Credits offered (held safely in Escrow).
 * 2. Accept:   Mentor accepts the pending request.
 * 3. Sprint:   15-Minute Live Countdown Timer ticks down synchronously for both peers.
 * 4. Study:    Mentor shares YouTube Video Lecture + Study Plan & Notes (streams live to learner).
 * 5. Collab:   Both can jump into the Live Code & Whiteboard room at any time.
 * 6. Verify:   Mentor sends verification quiz or triggers completion.
 * 7. Escrow:   Credits move ONLY when session is marked complete & verified.
 *
 * Realtime Architecture:
 * - Supabase Broadcast Channels (cross-network)
 * - BroadcastChannel API + LocalStorage event bus fallback (instant 0ms cross-tab local demo)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  // ── Supabase client ────────────────────────────────────────────────────────
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // ── Local state ────────────────────────────────────────────────────────────
  let myName          = '';
  let myRole          = 'learner';   // 'learner' | 'mentor'
  let sessionId       = null;
  let sessionData     = null;
  let channel         = null;
  let quizData        = null;        // { questions: [...] }

  // 15-Minute Timer State
  let sessionTimerInterval = null;
  const DEFAULT_DURATION   = 15 * 60; // 900 seconds (15 minutes)
  let totalDuration        = DEFAULT_DURATION;
  let remainingSeconds     = DEFAULT_DURATION;
  let timerActive          = false;

  // ── Universal Multi-Channel Cross-Tab Bus ──────────────────────────────────
  const sessionBus = ('BroadcastChannel' in window)
    ? new BroadcastChannel('gyansetu_session_bus')
    : null;
  const processedEvents = new Set();

  function emitSessionEvent(eventName, payload = {}) {
    const fullPayload = {
      ...payload,
      sessionId: sessionId || activeSessionId,
      sender: myName,
      role: myRole,
      eventId: `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    };

    // 1. Supabase Realtime broadcast
    if (channel) {
      try {
        channel.send({ type: 'broadcast', event: eventName, payload: fullPayload });
      } catch (e) {
        console.warn('Supabase broadcast failed:', e);
      }
    }

    // 2. Browser BroadcastChannel (instant zero-latency cross-tab sync)
    if (sessionBus) {
      try {
        sessionBus.postMessage({ event: eventName, payload: fullPayload });
      } catch (e) {}
    }

    // 3. LocalStorage fallback (works universally across tabs & windows)
    try {
      localStorage.setItem('gyansetu_session_bus_event', JSON.stringify({
        event: eventName,
        payload: fullPayload,
        t: Date.now()
      }));
    } catch (e) {}
  }

  function handleIncomingEvent(eventName, payload) {
    if (!payload) return;
    if (payload.eventId && processedEvents.has(payload.eventId)) return;
    if (payload.eventId) processedEvents.add(payload.eventId);
    if (payload.sender && payload.sender === myName && payload.role === myRole) return;

    console.log(`[SessionSync] Received ${eventName}:`, payload);

    if (eventName === 'session-accepted') {
      onSessionAcceptedRemote(payload);
    } else if (eventName === 'session-resources-updated') {
      onResourcesUpdatedRemote(payload);
    } else if (eventName === 'timer-sync') {
      onTimerSyncRemote(payload);
    } else if (eventName === 'quiz-sent') {
      onQuizSentRemote(payload);
    } else if (eventName === 'quiz-result') {
      onQuizResultRemote(payload);
    } else if (eventName === 'session-complete') {
      onSessionCompleteRemote(payload);
    } else if (eventName === 'student-satisfaction') {
      onStudentSatisfactionRemote(payload);
    }
  }

  if (sessionBus) {
    sessionBus.onmessage = (e) => {
      if (e.data && e.data.event) {
        handleIncomingEvent(e.data.event, e.data.payload);
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'gyansetu_session_bus_event' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.event) {
          handleIncomingEvent(parsed.event, parsed.payload);
        }
      } catch (err) {}
    }
  });

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const identityOverlay = document.getElementById('identity-overlay');
  const mainContent     = document.getElementById('main-content');
  const creditDisplay   = document.getElementById('credit-display');

  // ── URL Query Parameters Parsing ───────────────────────────────────────────
  const urlParams     = new URLSearchParams(window.location.search);
  const qMentor       = urlParams.get('mentor');
  const qTopic        = urlParams.get('topic');
  const qCredits      = urlParams.get('credits');
  const qRole         = urlParams.get('role');

  if (qMentor) {
    const el = document.getElementById('mentor-name-input');
    if (el) el.value = decodeURIComponent(qMentor);
  }
  if (qTopic) {
    const el = document.getElementById('topic-input');
    if (el) el.value = decodeURIComponent(qTopic);
  }
  if (qCredits) {
    const el = document.getElementById('credits-input');
    if (el) el.value = qCredits;
  }
  if (qRole === 'mentor') {
    const mentorBtn = document.querySelector('.role-btn[data-role="mentor"]');
    mentorBtn?.click();
  }

  // Auto-detect logged-in user from Supabase auth session
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
      const inputName = document.getElementById('input-name');
      if (inputName && name && !inputName.value) inputName.value = name;
      if (session.user.user_metadata?.role === 'mentor' && !qRole) {
        const mentorBtn = document.querySelector('.role-btn[data-role="mentor"]');
        mentorBtn?.click();
      }
    }
  }).catch(() => {});

  // ── Identity overlay ───────────────────────────────────────────────────────
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-btn').forEach(b => {
        b.classList.remove('selected', 'border-[#B9F044]', 'bg-[#B9F044]/10', 'text-[#2F6F11]');
        b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
      });
      btn.classList.add('selected', 'border-[#B9F044]', 'bg-[#B9F044]/10', 'text-[#2F6F11]');
      btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
      myRole = btn.dataset.role;
    });
  });

  document.getElementById('identity-btn').addEventListener('click', async () => {
    myName = document.getElementById('input-name').value.trim();
    if (!myName) {
      document.getElementById('identity-error').classList.remove('hidden');
      return;
    }
    document.getElementById('identity-error').classList.add('hidden');
    await ensureCreditAccount();
    await refreshCreditDisplay();
    enterApp();
  });

  // ── Quick Topic & Credit Chips (Step 1) ────────────────────────────────────
  document.querySelectorAll('.quick-topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const topicInput = document.getElementById('topic-input');
      if (topicInput) topicInput.value = chip.textContent.trim();
    });
  });

  document.querySelectorAll('.credit-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.credit-preset-btn').forEach(b => {
        b.classList.remove('border-[#B9F044]', 'bg-[#B9F044]/20', 'text-[#2F6F11]', 'font-extrabold');
        b.classList.add('border-slate-200', 'bg-slate-50', 'text-slate-700', 'font-bold');
      });
      btn.classList.add('border-[#B9F044]', 'bg-[#B9F044]/20', 'text-[#2F6F11]', 'font-extrabold');
      btn.classList.remove('border-slate-200', 'bg-slate-50', 'text-slate-700');
      const creditsInput = document.getElementById('credits-input');
      if (creditsInput && btn.dataset.val) creditsInput.value = btn.dataset.val;
    });
  });

  // ── Credit account bootstrap ───────────────────────────────────────────────
  async function ensureCreditAccount() {
    try {
      const { error } = await sb.from('credits').upsert(
        { username: myName, balance: 100 },
        { onConflict: 'username', ignoreDuplicates: true }
      );
      if (error) console.warn('ensureCreditAccount:', error.message);
    } catch (e) {}
  }

  async function refreshCreditDisplay() {
    try {
      const raw = localStorage.getItem('gyansetu_active_profile');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.credits !== undefined) {
          creditDisplay.textContent = p.credits;
          return;
        }
      }
    } catch (e) {}

    try {
      const { data } = await sb.from('credits').select('balance').eq('username', myName).maybeSingle();
      creditDisplay.textContent = data ? data.balance : '100';
    } catch (e) {
      creditDisplay.textContent = '100';
    }
  }

  window.addEventListener('gyansetu:credits-updated', (e) => {
    if (creditDisplay && e.detail?.newBalance !== undefined) {
      creditDisplay.textContent = e.detail.newBalance;
    }
  });

  // ── Enter app ──────────────────────────────────────────────────────────────
  function enterApp() {
    identityOverlay.classList.add('hidden');
    mainContent.style.removeProperty('display');

    if (myRole === 'learner') {
      document.getElementById('learner-view').classList.remove('hidden');
      document.getElementById('mentor-view').classList.add('hidden');
      showStep('step-book');
    } else {
      document.getElementById('mentor-view').classList.remove('hidden');
      document.getElementById('learner-view').classList.add('hidden');
      startMentorPolling();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 15-MINUTE COUNTDOWN TIMER ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateTimerUI() {
    const timeStr = formatTime(remainingSeconds);
    const progressPct = Math.min(100, Math.max(0, ((totalDuration - remainingSeconds) / totalDuration) * 100));

    // Learner elements
    const lDigits = document.getElementById('learner-timer-digits');
    const lBar    = document.getElementById('learner-timer-bar');
    if (lDigits) {
      lDigits.textContent = timeStr;
      if (remainingSeconds <= 60 && remainingSeconds > 0) {
        lDigits.className = 'font-mono text-3xl sm:text-4xl font-black text-amber-400 tracking-widest drop-shadow animate-pulse';
      } else if (remainingSeconds === 0) {
        lDigits.className = 'font-mono text-3xl sm:text-4xl font-black text-[#B9F044] tracking-widest drop-shadow';
      }
    }
    if (lBar) lBar.style.width = `${progressPct}%`;

    // Mentor elements
    const mDigits = document.getElementById('mentor-timer-digits');
    const mBar    = document.getElementById('mentor-timer-bar');
    if (mDigits) {
      mDigits.textContent = timeStr;
      if (remainingSeconds <= 60 && remainingSeconds > 0) {
        mDigits.className = 'font-mono text-3xl sm:text-4xl font-black text-amber-400 tracking-widest drop-shadow animate-pulse';
      } else if (remainingSeconds === 0) {
        mDigits.className = 'font-mono text-3xl sm:text-4xl font-black text-[#B9F044] tracking-widest drop-shadow';
      }
    }
    if (mBar) mBar.style.width = `${progressPct}%`;
  }

  function startSessionTimer(duration = DEFAULT_DURATION, broadcastSync = true) {
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    totalDuration    = duration;
    remainingSeconds = duration;
    timerActive      = true;
    updateTimerUI();

    sessionTimerInterval = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds--;
        updateTimerUI();
      } else {
        clearInterval(sessionTimerInterval);
        timerActive = false;
        onTimerComplete();
      }
    }, 1000);

    if (broadcastSync) {
      emitSessionEvent('timer-sync', {
        remainingSeconds,
        totalDuration,
        status: 'running'
      });
    }
  }

  function onTimerComplete() {
    showToast('⏰ 15-Minute Live Session completed! Ready to verify & release escrow credits.');
    const lBadge = document.getElementById('learner-timer-badge');
    if (lBadge) {
      lBadge.innerHTML = '<i data-lucide="check-circle" class="h-3.5 w-3.5 text-[#B9F044]"></i> 15 Mins Sprint Completed';
      if (window.lucide) lucide.createIcons();
    }
  }

  function onTimerSyncRemote(payload) {
    if (payload.remainingSeconds !== undefined) {
      remainingSeconds = payload.remainingSeconds;
      if (payload.totalDuration) totalDuration = payload.totalDuration;
      updateTimerUI();
      if (!timerActive && remainingSeconds > 0) {
        startSessionTimer(remainingSeconds, false);
      }
    }
  }

  // Mentor controls: extend +5 mins
  const btnExtend = document.getElementById('btn-extend-timer');
  if (btnExtend) {
    btnExtend.addEventListener('click', () => {
      remainingSeconds += 300;
      totalDuration    += 300;
      updateTimerUI();
      emitSessionEvent('timer-sync', { remainingSeconds, totalDuration, status: 'extended' });
      showToast('⏱️ Session extended by +5 minutes!');
    });
  }

  // Mentor controls: conclude early
  const btnConcludeEarly = document.getElementById('btn-conclude-early');
  if (btnConcludeEarly) {
    btnConcludeEarly.addEventListener('click', () => {
      remainingSeconds = 0;
      updateTimerUI();
      emitSessionEvent('timer-sync', { remainingSeconds: 0, totalDuration, status: 'concluded' });
      showToast('Sprint marked concluded. Proceed to verification & credit release.');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // YOUTUBE VIDEO PARSER & RESOURCE HUB
  // ═══════════════════════════════════════════════════════════════════════════

  function parseYouTubeId(url) {
    if (!url) return null;
    const str = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = str.match(regExp);
    if (match && match[2].length === 11) return match[2];
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    return null;
  }

  // 1-Click YouTube Presets (Mentor View)
  document.querySelectorAll('.yt-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      const notes = btn.dataset.notes;
      const inputUrl = document.getElementById('mentor-youtube-input');
      const inputNotes = document.getElementById('mentor-notes-input');

      if (inputUrl && url) inputUrl.value = url;
      if (inputNotes && notes) inputNotes.value = notes;

      // Automatically render preview
      const ytId = parseYouTubeId(url);
      if (ytId) {
        const preview = document.getElementById('mentor-youtube-preview');
        const frame = document.getElementById('mentor-youtube-frame');
        if (frame && preview) {
          frame.src = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`;
          preview.classList.remove('hidden');
        }
      }
      showToast('Preset loaded! Click "Publish & Sync" to broadcast to learner.');
    });
  });

  // Publish / Sync Resources Button
  const btnPublishRes = document.getElementById('publish-resources-btn');
  if (btnPublishRes) {
    btnPublishRes.addEventListener('click', async () => {
      const urlInput   = document.getElementById('mentor-youtube-input');
      const notesInput = document.getElementById('mentor-notes-input');
      const resInput   = document.getElementById('mentor-resource-input');
      const errEl      = document.getElementById('mentor-yt-error');

      const rawUrl  = urlInput ? urlInput.value.trim() : '';
      const notes   = notesInput ? notesInput.value.trim() : '';
      const resLink = resInput ? resInput.value.trim() : '';

      const ytId = parseYouTubeId(rawUrl);
      if (!ytId) {
        if (errEl) errEl.classList.remove('hidden');
        showToast('Please provide a valid YouTube URL (e.g. youtube.com/watch?v=...)');
        return;
      }
      if (errEl) errEl.classList.add('hidden');

      const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`;

      // Update mentor preview
      const preview = document.getElementById('mentor-youtube-preview');
      const frame   = document.getElementById('mentor-youtube-frame');
      if (frame && preview) {
        frame.src = embedUrl;
        preview.classList.remove('hidden');
      }

      // Persist in DB if session is active
      if (activeSessionId) {
        await sb.from('sessions').update({
          note: notes || `YouTube Resource: ${embedUrl}`
        }).eq('id', activeSessionId);
      }

      // Broadcast to learner
      emitSessionEvent('session-resources-updated', {
        youtubeId: ytId,
        embedUrl,
        notes,
        resourceLink: resLink,
        topic: sessionData?.topic || '1-on-1 Mentorship'
      });

      showToast('🚀 Lecture video & study plan synced live with learner!');
    });
  }

  function onResourcesUpdatedRemote(payload) {
    if (!payload || !payload.embedUrl) return;

    // Learner View updates
    const vBox  = document.getElementById('learner-video-box');
    const vHold = document.getElementById('learner-video-placeholder');
    const vIfr  = document.getElementById('learner-youtube-frame');
    const nBox  = document.getElementById('learner-notes-box');
    const nText = document.getElementById('learner-notes-text');
    const lBox  = document.getElementById('learner-link-box');
    const lBtn  = document.getElementById('learner-resource-link-btn');

    if (vIfr) vIfr.src = payload.embedUrl;
    if (vBox) vBox.classList.remove('hidden');
    if (vHold) vHold.classList.add('hidden');

    if (payload.notes && nBox && nText) {
      nText.textContent = payload.notes;
      nBox.classList.remove('hidden');
    }

    if (payload.resourceLink && lBox && lBtn) {
      lBtn.href = payload.resourceLink;
      lBox.classList.remove('hidden');
    }

    showToast('📹 Mentor shared a YouTube lecture and study plan!');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1-CLICK VERIFICATION QUIZ AUTO-GENERATOR (MENTOR)
  // ═══════════════════════════════════════════════════════════════════════════

  const btnQuickQuiz = document.getElementById('btn-quick-quiz-preset');
  if (btnQuickQuiz) {
    btnQuickQuiz.addEventListener('click', () => {
      const topic = (sessionData?.topic || document.getElementById('topic-input')?.value || '').toLowerCase();
      let presetQuestions = [];

      if (topic.includes('tree') || topic.includes('dsa') || topic.includes('graph')) {
        presetQuestions = [
          {
            q: 'Which tree traversal yields elements in sorted order for a Binary Search Tree (BST)?',
            opts: ['Preorder (Root, Left, Right)', 'Inorder (Left, Root, Right)', 'Postorder (Left, Right, Root)', 'Level Order'],
            c: 1
          },
          {
            q: 'What is the worst-case lookup time complexity in a skewed Binary Search Tree?',
            opts: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
            c: 2
          }
        ];
      } else if (topic.includes('react') || topic.includes('hook') || topic.includes('state')) {
        presetQuestions = [
          {
            q: 'Why should you never mutate React state directly (e.g. state.count = 5)?',
            opts: ['It causes a syntax error', 'React will not detect changes or re-render', 'It crashes the browser', 'State is immutable at JavaScript engine level'],
            c: 1
          },
          {
            q: 'When does the useEffect hook run if an empty dependency array [] is passed?',
            opts: ['Before initial render only', 'Once after initial component mount', 'On every single re-render', 'Only when the parent component unmounts'],
            c: 1
          }
        ];
      } else if (topic.includes('system') || topic.includes('design') || topic.includes('scale')) {
        presetQuestions = [
          {
            q: 'What is the primary distinction between Horizontal and Vertical scaling?',
            opts: ['Horizontal adds more machines; Vertical upgrades CPU/RAM', 'Horizontal increases storage; Vertical increases network', 'There is no difference', 'Horizontal is only for databases'],
            c: 0
          },
          {
            q: 'What is the main benefit of putting a Reverse Proxy in front of application servers?',
            opts: ['Increases code execution speed', 'Load balancing, SSL termination, and caching', 'Deletes expired user cookies', 'Compiles JavaScript to C++'],
            c: 1
          }
        ];
      } else {
        // Universal default topic quiz
        presetQuestions = [
          {
            q: 'What was the foundational key takeaway covered in this 15-minute live sprint?',
            opts: ['Core conceptual principles & design structure', 'Skipping edge cases entirely', 'Ignoring performance and complexity', 'Avoiding code documentation'],
            c: 0
          },
          {
            q: 'How will you apply the solution demonstrated in today’s session?',
            opts: ['Memorize without understanding', 'Apply structured problem breakdown and write modular tests', 'Hardcode single test cases', 'Never revise the notes'],
            c: 1
          }
        ];
      }

      // Populate into quiz builder
      document.getElementById('quiz-builder').innerHTML = '';
      questionCount = 0;

      presetQuestions.forEach((item) => {
        addQuestion();
        const blocks = document.querySelectorAll('.quiz-question-block');
        const latest = blocks[blocks.length - 1];
        if (latest) {
          const qText = latest.querySelector('.q-text');
          if (qText) qText.value = item.q;
          const optInputs = latest.querySelectorAll('.opt-text');
          item.opts.forEach((optStr, idx) => {
            if (optInputs[idx]) optInputs[idx].value = optStr;
          });
          const radio = latest.querySelector(`input[name="correct-${latest.dataset.qidx}"][value="${item.c}"]`);
          if (radio) radio.checked = true;
        }
      });

      showToast('✨ Topic quiz generated with 2 verification questions!');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNER FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 1 → Request session
  document.getElementById('request-btn').addEventListener('click', async () => {
    const mentorName = document.getElementById('mentor-name-input').value.trim();
    const topic      = document.getElementById('topic-input').value.trim();
    const credits    = parseInt(document.getElementById('credits-input').value, 10);
    const note       = document.getElementById('note-input').value.trim();
    const errEl      = document.getElementById('request-error');

    if (!mentorName || !topic || !credits || credits < 1) {
      errEl.textContent = 'Please fill in mentor name, topic and credits.';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    // Check learner has enough credits
    const { data: creditRow } = await sb.from('credits').select('balance').eq('username', myName).maybeSingle();
    if (!creditRow || creditRow.balance < credits) {
      errEl.textContent = `Not enough credits. You have ${creditRow?.balance ?? 0}. Starter balance is 100 credits.`;
      errEl.classList.remove('hidden');
      return;
    }

    // Insert session row into DB
    const { data: sess, error } = await sb.from('sessions').insert({
      learner_name : myName,
      mentor_name  : mentorName,
      topic,
      credits_offered: credits,
      note,
      status: 'pending',
    }).select().single();

    if (error) {
      errEl.textContent = 'Could not create session. Try again.';
      errEl.classList.remove('hidden');
      console.error(error);
      return;
    }

    sessionId   = sess.id;
    sessionData = sess;
    document.getElementById('session-id-display').textContent = sessionId;
    showStep('step-waiting');

    // Setup real-time subscription
    subscribeToSession(sessionId);

    // Broadcast across browser tabs so mentor hears it instantly
    emitSessionEvent('session-requested', {
      session: sess,
      mentor_name: mentorName,
      learner_name: myName
    });
  });

  // Cancel request
  document.getElementById('cancel-request-btn').addEventListener('click', async () => {
    if (!sessionId) return;
    await sb.from('sessions').update({ status: 'cancelled' }).eq('id', sessionId);
    sessionId   = null;
    sessionData = null;
    if (channel) { sb.removeChannel(channel); channel = null; }
    showStep('step-book');
  });

  // Submit quiz answers (Learner)
  document.getElementById('submit-quiz-btn').addEventListener('click', async () => {
    if (!quizData) return;
    const questions = quizData.questions;
    let correct = 0;
    const total = questions.length;

    questions.forEach((q, i) => {
      const selected = document.querySelector(`input[name="q${i}"]:checked`);
      if (selected && parseInt(selected.value, 10) === q.correct) correct++;
    });

    const passed = (correct === total) || (total > 0 && correct >= Math.ceil(total * 0.5));
    const resultEl = document.getElementById('quiz-result-msg');

    if (passed) {
      resultEl.textContent = `✅ ${correct}/${total} correct — Quiz Passed!`;
      resultEl.className = 'mt-3 text-center text-sm font-bold rounded-xl py-2 bg-green-100 text-green-700';
      resultEl.classList.remove('hidden');
      document.getElementById('submit-quiz-btn').disabled = true;

      // Broadcast result to mentor
      emitSessionEvent('quiz-result', { passed: true, correct, total });

      const { error: awaitingError } = await sb.from('sessions').update({
        quiz_passed: true,
        status: 'awaiting_completion'
      }).eq('id', sessionId);

      if (awaitingError) {
        resultEl.textContent = 'Quiz passed, updating session status...';
      }

      document.getElementById('done-msg').textContent =
        `Your mentor is finalizing completion. Your ${sessionData.credits_offered} credits remain safely in escrow until confirmed.`;
      setTimeout(() => showStep('step-done'), 1200);

    } else {
      resultEl.textContent = `❌ ${correct}/${total} correct — Please review and retry.`;
      resultEl.className = 'mt-3 text-center text-sm font-bold rounded-xl py-2 bg-red-50 text-red-600';
      resultEl.classList.remove('hidden');
      emitSessionEvent('quiz-result', { passed: false, correct, total });
    }
  });

  // ── Remote Event Handlers (Learner side) ──────────────────────────────────
  function onSessionAcceptedRemote(payload) {
    sessionData = { ...sessionData, ...payload };
    const mName = document.getElementById('active-mentor-name');
    const aTopic = document.getElementById('active-topic');
    const escEl  = document.getElementById('learner-escrow-amount');
    const colBtn = document.getElementById('open-collab-btn');

    if (mName) mName.textContent = sessionData.mentor_name || payload.mentor_name;
    if (aTopic) aTopic.textContent = sessionData.topic || payload.topic;
    if (escEl) escEl.textContent = sessionData.credits_offered || payload.credits_offered || '15';
    if (colBtn) {
      colBtn.href = `room.html?room=session-${sessionData.id || sessionId}&user=${encodeURIComponent(myName)}&role=learner`;
    }

    showStep('step-active');
    startSessionTimer(DEFAULT_DURATION, false);
    showToast('🚀 Mentor accepted your request! 15-Minute session is LIVE.');
  }

  function onQuizSentRemote(payload) {
    quizData = payload;
    renderQuizForLearner(payload.questions);
    showStep('step-quiz');
    showToast('📝 Your mentor has sent the verification quiz!');
  }

  function onSessionCompleteRemote(payload) {
    sessionData = { ...sessionData, status: 'complete', credits_released: true };
    refreshCreditDisplay();
    document.getElementById('done-msg').textContent =
      `${sessionData.credits_offered || 15} credits transferred to ${sessionData.mentor_name || 'mentor'}. 15-min session concluded successfully!`;
    showStep('step-done');
    showToast('🎉 Session completed! Escrow credits released.');
  }

  function onStudentSatisfactionRemote(payload) {
    if (payload.satisfaction === 'yes') {
      showToast('Learner verified satisfaction! Escrow finalized.');
    }
  }

  // ── Subscribe to session channel (learner side) ───────────────────────────
  function subscribeToSession(sid) {
    channel = sb.channel(`session-${sid}`, { config: { broadcast: { self: false } } });

    channel.on('broadcast', { event: 'session-accepted' }, ({ payload }) => {
      onSessionAcceptedRemote(payload);
    });

    channel.on('broadcast', { event: 'session-resources-updated' }, ({ payload }) => {
      onResourcesUpdatedRemote(payload);
    });

    channel.on('broadcast', { event: 'timer-sync' }, ({ payload }) => {
      onTimerSyncRemote(payload);
    });

    channel.on('broadcast', { event: 'quiz-sent' }, ({ payload }) => {
      onQuizSentRemote(payload);
    });

    channel.on('broadcast', { event: 'session-complete' }, ({ payload }) => {
      onSessionCompleteRemote(payload);
    });

    channel.subscribe();
  }

  // Render quiz questions for learner
  function renderQuizForLearner(questions) {
    const container = document.getElementById('quiz-questions-container');
    if (!container) return;
    container.innerHTML = '';
    questions.forEach((q, i) => {
      const div = document.createElement('div');
      div.className = 'rounded-2xl border border-slate-200 p-3.5 sm:p-4 bg-slate-50';
      div.innerHTML = `
        <p class="text-xs sm:text-sm font-bold mb-2.5 sm:mb-3 text-[#0B1F17] leading-relaxed">${i + 1}. ${escHtml(q.question)}</p>
        <div class="space-y-2">
          ${q.options.map((opt, j) => `
            <label class="quiz-option flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl cursor-pointer hover:bg-white transition border border-transparent bg-white/70 shadow-xs">
              <input type="radio" name="q${i}" value="${j}"
                class="h-4 w-4 shrink-0 accent-[#2F6F11]" />
              <span class="text-xs sm:text-sm text-slate-700 font-medium leading-snug">${escHtml(opt)}</span>
            </label>
          `).join('')}
        </div>`;
      container.appendChild(div);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MENTOR FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  let mentorPollTimer = null;
  let activeSessionId = null;

  function startMentorPolling() {
    fetchPendingRequests();
    mentorPollTimer = setInterval(fetchPendingRequests, 3500);
  }

  async function fetchPendingRequests() {
    const { data, error } = await sb
      .from('sessions')
      .select('*')
      .or(`mentor_name.eq.${myName},mentor_name.ilike.%${myName}%`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) { console.warn('fetchPendingRequests:', error.message); return; }

    const list   = document.getElementById('requests-list');
    const noMsg  = document.getElementById('no-requests-msg');
    list.querySelectorAll('.request-card').forEach(c => c.remove());

    if (!data || data.length === 0) {
      noMsg.classList.remove('hidden');
      return;
    }
    noMsg.classList.add('hidden');

    data.forEach(sess => {
      const card = document.createElement('div');
      card.className = 'request-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <p class="text-sm font-extrabold text-[#0B1F17]">${escHtml(sess.learner_name)}</p>
              <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">15-Min Sprint</span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">📚 <strong>${escHtml(sess.topic)}</strong></p>
            ${sess.note ? `<p class="text-[11px] text-slate-400 mt-1 italic">"${escHtml(sess.note)}"</p>` : ''}
          </div>
          <span class="shrink-0 rounded-full bg-[#B9F044]/20 border border-[#B9F044]/40 px-2.5 py-1 text-[11px] font-extrabold text-[#2F6F11]">
            🔒 ${sess.credits_offered} in Escrow
          </span>
        </div>
        <div class="mt-3.5 flex gap-2">
          <button data-id="${sess.id}" class="accept-btn flex-1 rounded-xl bg-[#0B1F17] py-2.5 text-xs font-black text-[#B9F044] hover:bg-[#14532D] shadow-sm transition">
            Accept &amp; Launch 15-Min Session ✓
          </button>
          <button data-id="${sess.id}" class="decline-btn rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition">
            Decline
          </button>
        </div>`;
      list.appendChild(card);
    });

    list.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', () => acceptSession(btn.dataset.id));
    });
    list.querySelectorAll('.decline-btn').forEach(btn => {
      btn.addEventListener('click', () => declineSession(btn.dataset.id));
    });
  }

  async function acceptSession(sid) {
    if (mentorPollTimer) clearInterval(mentorPollTimer);
    const { data: sess, error } = await sb
      .from('sessions')
      .update({ status: 'active' })
      .eq('id', sid)
      .select()
      .single();

    if (error) { console.error(error); return; }

    activeSessionId = sid;
    sessionData     = sess;

    // Connect real-time channel
    const ch = sb.channel(`session-${sid}`, { config: { broadcast: { self: false } } });
    ch.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        channel = ch;
        setupMentorActivePanel(sess);

        // Notify learner across channels
        emitSessionEvent('session-accepted', {
          id: sid,
          mentor_name: myName,
          learner_name: sess.learner_name,
          topic: sess.topic,
          credits_offered: sess.credits_offered
        });

        // Start 15-minute countdown clock
        startSessionTimer(DEFAULT_DURATION, true);
      }
    });

    // Setup listener on mentor channel
    ch.on('broadcast', { event: 'quiz-result' }, ({ payload }) => {
      onQuizResultRemote(payload);
    });
  }

  async function declineSession(sid) {
    await sb.from('sessions').update({ status: 'declined' }).eq('id', sid);
    document.querySelectorAll(`.decline-btn[data-id="${sid}"]`)
      .forEach(btn => btn.closest('.request-card')?.remove());
  }

  function setupMentorActivePanel(sess) {
    document.getElementById('active-learner-name').textContent  = sess.learner_name;
    document.getElementById('mentor-active-topic').textContent  = sess.topic;
    document.getElementById('mentor-active-credits').textContent = sess.credits_offered;
    document.getElementById('mentor-open-collab').href =
      `room.html?room=session-${sess.id}&user=${encodeURIComponent(myName)}&role=mentor`;

    document.getElementById('mentor-active-panel').classList.remove('hidden');
    document.getElementById('mentor-requests-panel').classList.add('hidden');

    initQuizBuilder();
  }

  function onQuizResultRemote(payload) {
    if (payload.passed) {
      document.getElementById('quiz-sent-msg').classList.add('hidden');
      document.getElementById('mentor-completion-actions').classList.remove('hidden');
      document.getElementById('send-quiz-btn').disabled = true;
      if (window.lucide) lucide.createIcons();
      showToast(`🎯 Learner PASSED verification (${payload.correct}/${payload.total})! You can now mark session complete.`);
    } else {
      showToast(`Learner scored ${payload.correct}/${payload.total}. Quiz stays open for retake.`);
      document.getElementById('send-quiz-btn').disabled = false;
      document.getElementById('quiz-sent-msg').classList.add('hidden');
    }
  }

  // ── Quiz builder (Mentor) ─────────────────────────────────────────────────
  let questionCount = 0;
  const MAX_QUESTIONS = 3;

  function initQuizBuilder() {
    questionCount = 0;
    document.getElementById('quiz-builder').innerHTML = '';
    addQuestion();
  }

  document.getElementById('add-question-btn').addEventListener('click', () => {
    if (questionCount >= MAX_QUESTIONS) {
      showToast(`Max ${MAX_QUESTIONS} questions allowed for a 15-min sprint.`);
      return;
    }
    addQuestion();
  });

  function addQuestion() {
    questionCount++;
    const idx = questionCount;
    const div = document.createElement('div');
    div.className = 'quiz-question-block rounded-2xl border border-slate-200 p-3.5 sm:p-4 bg-slate-50 space-y-2.5';
    div.dataset.qidx = idx;
    div.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs font-black text-[#0B1F17]">Question ${idx}</p>
        ${idx > 1 ? `<button type="button" class="remove-q-btn text-[11px] text-red-500 hover:text-red-700 font-bold py-0.5">Remove</button>` : ''}
      </div>
      <input type="text" class="q-text input-field text-xs sm:text-sm" placeholder="e.g. What is the time complexity of searching in a balanced BST?" />
      <div class="space-y-1.5 options-list">
        ${[0,1,2,3].map(j => `
          <div class="flex items-center gap-2">
            <input type="radio" name="correct-${idx}" value="${j}" class="h-4 w-4 shrink-0 accent-[#2F6F11]"
              title="Mark as correct answer" ${j === 0 ? 'checked' : ''} />
            <input type="text" class="opt-text input-field flex-1 text-xs sm:text-sm" placeholder="Option ${j+1}" />
          </div>`).join('')}
      </div>
      <p class="text-[10px] text-slate-400">🔘 Select the radio button corresponding to the correct answer.</p>`;
    document.getElementById('quiz-builder').appendChild(div);

    div.querySelector('.remove-q-btn')?.addEventListener('click', () => {
      div.remove();
      questionCount = document.querySelectorAll('.quiz-question-block').length;
      document.querySelectorAll('.quiz-question-block').forEach((b, i) => {
        b.querySelector('p.text-xs').textContent = `Question ${i + 1}`;
        b.dataset.qidx = i + 1;
      });
    });
  }

  document.getElementById('send-quiz-btn').addEventListener('click', async () => {
    const questions = [];
    let valid = true;

    document.querySelectorAll('.quiz-question-block').forEach((block) => {
      const qText   = block.querySelector('.q-text').value.trim();
      const options = [...block.querySelectorAll('.opt-text')].map(o => o.value.trim());
      const correct = parseInt(block.querySelector(`input[name="correct-${block.dataset.qidx}"]:checked`)?.value ?? 0, 10);

      if (!qText || options.some(o => !o)) { valid = false; return; }
      questions.push({ question: qText, options, correct });
    });

    if (!valid || questions.length === 0) {
      showToast('Fill in all question texts and options first.');
      return;
    }

    // Broadcast quiz across channels
    emitSessionEvent('quiz-sent', { questions });

    // Save quiz in DB
    if (activeSessionId) {
      await sb.from('sessions').update({ quiz: questions }).eq('id', activeSessionId);
    }

    document.getElementById('send-quiz-btn').disabled = true;
    document.getElementById('quiz-sent-msg').classList.remove('hidden');
    showToast('Quiz sent to learner! Waiting for submission...');
  });

  // ── Session Completion & Escrow Credit Release ───────────────────────────
  document.getElementById('complete-session-btn').addEventListener('click', async () => {
    if (!activeSessionId || !sessionData) return;
    const button = document.getElementById('complete-session-btn');
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i> Releasing Escrow Credits...';

    // 1. Move credits in Escrow
    const { error: transferErr } = await transferCredits(
      sessionData.learner_name,
      sessionData.mentor_name,
      sessionData.credits_offered,
      activeSessionId
    );

    if (transferErr) {
      button.disabled = false;
      button.textContent = 'Mark Session Complete & Release Credits';
      showToast(`Credit transfer error: ${transferErr.message || 'Please retry.'}`);
      return;
    }

    // 2. Mark session complete in database
    await sb.from('sessions')
      .update({
        status: 'complete',
        completed_at: new Date().toISOString(),
        credits_released: true
      })
      .eq('id', activeSessionId);

    await refreshCreditDisplay();

    // 3. Update Mentor UI
    document.getElementById('mentor-done-msg').textContent =
      `🎉 Success! ${sessionData.credits_offered} credits successfully received from ${sessionData.learner_name}. Thank you for teaching!`;
    document.getElementById('mentor-active-panel').classList.add('hidden');
    document.getElementById('mentor-done-panel').classList.remove('hidden');

    // 4. Broadcast completion to learner
    emitSessionEvent('session-complete', {
      sessionId: activeSessionId,
      credits_released: true,
      credits_offered: sessionData.credits_offered
    });

    showToast('✅ Session finalized & credits transferred successfully!');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDIT TRANSFER (Strict Escrow: moves credits, logs transaction, syncs profile)
  // ═══════════════════════════════════════════════════════════════════════════
  async function transferCredits(from, to, amount, sid) {
    // Duplicate prevention guard
    const { data: existingLog } = await sb.from('credit_log')
      .select('id').eq('session_id', sid).eq('reason', 'session_complete').maybeSingle();
    if (existingLog) return { error: new Error('Credits already released for this session.') };

    // 1. Fetch learner balance
    const { data: fromRow, error: fromError } = await sb.from('credits')
      .select('balance').eq('username', from).single();

    if (fromError || !fromRow || fromRow.balance < amount) {
      return { error: fromError || new Error(`Learner ${from} has insufficient credits.`) };
    }

    // 2. Deduct from learner
    const { error: debitError } = await sb.from('credits')
      .update({ balance: fromRow.balance - amount })
      .eq('username', from)
      .gte('balance', amount);
    if (debitError) return { error: debitError };

    // 3. Add to mentor
    const { data: toRow } = await sb.from('credits')
      .select('balance').eq('username', to).maybeSingle();

    const mentorWrite = toRow
      ? sb.from('credits').update({ balance: toRow.balance + amount }).eq('username', to)
      : sb.from('credits').insert({ username: to, balance: amount });
    const { error: mentorError } = await mentorWrite;
    if (mentorError) return { error: mentorError };

    // 4. Log in credit_log
    const { error: transferLogError } = await sb.from('credit_log').insert({
      session_id: sid,
      from_user: from,
      to_user: to,
      amount,
      reason: 'session_complete'
    });

    // 5. Sync to profiles & credit_ledger for the unified dashboard ledger
    try {
      // Find learner profile
      const { data: learnerProf } = await sb.from('profiles')
        .select('id, credits, total_spent')
        .or(`full_name.eq.${from},email.ilike.${from}%`)
        .maybeSingle();

      if (learnerProf) {
        const learnerNewBal = Math.max(0, (learnerProf.credits || 0) - amount);
        await sb.from('credit_ledger').insert({
          user_id: learnerProf.id,
          amount: -amount,
          balance_after: learnerNewBal,
          type: 'SPEND',
          reason: `15-Min Live Session: ${sessionData?.topic || 'Mentorship'} with ${to}`,
          reference_type: 'SESSION',
          reference_id: sid,
          idempotency_key: `SESSION:SPEND:${sid}:${learnerProf.id}`,
          status: 'COMPLETED'
        });
        await sb.from('profiles').update({
          credits: learnerNewBal,
          total_spent: (learnerProf.total_spent || 0) + amount,
          updated_at: new Date().toISOString()
        }).eq('id', learnerProf.id);

        window.dispatchEvent(new CustomEvent('gyansetu:credits-updated', { detail: { newBalance: learnerNewBal } }));
      }

      // Find mentor profile
      const { data: mentorProf } = await sb.from('profiles')
        .select('id, credits, total_earned, xp')
        .or(`full_name.eq.${to},email.ilike.${to}%`)
        .maybeSingle();

      if (mentorProf) {
        const mentorNewBal = (mentorProf.credits || 0) + amount;
        await sb.from('credit_ledger').insert({
          user_id: mentorProf.id,
          amount: amount,
          balance_after: mentorNewBal,
          type: 'EARN',
          reason: `15-Min Mentorship Reward: ${sessionData?.topic || 'Mentorship'} (${from})`,
          reference_type: 'SESSION',
          reference_id: sid,
          idempotency_key: `SESSION:EARN:${sid}:${mentorProf.id}`,
          status: 'COMPLETED'
        });
        await sb.from('profiles').update({
          credits: mentorNewBal,
          total_earned: (mentorProf.total_earned || 0) + amount,
          xp: (mentorProf.xp || 0) + Math.round(amount * 2),
          updated_at: new Date().toISOString()
        }).eq('id', mentorProf.id);

        window.dispatchEvent(new CustomEvent('gyansetu:credits-updated', { detail: { newBalance: mentorNewBal } }));
      }
    } catch (e) {
      console.warn('Syncing credit_ledger from session.js:', e);
    }

    return { error: transferLogError || null };
  }

  // ── Student satisfaction verification ─────────────────────────────────────
  const btnSatYes = document.getElementById('btn-satisfaction-yes');
  const btnSatNo  = document.getElementById('btn-satisfaction-no');

  if (btnSatYes) {
    btnSatYes.addEventListener('click', async () => {
      btnSatYes.disabled = true;
      btnSatNo.disabled = true;
      document.getElementById('satisfaction-actions')?.classList.add('hidden');
      document.getElementById('satisfaction-yes-msg')?.classList.remove('hidden');

      if (sessionId) {
        await sb.from('sessions').update({
          satisfaction: 'yes',
          updated_at: new Date().toISOString()
        }).eq('id', sessionId);

        emitSessionEvent('student-satisfaction', { satisfaction: 'yes' });

        // Award +15 RR for successful verified live learning
        if (typeof window.recordRRTransaction === 'function') {
          const { data: authData } = await sb.auth.getSession();
          const uid = authData?.session?.user?.id || (sessionStorage.getItem('gyansetu_demo_mode') === 'true' ? 'demo-user-1' : null);
          if (uid) {
            await window.recordRRTransaction(sb, {
              userId: uid,
              amount: (typeof RR_CONFIG !== 'undefined') ? RR_CONFIG.REWARDS.SUCCESSFUL_LIVE_LEARNING : 15,
              reason: 'Successful 15-Min Live Learning Verified',
              referenceType: 'SESSION',
              referenceId: sessionId
            });
          }
        }
      }
      showToast('Thank you! Confirmation recorded (+15 RR awarded).');
    });
  }

  if (btnSatNo) {
    btnSatNo.addEventListener('click', async () => {
      btnSatYes.disabled = true;
      btnSatNo.disabled = true;
      document.getElementById('satisfaction-actions')?.classList.add('hidden');
      document.getElementById('satisfaction-no-options')?.classList.remove('hidden');

      if (sessionId) {
        await sb.from('sessions').update({
          satisfaction: 'no',
          dispute_status: 'pending_review',
          updated_at: new Date().toISOString()
        }).eq('id', sessionId);

        emitSessionEvent('student-satisfaction', { satisfaction: 'no', status: 'pending_review' });
      }
      showToast('Credits remain protected in escrow. Please pick an action below.');
    });
  }

  // Dispute choice handlers
  ['opt-continue-same', 'opt-request-another', 'opt-switch-mentor', 'opt-request-review'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', async () => {
        const statusEl = document.getElementById('dispute-status-text');
        if (statusEl) {
          statusEl.textContent = 'Choice recorded. GyanSetu escrow has protected your credits.';
          statusEl.classList.remove('hidden');
        }
        showToast('Preference recorded. Escrow credits will not be transferred.');
        if (id === 'opt-request-another') {
          setTimeout(() => { location.reload(); }, 1200);
        } else if (id === 'opt-switch-mentor') {
          setTimeout(() => { location.href = 'peers.html'; }, 1200);
        }
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  function showStep(stepId) {
    document.querySelectorAll('.session-step').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(stepId);
    if (target) {
      target.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0B1F17;color:#B9F044;font-size:12px;font-weight:700;padding:10px 20px;border-radius:999px;z-index:9999;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);pointer-events:none;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

}); // end DOMContentLoaded
