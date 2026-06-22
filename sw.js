// Gıda Denetim - Service Worker
const CACHE_ADI = 'gida-denetim-v50';

const STATIK_KAYNAKLAR = [
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_ADI).then(function(cache) {
      var istemler = STATIK_KAYNAKLAR.map(function(url) {
        return cache.add(url).catch(function(err) {
          console.warn('SW: Önbelleklenemedi:', url, err.message);
        });
      });
      return Promise.all(istemler);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('googleapis.com') ||
      url.includes('identitytoolkit') ||
      url.includes('firebasestorage')) {
    return;
  }

  // HTML dokümanı (navigasyon) için AĞ-ÖNCELİKLİ: çevrimiçiyken her zaman en güncel
  // kodu indir, böylece güncellemeler telefonda anında görünür. Yalnızca çevrimdışıyken
  // önbellekten servis et. (Eski cache-first davranışı eski app.html'i kalıcı gösteriyordu.)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function(response) {
        if (response && response.status === 200 && response.type !== 'opaque') {
          var klon = response.clone();
          caches.open(CACHE_ADI).then(function(cache) { cache.put(e.request, klon); });
        }
        return response;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('index.html') || caches.match('gida-denetim.html');
        });
      })
    );
    return;
  }

  // Diğer kaynaklar (kütüphaneler, ikonlar vb.) için ÖNBELLEK-ÖNCELİKLİ
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (response && response.status === 200 && response.type !== 'opaque') {
          var klon = response.clone();
          caches.open(CACHE_ADI).then(function(cache) {
            cache.put(e.request, klon);
          });
        }
        return response;
      });
    })
  );
});

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
