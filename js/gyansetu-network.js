/**
 * GyanSetu Peer Network, Direct Invites, and Notification Center
 * Handles:
 *  1. Peer Connections & Extensions (Connect, Connected list, Team Direct Invites)
 *  2. Real-Time Notification Center (Online alerts, Arena practice alerts, Team invites)
 *  3. Priority Smart Search Engine (Dropdown autocomplete across Peers, Arena, Rooms, Notes)
 */

(function (window) {
  'use strict';

  var STORAGE_KEYS = {
    CONNECTIONS: 'gyansetu_peer_connections',
    NOTIFICATIONS: 'gyansetu_campus_notifications'
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PEER CONNECTIONS & EXTENSIONS SYSTEM (GyanSetuNetwork)
  // ═══════════════════════════════════════════════════════════════════════════
  var GyanSetuNetwork = {
    /**
     * Retrieve all saved connections
     */
    getConnections: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEYS.CONNECTIONS);
        if (raw) {
          var parsed = JSON.parse(raw);
          var clean = (parsed || []).filter(function (c) {
            if (!c || !c.name) return false;
            var name = c.name.toLowerCase();
            return !name.includes('rohan') && !name.includes('priya') && !name.includes('vikram') && !name.includes('ananya') && c.id !== 'peer_rohan' && c.id !== 'peer_priya';
          });
          if (clean.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(clean));
          }
          return clean;
        }
      } catch (e) {}
      return [];
    },

    saveConnections: function (list) {
      try {
        localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(list || []));
        window.dispatchEvent(new CustomEvent('gyansetu:connections-updated', { detail: { connections: list } }));
      } catch (e) {}
    },

    isConnected: function (peerIdOrName) {
      if (!peerIdOrName) return false;
      var clean = String(peerIdOrName).toLowerCase().trim();
      var conns = this.getConnections();
      return conns.some(function (c) {
        return (c.id && c.id.toLowerCase() === clean) ||
               (c.name && c.name.toLowerCase() === clean);
      });
    },

    /**
     * Toggle connection state with a peer
     */
    toggleConnect: function (peer) {
      if (!peer || (!peer.id && !peer.name)) return { connected: false };
      var conns = this.getConnections();
      var peerId = peer.id || ('peer_' + (peer.name || '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase());
      var peerName = peer.name || peer.full_name || 'Campus Student';
      var idx = conns.findIndex(function (c) {
        return c.id === peerId || (c.name && c.name.toLowerCase() === peerName.toLowerCase());
      });

      var isNowConnected = false;
      if (idx >= 0) {
        // Disconnect
        conns.splice(idx, 1);
        isNowConnected = false;
        this.showToast('Removed ' + peerName + ' from your network.');
      } else {
        // Connect
        var newConn = {
          id: peerId,
          name: peerName,
          dept: peer.dept || peer.department || 'Computer Science',
          college: peer.college || 'Graphic Era Hill University',
          avatar: peer.avatar || (peerName.charCodeAt(0) % 2 === 0 ? '👨‍💻' : '👩‍💻'),
          rr: peer.rr || 1000,
          tier: peer.tier || 'Silver',
          status: peer.status || 'online',
          activity: peer.activity || 'Ready for peer study',
          connectedAt: new Date().toISOString()
        };
        conns.unshift(newConn);
        isNowConnected = true;
        this.showToast('🤝 Connected with ' + peerName + '! You can now directly invite them.');

        // Dispatch alert to Notification Center
        GyanSetuNotifications.addNotification({
          type: 'network',
          icon: '🤝',
          title: 'New Connection Established',
          desc: 'You and ' + peerName + ' (' + newConn.dept + ') are now connected. Team up in Arena or Collab Room!',
          actionLabel: 'Invite to Arena 🏎️',
          actionUrl: 'arena.html?peer=' + encodeURIComponent(peerName)
        });
      }

      this.saveConnections(conns);
      return { connected: isNowConnected, peer: peer };
    },

    /**
     * Direct 1-Click Speed Race Arena Invitation
     */
    inviteToArena: function (peerName, roomCode, team) {
      roomCode = roomCode || 'turbo-dsa-42';
      team = team || 'team1';
      var origin = window.location.origin;
      var path = window.location.pathname.replace(/\/[^/]*$/, '/arena.html');
      var link = origin + path + '?room=' + encodeURIComponent(roomCode) + '&team=' + encodeURIComponent(team) + '&peer=' + encodeURIComponent(peerName || 'Peer');

      navigator.clipboard.writeText(link).then(function () {
        alert('📨 Arena Race Invite for ' + (peerName || 'teammate') + ' copied to clipboard!\n\nRoom: ' + roomCode + '\nSquad: ' + (team === 'team1' ? 'Team Alpha' : 'Rival Titans') + '\n\nSend this direct link to play together:\n' + link);
      }).catch(function () {
        prompt('Copy Arena match invite link for ' + peerName + ':', link);
      });

      GyanSetuNotifications.addNotification({
        type: 'racing',
        icon: '🏎️',
        title: 'Arena Match Invite Dispatched',
        desc: 'Direct invite link generated for ' + (peerName || 'Peer') + ' into Room: ' + roomCode,
        actionLabel: 'Open Arena 🏎️',
        actionUrl: link
      });
    },

    /**
     * Direct 1-Click Live Collab Room Invitation
     */
    inviteToRoom: function (peerName, roomCode) {
      roomCode = roomCode || 'study-collab-7';
      var origin = window.location.origin;
      var path = window.location.pathname.replace(/\/[^/]*$/, '/room.html');
      var link = origin + path + '?room=' + encodeURIComponent(roomCode) + '&peer=' + encodeURIComponent(peerName || 'Peer');

      navigator.clipboard.writeText(link).then(function () {
        alert('📨 Collab Room invite link for ' + (peerName || 'classmate') + ' copied!\n\nRoom: ' + roomCode + '\n\nSend this link to start live study session:\n' + link);
      }).catch(function () {
        prompt('Copy room invite link for ' + peerName + ':', link);
      });
    },

    showToast: function (msg) {
      var toast = document.createElement('div');
      toast.className = 'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#0B1F17] border border-[#B9F044]/50 px-4 py-3 text-xs font-bold text-white shadow-2xl animate-bounce';
      toast.innerHTML = '<span class="text-[#B9F044]">●</span> <span>' + msg + '</span>';
      document.body.appendChild(toast);
      setTimeout(function () {
        toast.style.transition = 'opacity 0.4s';
        toast.style.opacity = '0';
        setTimeout(function () { toast.remove(); }, 400);
      }, 3200);
    }
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // 2. REAL-TIME CAMPUS NOTIFICATION CENTER (GyanSetuNotifications)
  // ═══════════════════════════════════════════════════════════════════════════
  var GyanSetuNotifications = {
    getNotifications: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        if (raw) {
          var parsed = JSON.parse(raw);
          // Strictly purge any dummy or mock alerts
          var clean = (parsed || []).filter(function (n) {
            if (!n || !n.desc) return false;
            var text = ((n.title || '') + ' ' + (n.desc || '')).toLowerCase();
            return !text.includes('rohan sharma') &&
                   !text.includes('priya verma') &&
                   !text.includes('vikram malhotra') &&
                   !text.includes('ananya joshi') &&
                   !text.includes('turbo-dsa-42') &&
                   n.id !== 'notif_1' && n.id !== 'notif_2' && n.id !== 'notif_3' && n.id !== 'notif_4';
          });
          if (clean.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(clean));
          }
          return clean;
        }
      } catch (e) {}

      // Authentic system notification only
      var initialAlerts = [
        {
          id: 'notif_system_welcome',
          type: 'credits',
          icon: '🪙',
          title: 'Account Escrow Verified',
          desc: 'Your starting credit balance is active in escrow. Connect with campus peers or enter the Speed Race Arena to collaborate.',
          actionLabel: 'View Dashboard 📊',
          actionUrl: 'dashboard.html',
          time: 'Active',
          unread: false
        }
      ];
      this.saveNotifications(initialAlerts);
      return initialAlerts;
    },

    saveNotifications: function (list) {
      try {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list || []));
        this.updateBadge();
      } catch (e) {}
    },

    getUnreadCount: function () {
      var notifs = this.getNotifications();
      return notifs.filter(function (n) { return n.unread === true; }).length;
    },

    updateBadge: function () {
      var count = this.getUnreadCount();
      var badge = document.getElementById('notification-badge');
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 9 ? '9+' : count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    },

    markAllRead: function () {
      var notifs = this.getNotifications();
      notifs.forEach(function (n) { n.unread = false; });
      this.saveNotifications(notifs);
      this.renderDropdown();
    },

    addNotification: function (notif) {
      if (!notif) return;
      var notifs = this.getNotifications();
      notif.id = notif.id || ('notif_' + Date.now());
      notif.time = notif.time || 'Just now';
      notif.unread = true;
      notifs.unshift(notif);
      if (notifs.length > 30) notifs.pop();
      this.saveNotifications(notifs);
      this.renderDropdown();
    },

    renderDropdown: function (containerId) {
      var container = document.getElementById(containerId || 'notifications-list-container');
      if (!container) return;
      var notifs = this.getNotifications();

      if (notifs.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-xs text-slate-400">' +
          '<div class="text-2xl mb-1.5">🔔</div>' +
          '<p class="font-bold text-[#0B1F17]">No new notifications</p>' +
          '<p class="text-[11px] text-slate-400 mt-0.5">Real-time alerts for duels, study sessions, and peer connections will appear here.</p>' +
        '</div>';
        return;
      }

      container.innerHTML = notifs.map(function (n) {
        var unreadDot = n.unread ? '<span class="h-2 w-2 rounded-full bg-rose-500 shrink-0"></span>' : '';
        var bgClass = n.unread ? 'bg-[#F4FBEA]/60 border-[#B9F044]/40' : 'bg-white border-slate-100';

        var actionHtml = '';
        if (n.actionLabel && n.actionUrl) {
          if (n.actionUrl.startsWith('javascript:')) {
            actionHtml = '<button onclick="' + n.actionUrl.replace('javascript:', '') + '" class="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#0B1F17] px-2.5 py-1 text-[10px] font-extrabold text-[#B9F044] hover:bg-[#064E3B] transition">' + n.actionLabel + '</button>';
          } else {
            actionHtml = '<a href="' + n.actionUrl + '" class="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#0B1F17] px-2.5 py-1 text-[10px] font-extrabold text-[#B9F044] hover:bg-[#064E3B] transition">' + n.actionLabel + '</a>';
          }
        }

        return '<div class="p-3 border-b border-slate-100 flex items-start gap-3 transition hover:bg-slate-50 ' + bgClass + '">' +
          '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm">' + (n.icon || '🔔') + '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center justify-between gap-1">' +
              '<p class="text-xs font-bold text-[#0B1F17] truncate">' + n.title + '</p>' +
              '<span class="text-[9px] font-mono text-slate-400 shrink-0">' + n.time + '</span>' +
            '</div>' +
            '<p class="text-[11px] text-slate-600 mt-0.5 leading-snug">' + n.desc + '</p>' +
            actionHtml +
          '</div>' +
          unreadDot +
        '</div>';
      }).join('');
    }
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PRIORITY SMART GLOBAL SEARCH ENGINE (GyanSetuSearch)
  // ═══════════════════════════════════════════════════════════════════════════
  var GyanSetuSearch = {
    // Static index of rooms, arenas, and knowledge modules
    staticIndex: [
      { type: 'arena', category: 'Speed Race Arena', title: 'DSA Turbo Circuit', subtitle: 'Binary trees, arrays, graphs & DP code sprints', url: 'arena.html?topic=dsa', icon: '🏎️', priority: 95 },
      { type: 'arena', category: 'Speed Race Arena', title: 'Operating Systems & Concurrency Duel', subtitle: 'Processes, threads, page faults & memory races', url: 'arena.html?topic=cs-general', icon: '⚡', priority: 90 },
      { type: 'arena', category: 'Speed Race Arena', title: 'Python Algorithmic Sprint', subtitle: 'List comprehensions, dicts, recursion & generators', url: 'arena.html?topic=lang-python', icon: '🐍', priority: 90 },
      { type: 'arena', category: 'Speed Race Arena', title: 'JavaScript & Web Async Duel', subtitle: 'Event loop, Promises, closures & DOM optimizations', url: 'arena.html?topic=lang-javascript', icon: '🌐', priority: 88 },
      { type: 'arena', category: 'Speed Race Arena', title: 'Aptitude, Math & Logic Race', subtitle: 'Discrete math, quantitative reasoning & speed math', url: 'arena.html?topic=aptitude', icon: '🧩', priority: 85 },
      { type: 'room', category: 'Live Collab Rooms', title: 'Collaborative Code & Whiteboard Room', subtitle: 'Real-time multi-peer editor with WebRTC low-latency audio', url: 'room.html', icon: '💻', priority: 85 },
      { type: 'session', category: 'Peer Micro-Sessions', title: 'Book 15-Minute Peer Doubt Slot', subtitle: 'Escrow protected 1-on-1 rapid concept clearing', url: 'session.html', icon: '📅', priority: 80 },
      { type: 'note', category: 'Study Vault', title: 'DSA Complete Sheet & Cheat Codes', subtitle: '450 standard interview problems with optimal logic', url: 'dashboard.html#vault', icon: '📄', priority: 70 },
      { type: 'note', category: 'Study Vault', title: 'Operating Systems Quick Revision Notes', subtitle: 'CPU scheduling algorithms, deadlock & paging summaries', url: 'dashboard.html#vault', icon: '📑', priority: 70 },
      { type: 'ranking', category: 'Leaderboard', title: 'Campus Department Leaderboard', subtitle: 'View global, state, and college rank tiers & RR ledgers', url: 'ranking.html', icon: '🏆', priority: 75 }
    ],

    /**
     * Executes priority scoring across queries
     */
    search: function (query, callback) {
      var q = (query || '').trim().toLowerCase();
      if (!q) {
        if (typeof callback === 'function') callback([]);
        return [];
      }

      var results = [];

      // 1. Priority 1: Peers & Mentors (Exact Name > Topic > Dept > Role)
      var registeredPeers = [];
      if (window.GyanSetuAuth?.getAllRegisteredUsers) {
        window.GyanSetuAuth.getAllRegisteredUsers().then(function (users) {
          processAll(users || []);
        }).catch(function () {
          processAll([]);
        });
      } else {
        processAll([]);
      }

      var self = this;
      function processAll(peers) {
        peers.forEach(function (p) {
          var name = (p.full_name || p.name || '').toLowerCase();
          var dept = (p.department || '').toLowerCase();
          var college = (p.college || '').toLowerCase();
          var role = (p.role || '').toLowerCase();

          var score = 0;
          if (name === q) score += 100;
          else if (name.startsWith(q)) score += 80;
          else if (name.includes(q)) score += 60;

          if (dept.includes(q)) score += 40;
          if (college.includes(q)) score += 20;
          if (role.includes(q)) score += 15;

          if (score > 0) {
            var peerDisplayName = p.full_name || p.name || 'Campus Student';
            var isConn = GyanSetuNetwork.isConnected(p.id || peerDisplayName);
            results.push({
              score: score,
              type: 'peer',
              category: 'Campus Peers & Mentors',
              title: peerDisplayName,
              subtitle: (p.department || 'Computer Science') + (p.rr ? ' • ' + p.rr + ' RR' : ''),
              avatar: p.full_name && p.full_name.charCodeAt(0) % 2 === 0 ? '👨‍💻' : '👩‍💻',
              url: 'peers.html?q=' + encodeURIComponent(peerDisplayName),
              peerObj: p,
              isConnected: isConn
            });
          }
        });

        // 2. Static Index Items (Arena, Rooms, Notes, Rankings)
        self.staticIndex.forEach(function (item) {
          var title = item.title.toLowerCase();
          var sub = item.subtitle.toLowerCase();
          var cat = item.category.toLowerCase();

          var score = 0;
          if (title.includes(q)) score += item.priority;
          else if (sub.includes(q)) score += (item.priority - 15);
          else if (cat.includes(q)) score += 30;

          if (score > 0) {
            results.push({
              score: score,
              type: item.type,
              category: item.category,
              title: item.title,
              subtitle: item.subtitle,
              icon: item.icon,
              url: item.url
            });
          }
        });

        // Sort descending by priority score
        results.sort(function (a, b) { return b.score - a.score; });

        if (typeof callback === 'function') {
          callback(results.slice(0, 8));
        }
      }
    },

    /**
     * Render the instant dropdown with high-priority results
     */
    renderDropdown: function (results, query, dropdownEl) {
      if (!dropdownEl) return;
      if (!query || results.length === 0) {
        if (!query) {
          dropdownEl.classList.add('hidden');
        } else {
          dropdownEl.innerHTML = '<div class="p-5 text-center text-xs text-slate-400">No direct matches for "<strong>' + escapeHtml(query) + '</strong>". Try searching for <em>DSA</em>, <em>Python</em>, or a peer name.</div>';
          dropdownEl.classList.remove('hidden');
        }
        return;
      }

      function highlight(text, q) {
        if (!text || !q) return text || '';
        var idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) return escapeHtml(text);
        return escapeHtml(text.substring(0, idx)) +
          '<mark class="bg-[#B9F044]/40 text-[#0B1F17] rounded px-0.5 font-bold">' +
          escapeHtml(text.substring(idx, idx + q.length)) +
          '</mark>' +
          escapeHtml(text.substring(idx + q.length));
      }

      function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function (m) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
      }

      var html = '<div class="p-2">';
      html += '<div class="px-2 pb-1.5 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">';
      html += '<span>Top Verified Results (' + results.length + ')</span>';
      html += '<span class="text-[9px] text-[#2F6F11] font-bold">Priority Matched</span>';
      html += '</div>';

      results.forEach(function (res) {
        if (res.type === 'peer') {
          var connBtnText = res.isConnected ? '✓ Connected' : '+ Connect';
          var connBtnClass = res.isConnected
            ? 'rounded-lg bg-emerald-100 text-emerald-800 px-2 py-1 text-[10px] font-extrabold hover:bg-emerald-200 transition'
            : 'rounded-lg bg-[#0B1F17] text-[#B9F044] px-2 py-1 text-[10px] font-extrabold hover:bg-[#064E3B] transition';

          html += '<div class="rounded-xl p-2.5 hover:bg-slate-50 transition border border-transparent hover:border-slate-100 flex items-center justify-between gap-3 mb-1">' +
            '<div class="flex items-center gap-2.5 min-w-0">' +
              '<span class="text-2xl shrink-0">' + (res.avatar || '👨‍💻') + '</span>' +
              '<div class="min-w-0">' +
                '<p class="text-xs font-bold text-[#0B1F17] truncate">' + highlight(res.title, query) + '</p>' +
                '<p class="text-[10px] text-slate-500 truncate">' + highlight(res.subtitle, query) + '</p>' +
              '</div>' +
            '</div>' +
            '<div class="flex items-center gap-1.5 shrink-0">' +
              '<button type="button" onclick="event.stopPropagation(); window.togglePeerConnectionFromSearch(\'' + escapeHtml(res.title) + '\')" class="' + connBtnClass + '">' +
                connBtnText +
              '</button>' +
              '<button type="button" onclick="event.stopPropagation(); window.GyanSetuNetwork.inviteToArena(\'' + escapeHtml(res.title) + '\')" class="rounded-lg border border-[#B9F044]/40 bg-[#B9F044]/15 px-2 py-1 text-[10px] font-extrabold text-[#2F6F11] hover:bg-[#B9F044] hover:text-[#0B1F17] transition" title="1-Click Arena Invite">' +
                '🏎️ Race' +
              '</button>' +
            '</div>' +
          '</div>';
        } else {
          html += '<a href="' + res.url + '" class="rounded-xl p-2.5 hover:bg-slate-50 transition border border-transparent hover:border-slate-100 flex items-center justify-between gap-3 block mb-1">' +
            '<div class="flex items-center gap-2.5 min-w-0">' +
              '<span class="text-xl shrink-0">' + (res.icon || '⚡') + '</span>' +
              '<div class="min-w-0">' +
                '<div class="flex items-center gap-1.5">' +
                  '<p class="text-xs font-bold text-[#0B1F17] truncate">' + highlight(res.title, query) + '</p>' +
                  '<span class="rounded bg-slate-100 px-1.5 py-0.2 text-[8px] font-mono text-slate-500 uppercase">' + res.category + '</span>' +
                '</div>' +
                '<p class="text-[10px] text-slate-500 truncate">' + highlight(res.subtitle, query) + '</p>' +
              '</div>' +
            '</div>' +
            '<span class="text-xs text-slate-400 shrink-0">&rarr;</span>' +
          '</a>';
        }
      });

      html += '</div>';
      dropdownEl.innerHTML = html;
      dropdownEl.classList.remove('hidden');
    }
  };

  // Helper for quick connect toggle from search results
  window.togglePeerConnectionFromSearch = function (peerName) {
    var res = GyanSetuNetwork.toggleConnect({ name: peerName });
    // Re-trigger current search to update button label
    var input = document.getElementById('global-search-input');
    if (input && input.value) {
      window.handleDashboardSearch(input.value);
    }
  };

  // Expose on global window object
  window.GyanSetuNetwork = GyanSetuNetwork;
  window.GyanSetuNotifications = GyanSetuNotifications;
  window.GyanSetuSearch = GyanSetuSearch;

})(window);
