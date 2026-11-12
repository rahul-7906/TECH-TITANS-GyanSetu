self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { title: 'GyanSetu notification', body: event.data ? event.data.text() : '' };
  }

  var title = data.title || 'GyanSetu notification';
  var options = {
    body: data.body || data.description || 'You have a new update.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/dashboard.html';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
    for (var i = 0; i < windows.length; i += 1) {
      if ('focus' in windows[i]) {
        windows[i].navigate(targetUrl);
        return windows[i].focus();
      }
    }
    return clients.openWindow(targetUrl);
  }));
});
