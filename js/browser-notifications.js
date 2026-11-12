(function (window) {
  'use strict';

  var PUBLIC_KEY = window.GYANSETU_VAPID_PUBLIC_KEY || '';

  function getClient() {
    if (window.sbClient) return window.sbClient;
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON) return null;
    try { return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON); } catch (error) { return null; }
  }

  function profileId() {
    try {
      var profile = JSON.parse(localStorage.getItem('gyansetu_active_profile') || 'null');
      return profile && profile.id ? profile.id : '';
    } catch (error) {
      return '';
    }
  }

  function toUint8Array(base64) {
    var padding = '='.repeat((4 - base64.length % 4) % 4);
    var raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    var output = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
    return output;
  }

  async function enable() {
    if (!('Notification' in window)) throw new Error('This browser does not support notifications.');
    if (!window.isSecureContext) throw new Error('Notifications require HTTPS or localhost.');
    var permission = await window.Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was not granted.');
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { permission: permission, subscribed: false, reason: 'push-unsupported' };
    }

    var registration = await navigator.serviceWorker.register('/service-worker.js');
    if (!PUBLIC_KEY) {
      return { permission: permission, subscribed: false, reason: 'missing-vapid-key' };
    }

    var subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8Array(PUBLIC_KEY)
    });
    var client = getClient();
    var userId = profileId();
    if (!client || !userId) throw new Error('Sign in before enabling notifications.');
    var json = subscription.toJSON();
    var result = await client.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: json.endpoint,
      subscription: json,
      updated_at: new Date().toISOString()
    }, { onConflict: 'endpoint' });
    if (result.error) throw result.error;
    return { permission: permission, subscribed: true };
  }

  function updateButton(button) {
    if (!button || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      button.textContent = 'Browser notifications enabled';
      button.disabled = true;
    } else if (Notification.permission === 'denied') {
      button.textContent = 'Notifications blocked in browser settings';
    }
  }

  window.GyanSetuBrowserNotifications = {
    enable: enable,
    updateButton: updateButton
  };

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('enable-browser-notifications');
    if (!button) return;
    updateButton(button);
    button.addEventListener('click', async function () {
      button.disabled = true;
      button.textContent = 'Enabling…';
      try {
        var result = await enable();
        if (result.reason === 'missing-vapid-key') {
          button.textContent = 'Permission enabled; push setup pending';
          button.title = 'Add the VAPID public key to enable notifications while the app is closed.';
        } else if (result.reason === 'push-unsupported') {
          button.textContent = 'Browser push is not supported';
        } else {
          button.textContent = 'Browser notifications enabled';
        }
      } catch (error) {
        button.disabled = false;
        button.textContent = error.message || 'Enable browser notifications';
      }
    });
  });
})(window);
