// Gıda Denetim - Service Worker
const CACHE_ADI = 'gida-denetim-v1';
const STATIK_KAYNAKLAR = [
  './',
  './gida-denetim.html',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
];

// Kurulum: statik kaynakları önbelleğe al
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_ADI).then(function(cache) {
      return cache.addAll(STATIK_KAYNAKLAR).catch(function(err) {
        console.warn('SW: Bazı kaynaklar önbelleklenemedi:', err);
      });
    })
  );
  self.skipWaiting();
});

// Aktivasyon: eski cache'leri temizle
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_ADI; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first (statik), network-first (Firebase API)
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Firebase Firestore/Auth istekleri - her zaman ağdan al
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('googleapis.com') ||
      url.includes('identitytoolkit')) {
    return; // Tarayıcının default davranışına bırak
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Başarılı yanıtları önbellekle
        if (response && response.status === 200 && response.type !== 'opaque') {
          var klon = response.clone();
          caches.open(CACHE_ADI).then(function(cache) {
            cache.put(e.request, klon);
          });
        }
        return response;
      }).catch(function() {
        // Ağ yok ve cache'de yok - offline sayfası
        if (e.request.mode === 'navigate') {
          return caches.match('./gida-denetim.html');
        }
      });
    })
  );
});

// Background Sync: internet gelince kuyruktakileri gönder
self.addEventListener('sync', function(e) {
  if (e.tag === 'sync-denetimler') {
    e.waitUntil(
      self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ tip: 'sync-iste' });
        });
      })
    );
  }
});
