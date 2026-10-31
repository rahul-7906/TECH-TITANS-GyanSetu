// ── Smart Matching Dashboard — peers.js ───────────────────────────
// Real-time search + filter by topic, language, and availability.
// Results update as the user types or changes any filter.

(function () {
  'use strict';

  // Peer data is loaded from the authenticated platform; no demo records are shown.
  let PEERS = [];

  // ── Collect all unique values for filter options ─────────────────
  const ALL_TOPICS     = [...new Set(PEERS.flatMap(p => p.topics))].sort();
  const ALL_LANGUAGES  = [...new Set(PEERS.flatMap(p => p.languages))].sort();

  // ── DOM refs ────────────────────────────────────────────────────
  const searchInput    = document.getElementById('peer-search');
  const topicFilter    = document.getElementById('filter-topic');
  const langFilter     = document.getElementById('filter-language');
  const availFilter    = document.getElementById('filter-availability');
  const grid           = document.getElementById('peers-grid');
  const emptyState     = document.getElementById('peers-empty');
  const resultsCount   = document.getElementById('results-count');
  const topicChips     = document.getElementById('topic-chips');

  // ── Populate dropdown options ───────────────────────────────────
  ALL_TOPICS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    topicFilter.appendChild(opt);
  });
  ALL_LANGUAGES.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l; opt.textContent = l;
    langFilter.appendChild(opt);
  });

  // ── Build quick-filter chips ────────────────────────────────────
  const popularTopics = [];
  popularTopics.forEach(topic => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip';
    chip.textContent = topic;
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      if (chip.classList.contains('active')) {
        topicFilter.value = topic;
      } else {
        topicFilter.value = '';
      }
      // Deactivate other chips
      topicChips.querySelectorAll('.filter-chip').forEach(c => {
        if (c !== chip) c.classList.remove('active');
      });
      applyFilters();
    });
    topicChips.appendChild(chip);
  });

  // ── Availability label & class helpers ──────────────────────────
  function availLabel(status) {
    if (status === 'online')  return 'Online Now';
    if (status === 'busy')    return 'In Session';
    return 'Offline';
  }

  function avatarGradient(idx) {
    const gradients = [
      'from-[#064E3B] to-[#2F6F11]',
      'from-[#7C3AED] to-[#4F46E5]',
      'from-[#0891B2] to-[#0E7490]',
      'from-[#D97706] to-[#B45309]',
      'from-[#E11D48] to-[#BE123C]',
      'from-[#2563EB] to-[#1D4ED8]',
    ];
    return gradients[idx % gradients.length];
  }

  // ── Render peer cards ───────────────────────────────────────────
  function renderPeers(peers) {
    grid.innerHTML = '';

    if (peers.length === 0) {
      grid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      resultsCount.innerHTML = '<strong>0</strong> peers found';
      return;
    }

    emptyState.classList.add('hidden');
    grid.classList.remove('hidden');
    resultsCount.innerHTML = `<strong>${peers.length}</strong> peer${peers.length !== 1 ? 's' : ''} found`;

    peers.forEach((peer, i) => {
      const card = document.createElement('div');
      card.className = 'peer-card peer-card-enter shadow-card';
      card.style.animationDelay = `${i * 0.04}s`;

      const stars = '★'.repeat(Math.floor(peer.rating)) + (peer.rating % 1 >= 0.5 ? '½' : '');

      card.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="relative shrink-0">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient(peer.id)} text-sm font-extrabold text-white">
              ${peer.avatar}
            </div>
            <span class="avail-dot avail-${peer.availability} absolute -bottom-0.5 -right-0.5 border-2 border-white"></span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="text-sm font-extrabold text-[#0B1F17] truncate">${peer.name}</p>
              ${peer.sessions >= 100 ? '<i data-lucide="badge-check" class="h-4 w-4 text-[#2F6F11] shrink-0"></i>' : ''}
            </div>
            <p class="text-[11px] text-slate-500">${peer.department} · ${peer.year}</p>
          </div>
          <span class="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold
            ${peer.availability === 'online' ? 'bg-green-50 text-green-700' : peer.availability === 'busy' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}">
            <span class="avail-dot avail-${peer.availability}"></span>
            ${availLabel(peer.availability)}
          </span>
        </div>

        <p class="mt-2.5 text-[12px] leading-5 text-slate-500 line-clamp-2">${peer.bio}</p>

        <div class="mt-3 flex flex-wrap gap-1.5">
          ${peer.topics.map(t => `<span class="skill-tag">${t}</span>`).join('')}
        </div>

        <div class="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
          <div class="flex items-center gap-3 text-[11px] text-slate-500">
            <span class="flex items-center gap-1 text-amber-500 font-bold">${stars} <span class="text-slate-400 font-normal">${peer.rating}</span></span>
            <span>${peer.sessions} sessions</span>
          </div>
          <a href="session.html" class="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F17] px-3 py-1.5 text-[11px] font-bold text-[#B9F044] transition hover:bg-[#064E3B]">
            <i data-lucide="calendar-plus" class="h-3 w-3"></i> Book
          </a>
        </div>
      `;
      grid.appendChild(card);
    });

    // Re-render lucide icons inside newly created cards
    if (window.lucide) lucide.createIcons();
  }

  // ── Filter logic ────────────────────────────────────────────────
  function applyFilters() {
    const query  = searchInput.value.trim().toLowerCase();
    const topic  = topicFilter.value;
    const lang   = langFilter.value;
    const avail  = availFilter.value;

    const filtered = PEERS.filter(peer => {
      // Text search — name, bio, topics, languages, department
      if (query) {
        const haystack = [
          peer.name, peer.bio, peer.department, peer.year,
          ...peer.topics, ...peer.languages
        ].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      // Topic filter
      if (topic && !peer.topics.includes(topic)) return false;

      // Language filter
      if (lang && !peer.languages.includes(lang)) return false;

      // Availability filter
      if (avail && peer.availability !== avail) return false;

      return true;
    });

    // Sort: online first, then by rating descending
    filtered.sort((a, b) => {
      const order = { online: 0, busy: 1, offline: 2 };
      if (order[a.availability] !== order[b.availability]) {
        return order[a.availability] - order[b.availability];
      }
      return b.rating - a.rating;
    });

    renderPeers(filtered);
  }

  // ── Sync topic chips when dropdown changes ──────────────────────
  function syncChips() {
    const val = topicFilter.value;
    topicChips.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('active', c.textContent === val);
    });
  }

  // ── Event listeners — real-time filtering ───────────────────────
  searchInput.addEventListener('input', applyFilters);
  topicFilter.addEventListener('change', () => { syncChips(); applyFilters(); });
  langFilter.addEventListener('change', applyFilters);
  availFilter.addEventListener('change', applyFilters);

  // ── Clear all filters ───────────────────────────────────────────
  window.clearAllFilters = function () {
    searchInput.value  = '';
    topicFilter.value  = '';
    langFilter.value   = '';
    availFilter.value  = '';
    topicChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    applyFilters();
  };

  // ── Load only real peer records from Supabase ───────────────────
  async function loadPeers() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON) {
      renderPeers([]);
      return;
    }
    const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
    const { data, error } = await client.from('profiles')
      .select('id, full_name, department, year, topics, languages, availability, bio, rating, sessions_count')
      .eq('role', 'mentor');
    if (error || !Array.isArray(data)) {
      renderPeers([]);
      return;
    }
    PEERS = data.map((peer, index) => ({
      id: peer.id,
      name: peer.full_name,
      avatar: String(peer.full_name || '?').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase(),
      department: peer.department || '',
      year: peer.year || '',
      rating: Number(peer.rating) || 0,
      sessions: Number(peer.sessions_count) || 0,
      topics: Array.isArray(peer.topics) ? peer.topics : [],
      languages: Array.isArray(peer.languages) ? peer.languages : [],
      availability: peer.availability || 'offline',
      bio: peer.bio || ''
    }));
    ALL_TOPICS.splice(0, ALL_TOPICS.length, ...new Set(PEERS.flatMap(p => p.topics)).sort());
    ALL_LANGUAGES.splice(0, ALL_LANGUAGES.length, ...new Set(PEERS.flatMap(p => p.languages)).sort());
    ALL_TOPICS.forEach(t => topicFilter.append(new Option(t, t)));
    ALL_LANGUAGES.forEach(l => langFilter.append(new Option(l, l)));
    applyFilters();
  }

  loadPeers();
})();
