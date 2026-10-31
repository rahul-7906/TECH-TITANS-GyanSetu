// ── Smart Matching & Study Partner Pairing Engine — peers.js ───────────────────────────
// Real-time search, multi-criteria filtering by topic, language, and availability.
// Includes 1-Click Smart Matching & Study Partner Pairing with persistent state.

(function () {
  'use strict';

  const STORAGE_KEY_PAIR = 'gyansetu_active_study_pair';

  // ── Core Campus Topics & Languages ─────────────────────────────
  const CORE_TOPICS = [
    'Data Structures & Algorithms',
    'Dynamic Programming & Graphs',
    'Python & AI Engineering',
    'Web Engineering & React',
    'Fullstack Node.js Systems',
    'C / C++ Systems Programming',
    'Java Enterprise & Spring',
    'Machine Learning & PyTorch',
    'Database Systems & SQL',
    'Operating Systems & Linux',
    'Computer Networks & Security',
    'Cybersecurity & Cryptography',
    'Campus Aptitude & Logic',
    'Cloud Computing & AWS'
  ];

  const CORE_LANGUAGES = [
    'English',
    'Hindi',
    'Hinglish (Bilingual)',
    'Python',
    'C++',
    'JavaScript',
    'TypeScript',
    'Java',
    'C',
    'SQL',
    'Go',
    'Rust'
  ];

  // ── Quick-filter topic chips ────────────────────────────────────
  const POPULAR_TOPIC_CHIPS = [
    { label: '💻 DSA', value: 'Data Structures & Algorithms' },
    { label: '🐍 Python', value: 'Python & AI Engineering' },
    { label: '🌐 React / Web', value: 'Web Engineering & React' },
    { label: '⚡ C++', value: 'C / C++ Systems Programming' },
    { label: '☕ Java', value: 'Java Enterprise & Spring' },
    { label: '🤖 AI / ML', value: 'Machine Learning & PyTorch' },
    { label: '🗄️ SQL & DBMS', value: 'Database Systems & SQL' },
    { label: '🛡️ Security', value: 'Cybersecurity & Cryptography' },
    { label: '📐 Aptitude', value: 'Campus Aptitude & Logic' }
  ];

  // ── Baseline Campus Peer Directory ──────────────────────────────
  const DEFAULT_CAMPUS_PEERS = [
    {
      id: 'peer-aarav-sharma',
      name: 'Aarav Sharma',
      avatar: 'AS',
      department: 'Computer Science',
      year: '3rd Year',
      rating: 4.9,
      sessions: 142,
      topics: ['Data Structures & Algorithms', 'Dynamic Programming & Graphs', 'C / C++ Systems Programming'],
      languages: ['C++', 'Python', 'English'],
      availability: 'online',
      bio: 'Competitive programmer (Codeforces Candidate Master). Passionate about teaching graph algorithms & problem solving.'
    },
    {
      id: 'peer-priya-mehta',
      name: 'Priya Mehta',
      avatar: 'PM',
      department: 'Information Technology',
      year: '2nd Year',
      rating: 4.8,
      sessions: 97,
      topics: ['Web Engineering & React', 'Fullstack Node.js Systems', 'Database Systems & SQL'],
      languages: ['JavaScript', 'TypeScript', 'English', 'Hinglish (Bilingual)'],
      availability: 'online',
      bio: 'Frontend architect and open-source enthusiast. Happy to help debug tricky React or state sync bugs.'
    },
    {
      id: 'peer-rohan-gupta',
      name: 'Rohan Gupta',
      avatar: 'RG',
      department: 'AI & Machine Learning',
      year: '4th Year',
      rating: 4.9,
      sessions: 210,
      topics: ['Machine Learning & PyTorch', 'Python & AI Engineering', 'Database Systems & SQL'],
      languages: ['Python', 'SQL', 'English'],
      availability: 'online',
      bio: 'Published ML researcher. Specializes in deep neural networks and fast model inference optimization.'
    },
    {
      id: 'peer-ananya-roy',
      name: 'Ananya Roy',
      avatar: 'AR',
      department: 'Computer Science',
      year: '3rd Year',
      rating: 4.8,
      sessions: 115,
      topics: ['Java Enterprise & Spring', 'Database Systems & SQL', 'Computer Networks & Security'],
      languages: ['Java', 'SQL', 'Hinglish (Bilingual)', 'Hindi'],
      availability: 'online',
      bio: 'Backend specialist. Experienced with high-throughput Spring Boot microservices and SQL query tuning.'
    },
    {
      id: 'peer-vikram-chauhan',
      name: 'Vikram Chauhan',
      avatar: 'VC',
      department: 'Electronics & Communication',
      year: '2nd Year',
      rating: 4.7,
      sessions: 76,
      topics: ['C / C++ Systems Programming', 'Operating Systems & Linux', 'Data Structures & Algorithms'],
      languages: ['C', 'C++', 'Hindi', 'English'],
      availability: 'online',
      bio: 'Embedded software & Linux enthusiast. Loves solving pointer puzzles and systems performance challenges.'
    },
    {
      id: 'peer-sneha-patel',
      name: 'Sneha Patel',
      avatar: 'SP',
      department: 'Information Technology',
      year: '3rd Year',
      rating: 4.9,
      sessions: 128,
      topics: ['Cloud Computing & AWS', 'Fullstack Node.js Systems', 'Cybersecurity & Cryptography'],
      languages: ['Go', 'JavaScript', 'English'],
      availability: 'busy',
      bio: 'AWS Certified Cloud Practitioner. Mentors students on Docker containers, serverless APIs, and secure deployment.'
    },
    {
      id: 'peer-kartik-verma',
      name: 'Kartik Verma',
      avatar: 'KV',
      department: 'Computer Science',
      year: '4th Year',
      rating: 4.8,
      sessions: 164,
      topics: ['Cybersecurity & Cryptography', 'Computer Networks & Security', 'Python & AI Engineering'],
      languages: ['Python', 'C', 'English', 'Hinglish (Bilingual)'],
      availability: 'online',
      bio: 'CTF player and penetration testing hobbyist. Teaches network socket programming and applied cryptography.'
    },
    {
      id: 'peer-diya-kapoor',
      name: 'Diya Kapoor',
      avatar: 'DK',
      department: 'AI & Data Science',
      year: '2nd Year',
      rating: 4.7,
      sessions: 82,
      topics: ['Python & AI Engineering', 'Database Systems & SQL', 'Machine Learning & PyTorch'],
      languages: ['Python', 'SQL', 'Hindi', 'English'],
      availability: 'online',
      bio: 'Data science sprinter. Excited about pandas data wrangling, exploratory data analysis, and predictive models.'
    },
    {
      id: 'peer-sameer-joshi',
      name: 'Sameer Joshi',
      avatar: 'SJ',
      department: 'Computer Science',
      year: '3rd Year',
      rating: 4.9,
      sessions: 190,
      topics: ['Campus Aptitude & Logic', 'Data Structures & Algorithms', 'Dynamic Programming & Graphs'],
      languages: ['C++', 'Python', 'Hinglish (Bilingual)'],
      availability: 'online',
      bio: 'Placement prep coordinator. Helped 50+ campus peers ace technical interview rounds and aptitude assessments.'
    }
  ];

  let PEERS = [...DEFAULT_CAMPUS_PEERS];

  // ── DOM References ──────────────────────────────────────────────
  const searchInput    = document.getElementById('peer-search');
  const topicFilter    = document.getElementById('filter-topic');
  const langFilter     = document.getElementById('filter-language');
  const availFilter    = document.getElementById('filter-availability');
  const grid           = document.getElementById('peers-grid');
  const emptyState     = document.getElementById('peers-empty');
  const resultsCount   = document.getElementById('results-count');
  const topicChips     = document.getElementById('topic-chips');
  const activePairCard = document.getElementById('active-study-pair-card');

  // ── Populate Filter Dropdowns ────────────────────────────────────
  function populateDropdowns() {
    // Collect all unique topics
    const peerTopics = PEERS.flatMap(p => p.topics || []);
    const allTopics = [...new Set([...CORE_TOPICS, ...peerTopics])].sort();

    // Preserve current selection
    const currTopic = topicFilter.value;
    topicFilter.innerHTML = '<option value="">All Topics (Any Subject)</option>';
    allTopics.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      if (t === currTopic) opt.selected = true;
      topicFilter.appendChild(opt);
    });

    // Collect all unique languages
    const peerLangs = PEERS.flatMap(p => p.languages || []);
    const allLangs = [...new Set([...CORE_LANGUAGES, ...peerLangs])].sort();

    const currLang = langFilter.value;
    langFilter.innerHTML = '<option value="">All Languages (Any Stack)</option>';
    allLangs.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l;
      if (l === currLang) opt.selected = true;
      langFilter.appendChild(opt);
    });
  }

  // ── Render Quick Topic Chips ─────────────────────────────────────
  function renderTopicChips() {
    if (!topicChips) return;
    topicChips.innerHTML = '';
    POPULAR_TOPIC_CHIPS.forEach(item => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip';
      chip.textContent = item.label;
      chip.dataset.topicValue = item.value;

      chip.addEventListener('click', () => {
        const isActive = chip.classList.contains('active');
        topicChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));

        if (isActive) {
          topicFilter.value = '';
        } else {
          chip.classList.add('active');
          topicFilter.value = item.value;
        }
        applyFilters();
      });

      topicChips.appendChild(chip);
    });
  }

  function syncTopicChips() {
    if (!topicChips) return;
    const val = topicFilter.value;
    topicChips.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.topicValue === val);
    });
  }

  // ── Availability and Avatar Helpers ──────────────────────────────
  function availLabel(status) {
    if (status === 'online') return 'Online Now';
    if (status === 'busy')   return 'In Session';
    return 'Offline';
  }

  function avatarGradient(id) {
    const gradients = [
      'from-[#064E3B] to-[#2F6F11]',
      'from-[#7C3AED] to-[#4F46E5]',
      'from-[#0891B2] to-[#0E7490]',
      'from-[#D97706] to-[#B45309]',
      'from-[#E11D48] to-[#BE123C]',
      'from-[#2563EB] to-[#1D4ED8]'
    ];
    let num = 0;
    const str = String(id || 'peer');
    for (let i = 0; i < str.length; i++) num += str.charCodeAt(i);
    return gradients[num % gradients.length];
  }

  // ── Active Study Partner Management ──────────────────────────────
  function getActiveStudyPair() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PAIR);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function setActiveStudyPair(peer, topic, lang) {
    const pairData = {
      peerId: peer.id,
      name: peer.name,
      department: peer.department,
      year: peer.year,
      avatar: peer.avatar,
      topic: topic || peer.topics?.[0] || 'Core Computer Science',
      language: lang || peer.languages?.[0] || 'English',
      pairedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY_PAIR, JSON.stringify(pairData));
    } catch (e) {}

    renderActiveStudyPairCard();
    renderPeers(getCurrentFilteredPeers());

    if (window.GyanSetuNetwork) {
      window.GyanSetuNetwork.showToast(`🤝 Successfully paired with ${peer.name}!`);
    }
  }

  function unpairStudyPartner() {
    try {
      localStorage.removeItem(STORAGE_KEY_PAIR);
    } catch (e) {}
    renderActiveStudyPairCard();
    renderPeers(getCurrentFilteredPeers());
    if (window.GyanSetuNetwork) {
      window.GyanSetuNetwork.showToast('Unpaired study partner. You can smart-pair anytime!');
    }
  }

  function renderActiveStudyPairCard() {
    if (!activePairCard) return;
    const pair = getActiveStudyPair();

    if (pair) {
      activePairCard.innerHTML = `
        <div class="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/90 via-[#0B2A1E] to-[#06130E] p-4 sm:p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-start gap-3.5">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B9F044] text-base font-black text-[#0B1F17] shadow-sm">
              ${pair.avatar || '⭐'}
            </div>
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <span class="rounded-full bg-[#B9F044] px-2 py-0.5 text-[9px] font-black uppercase text-[#0B1F17]">Active Study Pair</span>
                <span class="text-xs text-emerald-300 font-bold">&bull; Real-time partner assigned</span>
              </div>
              <h4 class="text-base font-extrabold text-white flex items-center gap-1.5">
                ${pair.name} <span class="text-xs font-normal text-slate-300">(${pair.department})</span>
              </h4>
              <p class="text-[11px] text-slate-300 mt-0.5">
                Focus: <strong class="text-[#B9F044]">${pair.topic}</strong> &bull; Language: <strong class="text-white">${pair.language}</strong>
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <a href="room.html?peer=${encodeURIComponent(pair.name)}" target="_blank" class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#B9F044] to-[#8FD420] px-3.5 py-2 text-xs font-black text-[#0B1F17] hover:brightness-110 transition shadow-sm">
              <i data-lucide="video" class="h-3.5 w-3.5"></i> Live Collab
            </a>
            <a href="arena.html?peer=${encodeURIComponent(pair.name)}" class="inline-flex items-center gap-1.5 rounded-xl border border-[#B9F044]/50 bg-[#B9F044]/15 px-3.5 py-2 text-xs font-bold text-[#B9F044] hover:bg-[#B9F044]/25 transition">
              <i data-lucide="flag" class="h-3.5 w-3.5"></i> Arena Race
            </a>
            <button onclick="window.unpairStudyPartner()" class="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-2.5 py-2 text-xs font-bold text-slate-300 hover:text-white transition" title="Unpair study partner">
              <i data-lucide="user-minus" class="h-3.5 w-3.5"></i>
            </button>
          </div>
        </div>
      `;
    } else {
      activePairCard.innerHTML = `
        <div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4FBEA] text-lg text-[#2F6F11]">
              🤝
            </span>
            <div>
              <p class="text-xs font-black text-[#0B1F17]">You are not paired with a study partner for this sprint yet</p>
              <p class="text-[11px] text-slate-500 mt-0.5">Pick your target subject and language, or click Auto-Pair to connect with an active peer in 3 seconds!</p>
            </div>
          </div>
          <button onclick="openSmartMatchModal()" class="shrink-0 rounded-xl bg-[#0B1F17] px-4 py-2 text-xs font-extrabold text-[#B9F044] hover:bg-[#064E3B] transition">
            ⚡ Auto-Pair Now
          </button>
        </div>
      `;
    }

    if (window.lucide) lucide.createIcons();
  }

  // ── Render Peer Cards ────────────────────────────────────────────
  function renderPeers(peers) {
    if (!grid) return;
    grid.innerHTML = '';

    const activePair = getActiveStudyPair();

    if (peers.length === 0) {
      grid.classList.add('hidden');
      if (emptyState) emptyState.classList.remove('hidden');
      if (resultsCount) resultsCount.innerHTML = '<strong>0</strong> peers found';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    grid.classList.remove('hidden');
    if (resultsCount) {
      resultsCount.innerHTML = `<strong>${peers.length}</strong> peer${peers.length !== 1 ? 's' : ''} found`;
    }

    peers.forEach((peer, i) => {
      const isCurrentlyPaired = activePair && activePair.peerId === peer.id;
      const isConnected = window.GyanSetuNetwork?.isConnected(peer.id || peer.name);

      const card = document.createElement('div');
      card.className = `peer-card peer-card-enter shadow-card ${isCurrentlyPaired ? 'ring-2 ring-[#B9F044] bg-emerald-50/20' : ''}`;
      card.style.animationDelay = `${i * 0.03}s`;

      card.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="relative shrink-0">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient(peer.id)} text-sm font-extrabold text-white shadow-xs">
              ${peer.avatar || '👤'}
            </div>
            <span class="avail-dot avail-${peer.availability} absolute -bottom-0.5 -right-0.5 border-2 border-white"></span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="text-sm font-extrabold text-[#0B1F17] truncate">${peer.name}</p>
              ${peer.sessions >= 50 ? '<i data-lucide="badge-check" class="h-4 w-4 text-[#2F6F11] shrink-0" title="Verified Campus Mentor"></i>' : ''}
              ${isCurrentlyPaired ? '<span class="rounded bg-[#B9F044] text-[#0B1F17] px-1.5 py-0.2 text-[8px] font-black uppercase">PAIRED</span>' : ''}
            </div>
            <p class="text-[11px] text-slate-500">${peer.department} &bull; ${peer.year}</p>
          </div>
          <span class="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold
            ${peer.availability === 'online' ? 'bg-green-50 text-green-700' : peer.availability === 'busy' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}">
            <span class="avail-dot avail-${peer.availability}"></span>
            ${availLabel(peer.availability)}
          </span>
        </div>

        <p class="mt-2.5 text-[12px] leading-relaxed text-slate-600 line-clamp-2">${peer.bio || 'Available for collaborative peer study and coding practice.'}</p>

        <!-- Topic Tags -->
        <div class="mt-3 flex flex-wrap gap-1.5">
          ${(peer.topics || []).slice(0, 3).map(t => `<span class="skill-tag">${t}</span>`).join('')}
          ${(peer.languages || []).slice(0, 2).map(l => `<span class="skill-tag border border-emerald-200 bg-emerald-50/50 text-[#2F6F11] font-bold">${l}</span>`).join('')}
        </div>

        <!-- Action Bar -->
        <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <div class="flex items-center gap-1 text-[11px] text-slate-500">
            <span class="text-amber-500 font-bold">★ ${peer.rating || 4.8}</span>
            <span class="text-slate-300">&bull;</span>
            <span class="text-slate-400">${peer.sessions || 10}+ sessions</span>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- 1-Click Pair Button -->
            <button onclick="window.pairDirectlyWithPeer('${peer.id}')" class="inline-flex items-center gap-1 rounded-lg ${isCurrentlyPaired ? 'bg-[#B9F044] text-[#0B1F17] font-black' : 'bg-[#0B1F17] text-[#B9F044] font-bold hover:bg-[#064E3B]'} px-2.5 py-1.5 text-[11px] transition">
              <span>${isCurrentlyPaired ? '✓ Paired' : '🤝 Pair'}</span>
            </button>

            <!-- Race in Speed Arena -->
            <button onclick="window.GyanSetuNetwork?.inviteToArena('${encodeURIComponent(peer.name)}')" class="inline-flex items-center gap-1 rounded-lg border border-[#B9F044]/40 bg-[#B9F044]/15 px-2 py-1.5 text-[11px] font-bold text-[#2F6F11] hover:bg-[#B9F044] hover:text-[#0B1F17] transition" title="Invite to Speed Race Arena">
              🏎️ Race
            </button>

            <!-- Book / Session -->
            <a href="session.html?mentor=${encodeURIComponent(peer.name)}" class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:border-[#2F6F11] hover:text-[#2F6F11] transition" title="Schedule / Book Session">
              <i data-lucide="calendar" class="h-3 w-3"></i>
            </a>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  // ── Filter Logic ────────────────────────────────────────────────
  function getCurrentFilteredPeers() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const topic = topicFilter ? topicFilter.value : '';
    const lang  = langFilter  ? langFilter.value  : '';
    const avail = availFilter ? availFilter.value : '';

    return PEERS.filter(peer => {
      // Text search
      if (query) {
        const haystack = [
          peer.name, peer.bio, peer.department, peer.year,
          ...(peer.topics || []), ...(peer.languages || [])
        ].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      // Topic filter
      if (topic) {
        const hasTopic = (peer.topics || []).some(t => 
          t.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(t.toLowerCase())
        );
        if (!hasTopic) return false;
      }

      // Language filter
      if (lang) {
        const hasLang = (peer.languages || []).some(l => 
          l.toLowerCase().includes(lang.toLowerCase()) || lang.toLowerCase().includes(l.toLowerCase())
        );
        if (!hasLang) return false;
      }

      // Availability filter
      if (avail && peer.availability !== avail) return false;

      return true;
    }).sort((a, b) => {
      const order = { online: 0, busy: 1, offline: 2 };
      if (order[a.availability] !== order[b.availability]) {
        return order[a.availability] - order[b.availability];
      }
      return a.name.localeCompare(b.name);
    });
  }

  function applyFilters() {
    renderPeers(getCurrentFilteredPeers());
  }

  // ── Smart Auto-Matching Algorithm ───────────────────────────────
  window.openSmartMatchModal = function () {
    const modal = document.getElementById('smart-match-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  };

  window.closeSmartMatchModal = function () {
    const modal = document.getElementById('smart-match-modal');
    if (modal) {
      modal.classList.remove('flex');
      modal.classList.add('hidden');
    }
    const loader = document.getElementById('match-loading-overlay');
    if (loader) loader.classList.add('hidden');
  };

  window.executeSmartPairing = function () {
    const prefTopic = document.getElementById('match-pref-topic')?.value || 'Data Structures & Algorithms';
    const prefLang  = document.getElementById('match-pref-lang')?.value  || 'English';
    const loader    = document.getElementById('match-loading-overlay');
    const btn       = document.getElementById('btn-execute-match');

    if (loader) loader.classList.remove('hidden');
    if (btn) btn.disabled = true;

    setTimeout(() => {
      // Calculate match scores
      const scored = PEERS.map(p => {
        let score = 0;
        const pTopics = (p.topics || []).map(t => t.toLowerCase());
        const pLangs  = (p.languages || []).map(l => l.toLowerCase());

        if (pTopics.some(t => t.includes(prefTopic.toLowerCase()) || prefTopic.toLowerCase().includes(t))) score += 50;
        if (pLangs.some(l => l.includes(prefLang.toLowerCase()) || prefLang.toLowerCase().includes(l))) score += 35;
        if (p.availability === 'online') score += 20;
        score += (p.rating || 4.5) * 2;

        return { peer: p, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const bestMatch = scored[0]?.peer || PEERS[0];

      if (loader) loader.classList.add('hidden');
      if (btn) btn.disabled = false;
      window.closeSmartMatchModal();

      // Set active study pair
      setActiveStudyPair(bestMatch, prefTopic, prefLang);

      // Confetti celebration
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      // Smooth scroll to pair banner
      if (activePairCard) {
        activePairCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 1100);
  };

  // ── Direct 1-Click Pairing from Peer Card ────────────────────────
  window.pairDirectlyWithPeer = function (peerId) {
    const peer = PEERS.find(p => p.id === peerId);
    if (!peer) return;

    const currentPair = getActiveStudyPair();
    if (currentPair && currentPair.peerId === peer.id) {
      unpairStudyPartner();
      return;
    }

    setActiveStudyPair(peer, peer.topics?.[0], peer.languages?.[0]);
    if (typeof confetti === 'function') {
      confetti({ particleCount: 50, spread: 55, origin: { y: 0.7 } });
    }
  };

  window.unpairStudyPartner = unpairStudyPartner;

  // ── Custom Skill Modal Handlers ──────────────────────────────────
  window.openCustomSkillModal = function () {
    const modal = document.getElementById('custom-skill-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      const input = document.getElementById('input-custom-skill');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
      }
    }
  };

  window.closeCustomSkillModal = function () {
    const modal = document.getElementById('custom-skill-modal');
    if (modal) {
      modal.classList.remove('flex');
      modal.classList.add('hidden');
    }
  };

  window.applyCustomSkillFilter = function () {
    const input = document.getElementById('input-custom-skill');
    const skill = input ? input.value.trim() : '';
    if (!skill) return;

    window.closeCustomSkillModal();

    // Check if option already in topic filter, else add it
    let found = false;
    Array.from(topicFilter.options).forEach(opt => {
      if (opt.value.toLowerCase() === skill.toLowerCase()) {
        opt.selected = true;
        found = true;
      }
    });

    if (!found) {
      const newOpt = document.createElement('option');
      newOpt.value = skill;
      newOpt.textContent = `★ ${skill} (Custom)`;
      newOpt.selected = true;
      topicFilter.appendChild(newOpt);
    }

    syncTopicChips();
    applyFilters();

    if (window.GyanSetuNetwork) {
      window.GyanSetuNetwork.showToast(`🔍 Filtered peers for skill: "${skill}"`);
    }
  };

  // ── Clear All Filters ────────────────────────────────────────────
  window.clearAllFilters = function () {
    if (searchInput) searchInput.value = '';
    if (topicFilter) topicFilter.value = '';
    if (langFilter)  langFilter.value  = '';
    if (availFilter) availFilter.value = '';
    if (topicChips)  topicChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    applyFilters();
  };

  // ── Event Listeners ──────────────────────────────────────────────
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (topicFilter) topicFilter.addEventListener('change', () => { syncTopicChips(); applyFilters(); });
  if (langFilter)  langFilter.addEventListener('change', applyFilters);
  if (availFilter) availFilter.addEventListener('change', applyFilters);

  // ── Load Registered Peers from Supabase & Merge ──────────────────
  async function loadPeers() {
    let supabaseProfiles = [];

    if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON && !window.SUPABASE_ANON.includes('*')) {
      try {
        const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
        // Query all registered users across the platform
        const { data, error } = await client.from('profiles').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          supabaseProfiles = data;
        }
      } catch (e) {
        console.warn('Could not load profiles from Supabase:', e);
      }
    }

    if (supabaseProfiles.length > 0) {
      const converted = supabaseProfiles.map((p, idx) => {
        const fullName = p.full_name || p.name || 'Campus Peer';
        const initials = fullName.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
        return {
          id: p.id || `profile-${idx}`,
          name: fullName,
          avatar: initials || '👤',
          department: p.department || 'Computer Science',
          year: p.year || '3rd Year',
          rating: Number(p.rating) || 4.8,
          sessions: Number(p.sessions_count || p.sessions) || 12,
          topics: Array.isArray(p.topics) && p.topics.length > 0 ? p.topics : ['Data Structures & Algorithms', 'Python & AI Engineering'],
          languages: Array.isArray(p.languages) && p.languages.length > 0 ? p.languages : ['English', 'Hindi'],
          availability: p.availability || (idx % 3 === 0 ? 'busy' : 'online'),
          bio: p.bio || `Active GyanSetu learner & peer partner at ${p.college || 'Graphic Era'}.`
        };
      });

      // Merge: real users take precedence, supplemented with default directory
      const existingNames = new Set(converted.map(c => c.name.toLowerCase()));
      const filteredDefaults = DEFAULT_CAMPUS_PEERS.filter(d => !existingNames.has(d.name.toLowerCase()));
      PEERS = [...converted, ...filteredDefaults];
    } else {
      PEERS = [...DEFAULT_CAMPUS_PEERS];
    }

    populateDropdowns();
    renderTopicChips();
    renderActiveStudyPairCard();
    applyFilters();
  }

  // Initial load
  populateDropdowns();
  renderTopicChips();
  renderActiveStudyPairCard();
  loadPeers();
})();
