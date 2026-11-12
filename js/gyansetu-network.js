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
    NOTIFICATIONS: 'gyansetu_campus_notifications',
    ACTIVITY: 'gyansetu_peer_activity'
  };

  function getCurrentProfile() {
    try {
      return JSON.parse(localStorage.getItem('gyansetu_active_profile') || 'null');
    } catch (e) {
      return null;
    }
  }

  function notificationKey(userId) {
    return userId ? STORAGE_KEYS.NOTIFICATIONS + '_' + userId : STORAGE_KEYS.NOTIFICATIONS;
  }

  function connectionsKey(userId) {
    return userId ? STORAGE_KEYS.CONNECTIONS + '_' + userId : STORAGE_KEYS.CONNECTIONS;
  }

  function getSupabaseClient() {
    if (!window.supabase || typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON === 'undefined') return null;
    if (!SUPABASE_URL || !SUPABASE_ANON || SUPABASE_ANON.includes('*')) return null;
    try { return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON); } catch (e) { return null; }
  }

  function saveRemoteNotification(recipientId, senderId, notif) {
    var sb = getSupabaseClient();
    if (!sb || !recipientId) return Promise.resolve({ skipped: true });
    return sb.from('peer_notifications').insert({
      recipient_id: recipientId,
      sender_id: senderId || '',
      type: notif.type || 'network',
      icon: notif.icon || '🔔',
      title: notif.title || 'GyanSetu update',
      description: notif.desc || '',
      action_label: notif.actionLabel || '',
      action_url: notif.actionUrl || '',
      secondary_action_label: notif.secondaryActionLabel || '',
      secondary_action_url: notif.secondaryActionUrl || '',
      is_read: false
    }).then(function (result) {
      if (result.error) console.warn('[GyanSetuNetwork] Remote notification sync warning:', result.error.message);
      return result;
    }).catch(function (error) {
      console.warn('[GyanSetuNetwork] Remote notification sync warning:', error);
      return { error: error };
    });
  }

  function resolveRegisteredPeer(peerName, peerId) {
    var sb = getSupabaseClient();
    var name = String(peerName || '').trim();
    if (!sb || !name) return Promise.resolve(null);
    var query = peerId
      ? sb.from('profiles').select('id, full_name, email').eq('id', peerId).limit(1)
      : sb.from('profiles').select('id, full_name, email').ilike('full_name', name).limit(1);
    return query
      .then(function (result) {
        if (result.error) {
          console.warn('[GyanSetuNetwork] Could not resolve invite recipient:', result.error.message);
          return null;
        }
        return Array.isArray(result.data) ? (result.data[0] || null) : (result.data || null);
      })
      .catch(function (error) {
        console.warn('[GyanSetuNetwork] Could not resolve invite recipient:', error);
        return null;
      });
  }

  function saveRemoteConnection(userId, peerId, peerName, status, requestedBy) {
    var sb = getSupabaseClient();
    if (!sb || !userId || !peerId) return;
    sb.from('peer_connections').upsert({
      user_id: userId,
      peer_id: peerId,
      peer_name: peerName || '',
      status: status || 'pending',
      requested_by: requestedBy || ''
    }, { onConflict: 'user_id,peer_id' }).then(function (result) {
      if (result.error) console.warn('[GyanSetuNetwork] Remote connection sync warning:', result.error.message);
    }).catch(function (error) {
      console.warn('[GyanSetuNetwork] Remote connection sync warning:', error);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PEER CONNECTIONS & EXTENSIONS SYSTEM (GyanSetuNetwork)
  // ═══════════════════════════════════════════════════════════════════════════
  var GyanSetuNetwork = {
    /**
     * Retrieve all saved connections
     */
    getConnections: function () {
      try {
        var profile = getCurrentProfile();
        var key = connectionsKey(profile?.id);
        var raw = localStorage.getItem(key) || (profile?.id ? localStorage.getItem(STORAGE_KEYS.CONNECTIONS) : null);
        if (raw) {
          var parsed = JSON.parse(raw);
          var clean = (parsed || []).filter(function (c) {
            return c && c.name && typeof c.name === 'string';
          });
          return clean;
        }
      } catch (e) {}
      return [];
    },

    saveConnections: function (list) {
      try {
        var profile = getCurrentProfile();
        localStorage.setItem(connectionsKey(profile?.id), JSON.stringify(list || []));
        window.dispatchEvent(new CustomEvent('gyansetu:connections-updated', { detail: { connections: list } }));
      } catch (e) {}
    },

    isConnected: function (peerIdOrName) {
      if (!peerIdOrName) return false;
      var clean = String(peerIdOrName).toLowerCase().trim();
      var conns = this.getConnections();
      return conns.some(function (c) {
        if (c.status && c.status !== 'accepted') return false;
        return (c.id && c.id.toLowerCase() === clean) ||
               (c.name && c.name.toLowerCase() === clean);
      });
    },

    getConnectionStatus: function (peerIdOrName) {
      var clean = String(peerIdOrName || '').toLowerCase().trim();
      var item = this.getConnections().find(function (c) {
        return (c.id && c.id.toLowerCase() === clean) ||
          (c.name && c.name.toLowerCase() === clean);
      });
      return item?.status || 'none';
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
        if (conns[idx].status === 'pending') {
          this.showToast('Request already sent to ' + peerName + '.');
          return { connected: false, pending: true, peer: peer };
        }
        conns.splice(idx, 1);
        isNowConnected = false;
        this.showToast('Removed ' + peerName + ' from your network.');
      } else {
        var current = getCurrentProfile();
        var newConn = {
          id: peerId,
          name: peerName,
          dept: peer.dept || peer.department || 'Computer Science',
          college: peer.college || 'Graphic Era Hill University',
          avatar: peer.avatar || (peerName.charCodeAt(0) % 2 === 0 ? '👨‍💻' : '👩‍💻'),
          rr: peer.rr || 1000,
          tier: peer.tier || 'Silver',
          status: 'pending',
          requestedBy: current?.id || '',
          activity: peer.activity || 'Ready for peer study',
          connectedAt: new Date().toISOString()
        };
        conns.unshift(newConn);
        this.showToast('🤝 Connection request sent to ' + peerName + '.');
        if (current?.id) {
          saveRemoteConnection(current.id, peerId, peerName, 'pending', current.id);
        }
        this.notifyPeer(peer, peerName);
      }

      this.saveConnections(conns);
      return { connected: isNowConnected, peer: peer };
    },

    notifyPeer: function (peer, peerName) {
      try {
        var current = getCurrentProfile();
        var users = JSON.parse(localStorage.getItem('gyansetu_local_accounts') || '{}');
        var target = null;
        Object.keys(users).some(function (email) {
          var profile = users[email]?.profile;
          if (profile && (profile.id === peer.id || profile.full_name === peerName || profile.email === peer.email)) {
            target = profile;
            return true;
          }
          return false;
        });
        if (target && target.id !== current?.id) {
          var key = notificationKey(target.id);
          var existing = JSON.parse(localStorage.getItem(key) || '[]');
          existing.unshift({
            id: 'notif_connection_' + Date.now(),
            type: 'network',
            icon: '🤝',
            title: 'New Connection Request',
            desc: `${current?.full_name || 'A campus peer'} wants to connect with you.`,
            actionLabel: 'Accept',
            actionUrl: 'javascript:window.GyanSetuNetwork.acceptConnection(' + JSON.stringify(current?.id || '') + ',' + JSON.stringify(peer.id || '') + ')',
            secondaryActionLabel: 'Decline',
            secondaryActionUrl: 'javascript:window.GyanSetuNetwork.rejectConnection(' + JSON.stringify(current?.id || '') + ')',
            time: 'Just now',
            unread: true
          });
          localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
        }
        saveRemoteNotification(target?.id || peer.id, current?.id, {
          type: 'network',
          icon: '🤝',
          title: 'New Connection Request',
          desc: `${current?.full_name || 'A campus peer'} wants to connect with you.`,
          actionLabel: 'Accept',
          actionUrl: 'javascript:window.GyanSetuNetwork.acceptConnection(' + JSON.stringify(current?.id || '') + ',' + JSON.stringify(peer.id || '') + ')',
          secondaryActionLabel: 'Decline',
          secondaryActionUrl: 'javascript:window.GyanSetuNetwork.rejectConnection(' + JSON.stringify(current?.id || '') + ')'
        });
        saveRemoteConnection(target?.id || peer.id, current?.id, current?.full_name || 'Campus peer', 'pending', current?.id);
      } catch (e) {
        console.warn('[GyanSetuNetwork] Could not notify connected peer:', e);
      }
    },

    acceptConnection: function (requesterId, peerId) {
      var profile = getCurrentProfile();
      if (!profile?.id || !requesterId) return;
      var conns = this.getConnections();
      var existing = conns.find(function (c) { return c.id === requesterId; });
      if (!existing) {
        existing = { id: requesterId, name: 'Campus peer', status: 'accepted', connectedAt: new Date().toISOString() };
        conns.unshift(existing);
      } else {
        existing.status = 'accepted';
      }
      this.saveConnections(conns);
      saveRemoteConnection(profile.id, requesterId, existing.name, 'accepted', requesterId);
      if (peerId) saveRemoteConnection(requesterId, profile.id, profile.full_name || 'Campus peer', 'accepted', requesterId);
      saveRemoteNotification(requesterId, profile.id, {
        type: 'network',
        icon: '🤝',
        title: 'Connection Request Accepted',
        desc: `${profile.full_name || 'A campus peer'} accepted your connection request.`,
        actionLabel: 'Open Peer Network',
        actionUrl: 'peers.html'
      });
      this.showToast('🤝 Connection accepted.');
      GyanSetuNotifications.addNotification({
        type: 'network',
        icon: '🤝',
        title: 'Connection Accepted',
        desc: 'You can now invite this peer to Arena or a Collab Room.',
        actionLabel: 'Open Peer Network',
        actionUrl: 'peers.html'
      });
    },

    rejectConnection: function (requesterId) {
      var profile = getCurrentProfile();
      if (!profile?.id || !requesterId) return;
      var conns = this.getConnections().filter(function (c) { return c.id !== requesterId; });
      this.saveConnections(conns);
      var sb = getSupabaseClient();
      if (sb) sb.from('peer_connections').delete().match({ user_id: profile.id, peer_id: requesterId }).then(function () {});
      this.showToast('Connection request declined.');
    },

    announceActivity: function (activity) {
      var profile = getCurrentProfile();
      if (!profile?.id) return;
      try {
        var throttleKey = 'gyansetu_last_presence_' + profile.id;
        var lastPresence = Number(localStorage.getItem(throttleKey) || 0);
        if (Date.now() - lastPresence < 10 * 60 * 1000) return;
        localStorage.setItem(throttleKey, String(Date.now()));
        var connections = this.getConnections();
        var event = {
          userId: profile.id,
          name: profile.full_name || 'A campus peer',
          type: activity?.type || 'active',
          title: activity?.title || 'is active on GyanSetu',
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(event));
        connections.forEach(function (connection) {
          var key = notificationKey(connection.id);
          var existing = JSON.parse(localStorage.getItem(key) || '[]');
          existing.unshift({
            id: 'notif_activity_' + profile.id + '_' + Date.now(),
            type: 'network',
            icon: '🟢',
            title: `${event.name} is active`,
            desc: `${event.name} ${event.title}.`,
            actionLabel: 'Open Peer Network',
            actionUrl: 'peers.html',
            time: 'Just now',
            unread: true
          });
          localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
          saveRemoteNotification(connection.id, profile.id, {
            type: 'network',
            icon: '🟢',
            title: `${event.name} is active`,
            desc: `${event.name} ${event.title}.`,
            actionLabel: 'Open Peer Network',
            actionUrl: 'peers.html'
          });
        });
      } catch (e) {
        console.warn('[GyanSetuNetwork] Could not announce activity:', e);
      }
    },

    /**
     * Direct 1-Click Speed Race Arena Invitation
     */
    inviteToArena: function (peerName, roomCode, team, peerId) {
      roomCode = roomCode || 'turbo-dsa-42';
      team = team || 'team1';
      var displayName;
      try { displayName = decodeURIComponent(String(peerName || 'Peer')); } catch (e) { displayName = String(peerName || 'Peer'); }
      var origin = window.location.origin;
      var path = window.location.pathname.replace(/\/[^/]*$/, '/arena.html');
      var link = origin + path + '?room=' + encodeURIComponent(roomCode) + '&team=' + encodeURIComponent(team);

      var self = this;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () {
          self.showToast('🏎️ Race invite copied for ' + (peerName || 'Peer') + '! Share this link: ' + link);
        }).catch(function () {
          self.showToast('🏎️ Invite created: ' + link);
        });
      } else {
        self.showToast('🏎️ Invite created: ' + link);
      }

      GyanSetuNotifications.addNotification({
        type: 'racing',
        icon: '🏎️',
        title: 'Arena Match Invite Dispatched',
        desc: 'Direct invite link generated for ' + displayName + ' into Room: ' + roomCode,
        actionLabel: 'Open Arena 🏎️',
        actionUrl: link
      });
      var current = getCurrentProfile();
      resolveRegisteredPeer(displayName, peerId).then(function (peer) {
        if (!peer || peer.id === current?.id) return;
        return saveRemoteNotification(peer.id, current?.id, {
          type: 'arena_invite',
          icon: '🏎️',
          title: 'Arena match invitation',
          desc: (current?.full_name || 'A campus peer') + ' invited you to join an Arena match.',
          actionLabel: 'Join Arena',
          actionUrl: link
        });
      });
    },

    /**
     * Direct 1-Click Live Collab Room Invitation
     */
    inviteToRoom: function (peerName, roomCode) {
      roomCode = roomCode || 'study-collab-7';
      var displayName;
      try { displayName = decodeURIComponent(String(peerName || 'Peer')); } catch (e) { displayName = String(peerName || 'Peer'); }
      var origin = window.location.origin;
      var path = window.location.pathname.replace(/\/[^/]*$/, '/room.html');
      var link = origin + path + '?room=' + encodeURIComponent(roomCode);

      var self = this;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () {
          self.showToast('⚡ Live Collab invite copied for ' + (peerName || 'Peer') + '! Link: ' + link);
        }).catch(function () {
          self.showToast('⚡ Collab room link: ' + link);
        });
      } else {
        self.showToast('⚡ Collab room link: ' + link);
      }
      var current = getCurrentProfile();
      resolveRegisteredPeer(displayName).then(function (peer) {
        if (!peer || peer.id === current?.id) return;
        return saveRemoteNotification(peer.id, current?.id, {
          type: 'room_invite',
          icon: '💻',
          title: 'Study room invitation',
          desc: (current?.full_name || 'A campus peer') + ' invited you to join a collaborative room.',
          actionLabel: 'Join Room',
          actionUrl: link
        });
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
        var profile = getCurrentProfile();
        var key = notificationKey(profile?.id);
        var raw = localStorage.getItem(key);
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
            localStorage.setItem(key, JSON.stringify(clean));
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
        var profile = getCurrentProfile();
        localStorage.setItem(notificationKey(profile?.id), JSON.stringify(list || []));
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

    syncRemoteNotifications: async function () {
      var profile = getCurrentProfile();
      var sb = getSupabaseClient();
      if (!profile?.id || !sb) return;
      try {
        var result = await sb.from('peer_notifications')
          .select('id, type, icon, title, description, action_label, action_url, secondary_action_label, secondary_action_url, is_read, created_at')
          .eq('recipient_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(30);
        if (result.error || !Array.isArray(result.data)) return;
        var remote = result.data.map(function (item) {
          return {
            id: 'remote_' + item.id,
            type: item.type,
            icon: item.icon,
            title: item.title,
            desc: item.description,
            actionLabel: item.action_label,
            actionUrl: item.action_url,
            secondaryActionLabel: item.secondary_action_label,
            secondaryActionUrl: item.secondary_action_url,
            time: 'Recent',
            unread: !item.is_read
          };
        });
        var local = this.getNotifications().filter(function (item) {
          return !String(item.id || '').startsWith('remote_');
        });
        this.saveNotifications(remote.concat(local).slice(0, 30));
        this.renderDropdown();
      } catch (e) {
        console.warn('[GyanSetuNetwork] Could not sync remote notifications:', e);
      }
    },

    syncRemoteConnections: async function () {
      var profile = getCurrentProfile();
      var sb = getSupabaseClient();
      if (!profile?.id || !sb) return;
      try {
        var result = await sb.from('peer_connections')
          .select('peer_id, peer_name, status, requested_by, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        if (result.error || !Array.isArray(result.data)) return;
        var current = this.getConnections();
        result.data.forEach(function (item) {
          var existing = current.find(function (connection) { return connection.id === item.peer_id; });
          if (existing) {
            existing.status = item.status || existing.status || 'accepted';
            existing.requestedBy = item.requested_by || existing.requestedBy || '';
            if (item.peer_name) existing.name = item.peer_name;
          } else {
            current.push({
              id: item.peer_id,
              name: item.peer_name || 'Campus peer',
              status: item.status || 'accepted',
              requestedBy: item.requested_by || '',
              connectedAt: item.created_at || new Date().toISOString()
            });
          }
        });
        this.saveConnections(current);
      } catch (e) {
        console.warn('[GyanSetuNetwork] Could not sync remote connections:', e);
      }
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
        if (n.secondaryActionLabel && n.secondaryActionUrl) {
          actionHtml += '<button onclick="' + n.secondaryActionUrl.replace('javascript:', '') + '" class="mt-2 ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50 transition">' + n.secondaryActionLabel + '</button>';
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

  setTimeout(function () {
    GyanSetuNetwork.announceActivity({ type: 'presence', title: 'is currently using GyanSetu' });
    GyanSetuNetwork.syncRemoteConnections();
    GyanSetuNotifications.syncRemoteNotifications();
    window.setInterval(function () {
      GyanSetuNotifications.syncRemoteNotifications();
    }, 10000);
  }, 1200);

})(window);
