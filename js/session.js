/**
 * session.js — GyanSetu Session Booking & Credit System
 *
 * FLOW:
 * ─────
 * Learner                          Mentor
 *   │ request_session →              │
 *   │                   ← accept     │
 *   │   (session = active)           │
 *   │   [collab room link shown]     │
 *   │                   ← send_quiz  │
 *   │ submit answers →               │
 *   │   pass? → complete → credits move
 *   │   fail? → session stays open, retry
 *
 * DB TABLES (created via SETUP.md SQL):
 *   sessions   — one row per session
 *   credits    — one row per user (balance stored here)
 *   credit_log — append-only ledger of every transfer
 *
 * Realtime: Supabase Broadcast channel per session ID.
 */

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  // ── Supabase client ────────────────────────────────────────────────────────
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // ── Local state ────────────────────────────────────────────────────────────
  let myName    = '';
  let myRole    = 'learner';   // 'learner' | 'mentor'
  let sessionId = null;
  let sessionData = null;
  let channel   = null;
  let quizData  = null;        // quiz sent by mentor { questions: [...] }

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const identityOverlay = document.getElementById('identity-overlay');
  const mainContent     = document.getElementById('main-content');
  const creditDisplay   = document.getElementById('credit-display');

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

  // ── Credit account bootstrap ───────────────────────────────────────────────
  async function ensureCreditAccount() {
    // Upsert: if user doesn't exist, give them 50 starter credits
    const { error } = await sb.from('credits').upsert(
      { username: myName, balance: 50 },
      { onConflict: 'username', ignoreDuplicates: true }
    );
    if (error) console.warn('ensureCreditAccount:', error.message);
  }

  async function refreshCreditDisplay() {
    const { data } = await sb.from('credits').select('balance').eq('username', myName).maybeSingle();
    creditDisplay.textContent = data ? data.balance : '?';
  }

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
      errEl.textContent = `Not enough credits. You have ${creditRow?.balance ?? 0}.`;
      errEl.classList.remove('hidden');
      return;
    }

    // Insert session row
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
    subscribeToSession(sessionId);
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

  // Submit quiz answers
  document.getElementById('submit-quiz-btn').addEventListener('click', async () => {
    if (!quizData) return;
    const questions = quizData.questions;
    let correct = 0;
    const total = questions.length;

    questions.forEach((q, i) => {
      const selected = document.querySelector(`input[name="q${i}"]:checked`);
      if (selected && parseInt(selected.value, 10) === q.correct) correct++;
    });

    const passed = correct === total;   // must get ALL correct to pass
    const resultEl = document.getElementById('quiz-result-msg');

    if (passed) {
      resultEl.textContent = `✅ ${correct}/${total} correct — Quiz Passed!`;
      resultEl.className = 'mt-3 text-center text-sm font-bold rounded-xl py-2 bg-green-100 text-green-700';
      resultEl.classList.remove('hidden');
      document.getElementById('submit-quiz-btn').disabled = true;

      // Broadcast result to mentor
      channel.send({ type: 'broadcast', event: 'quiz-result', payload: { passed: true, correct, total } });

      // Deduct credits from learner and credit mentor — done via DB RPC
      await transferCredits(sessionData.learner_name, sessionData.mentor_name, sessionData.credits_offered, sessionId);
      await sb.from('sessions').update({ status: 'complete', quiz_passed: true }).eq('id', sessionId);
      await refreshCreditDisplay();

      const deducted = sessionData.credits_offered;
      document.getElementById('done-msg').textContent =
        `${deducted} credits transferred to ${sessionData.mentor_name}. Great work!`;
      setTimeout(() => showStep('step-done'), 1200);

    } else {
      resultEl.textContent = `❌ ${correct}/${total} correct — Try reviewing the topic and retake.`;
      resultEl.className = 'mt-3 text-center text-sm font-bold rounded-xl py-2 bg-red-50 text-red-600';
      resultEl.classList.remove('hidden');
      // No credits deducted on failure
      channel.send({ type: 'broadcast', event: 'quiz-result', payload: { passed: false, correct, total } });
    }
  });

  // ── Subscribe to session channel (learner side) ───────────────────────────
  function subscribeToSession(sid) {
    channel = sb.channel(`session-${sid}`, { config: { broadcast: { self: false } } });

    channel.on('broadcast', { event: 'session-accepted' }, ({ payload }) => {
      sessionData = { ...sessionData, ...payload };
      document.getElementById('active-mentor-name').textContent = sessionData.mentor_name;
      document.getElementById('active-topic').textContent       = sessionData.topic;
      document.getElementById('open-collab-btn').href =
        `room.html?room=session-${sid}`;
      showStep('step-active');
    });

    channel.on('broadcast', { event: 'quiz-sent' }, ({ payload }) => {
      quizData = payload;
      renderQuizForLearner(payload.questions);
      showStep('step-quiz');
    });

    channel.subscribe();
  }

  // Render quiz questions
  function renderQuizForLearner(questions) {
    const container = document.getElementById('quiz-questions-container');
    container.innerHTML = '';
    questions.forEach((q, i) => {
      const div = document.createElement('div');
      div.className = 'rounded-xl border border-slate-200 p-4 bg-slate-50';
      div.innerHTML = `
        <p class="text-sm font-bold mb-3">${i + 1}. ${escHtml(q.question)}</p>
        <div class="space-y-2">
          ${q.options.map((opt, j) => `
            <label class="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name="q${i}" value="${j}"
                class="h-4 w-4 accent-[#B9F044]" />
              <span class="text-xs">${escHtml(opt)}</span>
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
    mentorPollTimer = setInterval(fetchPendingRequests, 4000);
  }

  async function fetchPendingRequests() {
    const { data, error } = await sb
      .from('sessions')
      .select('*')
      .eq('mentor_name', myName)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) { console.warn('fetchPendingRequests:', error.message); return; }

    const list   = document.getElementById('requests-list');
    const noMsg  = document.getElementById('no-requests-msg');
    // Remove old cards (keep noMsg)
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
            <p class="text-sm font-extrabold">${escHtml(sess.learner_name)}</p>
            <p class="text-xs text-slate-500 mt-0.5">📚 ${escHtml(sess.topic)}</p>
            ${sess.note ? `<p class="text-[11px] text-slate-400 mt-1 italic">"${escHtml(sess.note)}"</p>` : ''}
          </div>
          <span class="shrink-0 rounded-full bg-[#B9F044]/20 px-2.5 py-1 text-[11px] font-extrabold text-[#2F6F11]">
            🪙 ${sess.credits_offered} credits
          </span>
        </div>
        <div class="mt-3 flex gap-2">
          <button data-id="${sess.id}" class="accept-btn flex-1 rounded-xl bg-[#0B1F17] py-2 text-xs font-extrabold text-[#B9F044] hover:bg-[#14532D] transition">
            Accept ✓
          </button>
          <button data-id="${sess.id}" class="decline-btn flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition">
            Decline ✗
          </button>
        </div>`;
      list.appendChild(card);
    });

    // Wire accept/decline buttons
    list.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', () => acceptSession(btn.dataset.id));
    });
    list.querySelectorAll('.decline-btn').forEach(btn => {
      btn.addEventListener('click', () => declineSession(btn.dataset.id));
    });
  }

  async function acceptSession(sid) {
    clearInterval(mentorPollTimer);
    const { data: sess, error } = await sb
      .from('sessions')
      .update({ status: 'active' })
      .eq('id', sid)
      .select()
      .single();
    if (error) { console.error(error); return; }

    activeSessionId = sid;
    sessionData     = sess;

    // Notify learner
    const ch = sb.channel(`session-${sid}`, { config: { broadcast: { self: false } } });
    ch.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await ch.send({
          type: 'broadcast', event: 'session-accepted',
          payload: { mentor_name: myName, topic: sess.topic }
        });
        channel = ch;
        setupMentorActivePanel(sess);
      }
    });
  }

  async function declineSession(sid) {
    await sb.from('sessions').update({ status: 'declined' }).eq('id', sid);
    // Remove card from UI
    document.querySelectorAll(`.decline-btn[data-id="${sid}"]`)
      .forEach(btn => btn.closest('.request-card')?.remove());
  }

  function setupMentorActivePanel(sess) {
    document.getElementById('active-learner-name').textContent  = sess.learner_name;
    document.getElementById('mentor-active-topic').textContent  = sess.topic;
    document.getElementById('mentor-active-credits').textContent = sess.credits_offered;
    document.getElementById('mentor-open-collab').href = `room.html?room=session-${sess.id}`;

    document.getElementById('mentor-active-panel').classList.remove('hidden');
    document.getElementById('mentor-requests-panel').classList.add('hidden');

    // Init quiz builder with one blank question
    initQuizBuilder();
  }

  // ── Quiz builder ──────────────────────────────────────────────────────────
  let questionCount = 0;
  const MAX_QUESTIONS = 3;

  function initQuizBuilder() {
    questionCount = 0;
    document.getElementById('quiz-builder').innerHTML = '';
    addQuestion();
  }

  document.getElementById('add-question-btn').addEventListener('click', () => {
    if (questionCount >= MAX_QUESTIONS) {
      showToast(`Max ${MAX_QUESTIONS} questions allowed`);
      return;
    }
    addQuestion();
  });

  function addQuestion() {
    questionCount++;
    const idx = questionCount;
    const div = document.createElement('div');
    div.className = 'quiz-question-block rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-2';
    div.dataset.qidx = idx;
    div.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs font-extrabold">Question ${idx}</p>
        ${idx > 1 ? `<button class="remove-q-btn text-[11px] text-red-400 hover:text-red-600">Remove</button>` : ''}
      </div>
      <input type="text" class="q-text input-field" placeholder="e.g. What is time complexity of binary search?" />
      <div class="space-y-1.5 options-list">
        ${[0,1,2,3].map(j => `
          <div class="flex items-center gap-2">
            <input type="radio" name="correct-${idx}" value="${j}" class="h-3.5 w-3.5 accent-[#B9F044]"
              title="Mark as correct answer" ${j === 0 ? 'checked' : ''} />
            <input type="text" class="opt-text input-field flex-1" placeholder="Option ${j+1}" />
          </div>`).join('')}
      </div>
      <p class="text-[10px] text-slate-400">🔘 Select the radio button next to the correct answer</p>`;
    document.getElementById('quiz-builder').appendChild(div);

    div.querySelector('.remove-q-btn')?.addEventListener('click', () => {
      div.remove();
      questionCount--;
      // Renumber remaining
      document.querySelectorAll('.quiz-question-block').forEach((b, i) => {
        b.querySelector('p.text-xs').textContent = `Question ${i + 1}`;
        b.dataset.qidx = i + 1;
      });
      questionCount = document.querySelectorAll('.quiz-question-block').length;
    });
  }

  document.getElementById('send-quiz-btn').addEventListener('click', async () => {
    const questions = [];
    let valid = true;

    document.querySelectorAll('.quiz-question-block').forEach((block, i) => {
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

    // Broadcast quiz to learner
    await channel.send({
      type: 'broadcast', event: 'quiz-sent',
      payload: { questions }
    });

    // Save quiz in DB
    await sb.from('sessions').update({ quiz: questions }).eq('id', activeSessionId);

    document.getElementById('send-quiz-btn').disabled = true;
    document.getElementById('quiz-sent-msg').classList.remove('hidden');

    // Listen for quiz result
    channel.on('broadcast', { event: 'quiz-result' }, async ({ payload }) => {
      if (payload.passed) {
        await refreshCreditDisplay();
        document.getElementById('mentor-done-msg').textContent =
          `${sessionData.credits_offered} credits earned from ${sessionData.learner_name}. Well done!`;
        document.getElementById('mentor-active-panel').classList.add('hidden');
        document.getElementById('mentor-done-panel').classList.remove('hidden');
      } else {
        showToast(`Learner failed (${payload.correct}/${payload.total}). Quiz stays open for retry.`);
        document.getElementById('send-quiz-btn').disabled = false;
        document.getElementById('quiz-sent-msg').classList.add('hidden');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDIT TRANSFER  (client-side with optimistic DB writes)
  // ═══════════════════════════════════════════════════════════════════════════
  async function transferCredits(from, to, amount, sid) {
    // 1. Deduct from learner
    const { data: fromRow } = await sb.from('credits').select('balance').eq('username', from).single();
    await sb.from('credits').update({ balance: fromRow.balance - amount }).eq('username', from);

    // 2. Credit mentor
    const { data: toRow } = await sb.from('credits').select('balance').eq('username', to).maybeSingle();
    if (toRow) {
      await sb.from('credits').update({ balance: toRow.balance + amount }).eq('username', to);
    } else {
      await sb.from('credits').insert({ username: to, balance: 50 + amount });
    }

    // 3. Log the transfer
    await sb.from('credit_log').insert({
      session_id  : sid,
      from_user   : from,
      to_user     : to,
      amount,
      reason      : 'session_complete',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  function showStep(stepId) {
    document.querySelectorAll('.session-step').forEach(s => s.classList.add('hidden'));
    document.getElementById(stepId)?.classList.remove('hidden');
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0B1F17;color:#B9F044;font-size:12px;font-weight:700;padding:8px 18px;border-radius:999px;z-index:9999;pointer-events:none;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

}); // end DOMContentLoaded
