/* Firebase Cloud Messaging - arka plan (uygulama kapalı/sekme pasif) bildirimleri.
   Bu dosya site kökünde durmalı: .../gidadenetim/firebase-messaging-sw.js
   App service worker'ı (sw.js) ile ayrı çalışır, çakışmaz. */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAbN0778vLKrgP3iwarBIyeV0gr8O8uBDc",
  authDomain: "gidadenetim-d829c.firebaseapp.com",
  projectId: "gidadenetim-d829c",
  storageBucket: "gidadenetim-d829c.firebasestorage.app",
  messagingSenderId: "609097711322",
  appId: "1:609097711322:web:6bdad208f76b919a27efe3"
});

var messaging = firebase.messaging();

var ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%231a5132'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18' fill='white'%3E%F0%9F%9B%A1%3C/text%3E%3C/svg%3E";

messaging.onBackgroundMessage(function(payload) {
  var n = payload.notification || payload.data || {};
  var baslik = n.title || 'Gıda Denetim';
  var secenekler = {
    body: n.body || '',
    icon: ICON,
    badge: ICON,
    tag: (payload.data && payload.data.tip) || 'gida-denetim',
    data: payload.data || {}
  };
  return self.registration.showNotification(baslik, secenekler);
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cl) {
      for (var i = 0; i < cl.length; i++) {
        if (cl[i].url.indexOf('/gidadenetim/') >= 0 && 'focus' in cl[i]) return cl[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('app.html');
    })
  );
});
