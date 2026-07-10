// Gıda Denetim - Service Worker
const CACHE_ADI = 'gida-denetim-v151';

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

  // HTML dokümanı (navigasyon) için STALE-WHILE-REVALIDATE: önbellekteki sürümü ANINDA
  // göster (siyah ekran / bekleme yok, auth hemen geri yüklenir), aynı anda ağdan güncel
  // sürümü çekip önbelleği tazele (sonraki açılış güncel olur). İlk açılışta önbellek
  // yoksa ağı bekler. (Saf ağ-öncelikli, yavaş bağlantıda açılışta siyah ekran yapıyordu.)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE_ADI).then(function(cache) {
        // index.html her açılışta app.html'e ?v=zamandamgası ile yönlendirir.
        // Sorgu dizesi anahtara dahil edilirse önbellek hiç isabet etmez: SWR
        // devreye girmez, "yeni sürüm" bildirimi hiç çıkmaz ve her zaman
        // damgası önbellekte ayrı bir kopya olarak birikirdi. Bu yüzden hem
        // eşleştirme hem yazma sorgusuz URL anahtarıyla yapılır.
        var anahtar = e.request.url.split('?')[0];
        return cache.match(anahtar).then(function(cached) {
          var agdan = fetch(e.request).then(function(response) {
            if (response && response.status === 200 && response.type !== 'opaque') {
              if (cached) {
                // İçerik GERÇEKTEN değiştiyse önbelleği güncelle ve haber ver.
                // (Aksi halde yeniledikçe sürekli "yeni sürüm" uyarısı çıkıyordu.)
                var karsKlon = response.clone();   // karşılaştırma için
                var cacheKlon = response.clone();  // önbelleğe yazmak için
                Promise.all([cached.clone().text(), karsKlon.text()]).then(function(metinler) {
                  if (metinler[0] !== metinler[1]) {
                    cache.put(anahtar, cacheKlon);
                    self.clients.matchAll({ type: 'window' }).then(function(clients) {
                      clients.forEach(function(client) {
                        client.postMessage({ tip: 'yeni-surum-hazir' });
                      });
                    });
                  }
                }).catch(function() {});
              } else {
                cache.put(anahtar, response.clone());
              }
            }
            return response;
          }).catch(function() {
            if (cached) return cached;
            return cache.match('index.html').then(function(idx) {
              return idx || cache.match('gida-denetim.html');
            });
          });
          return cached || agdan;
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

self.addEventListener('message', function(e) {
  if (e.data && e.data.tip === 'surum-sor') {
    var surum = CACHE_ADI.replace('gida-denetim-', '');
    if (e.source && e.source.postMessage) {
      e.source.postMessage({ tip: 'surum-bilgi', surum: surum });
    } else {
      self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ tip: 'surum-bilgi', surum: surum });
        });
      });
    }
  }
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
