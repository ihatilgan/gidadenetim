if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js')
      .then(function(reg) {
        console.log('SW kayıtlı:', reg.scope);
        if (reg.sync) reg.sync.register('sync-denetimler').catch(function(){});
      }).catch(function(err) {
        console.info('SW kaydedilemedi - offline özelliği devre dışı');
      });
  });
  // SW'den yeni sürüm mesajı gelince yenileme bildirimi göster
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function(e) {
      if (e.data && e.data.tip === 'surum-bilgi') {
        if (e.data.surum) {
          try { localStorage.setItem('app_surum', e.data.surum); } catch(_e) {}
          if (typeof presenceGuncelle === 'function') {
            try { presenceGuncelle(); } catch(_e2) {}
          }
        }
        if (typeof window.excelGuncellemeBilgisiYaz === 'function') {
          window.excelGuncellemeBilgisiYaz();
        } else {
          var _sb = document.getElementById('surum-bilgi');
          var _g = '';
          try { _g = localStorage.getItem('isletmeler_guncelleme') || ''; } catch(e) {}
          if (_sb) _sb.textContent = 'Son Excel güncellemesi: ' + (_g || 'Bilinmiyor');
        }
        return;
      }
      if (e.data && e.data.tip === 'yeni-surum-hazir') {
        var mevcut = document.getElementById('__sw_yenile_bildirim');
        if (mevcut) return;
        var div = document.createElement('div');
        div.id = '__sw_yenile_bildirim';
        div.style.cssText = 'position:fixed;bottom:72px;left:50%;transform:translateX(-50%);background:#0d7a4e;color:#fff;padding:10px 18px;border-radius:24px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.3);z-index:99999;cursor:pointer;display:flex;align-items:center;gap:8px;white-space:nowrap;';
        div.innerHTML = '\uD83D\uDD04 Yeni sürüm mevcut &mdash; <u>yenile</u>';
        div.onclick = function() { window.location.reload(); };
        document.body.appendChild(div);
      }
    });
    navigator.serviceWorker.ready.then(function(reg){ if (reg && reg.active) reg.active.postMessage({ tip: 'surum-sor' }); }).catch(function(){});
    navigator.serviceWorker.addEventListener('controllerchange', function(){ if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ tip: 'surum-sor' }); });
  }
}

// Offline durum göstergesi
// SW'den gelen sync isteğini işle
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.tip === 'sync-iste') {
      offlineKuyruguGonder();
    }
  });
}

window.addEventListener('online', function() {
  var el = document.getElementById('sync-durum');
  if (el) el.textContent = '🟢 Bağlandı';
  setTimeout(function(){ if(el) el.textContent=''; }, 3000);
  // Offline kuyruktaki kayıtları Firebase'e gönder
  offlineKuyruguGonder();
});
window.addEventListener('offline', function() {
  var el = document.getElementById('sync-durum');
  if (el) el.textContent = '🔴 Çevrimdışı';
});

// Offline kuyruk yönetimi
// Kuyruk localStorage'da tutulur. İnternet yokken kayıt/silme işlemleri burada bekler.
function offlineSifirla() {
  localStorage.setItem('offline-kuyruk', '[]');
  offlineDurumGuncelle();
}
function offlineKuyruguGetir() {
  try { return JSON.parse(localStorage.getItem('offline-kuyruk') || '[]'); } catch(e) { return []; }
}
function offlineKuyruguKaydet(kuyruk) {
  localStorage.setItem('offline-kuyruk', JSON.stringify(kuyruk || []));
  offlineDurumGuncelle();
}
function offlineNormalize(item) {
  // Eski sürümde kuyruk doğrudan denetim objesi olarak tutulmuş olabilir.
  if (item && !item.type && item.id) return { type: 'save', id: item.id, denetim: item, zaman: item._offlineZaman || new Date().toISOString() };
  return item;
}
function offlineBekleyenSayisi() {
  return offlineKuyruguGetir().length;
}
function offlineDurumGuncelle(mesaj) {
  var el = document.getElementById('sync-durum');
  if (!el) return;
  var sayi = offlineBekleyenSayisi();
  var cevrimdisi = (typeof navigator !== 'undefined' && !navigator.onLine);
  if (mesaj) { el.textContent = mesaj + (sayi ? ' · Bekleyen: ' + sayi : ''); return; }
  if (sayi) el.textContent = (cevrimdisi ? '🔴 Çevrimdışı' : '🟠 Bekleyen') + ': ' + sayi;
  else el.textContent = cevrimdisi ? '🔴 Çevrimdışı' : '';
}
function offlineKuyrugaEkle(denetim) {
  var kuyruk = offlineKuyruguGetir().map(offlineNormalize).filter(Boolean);
  var id = denetim.id;
  // Aynı denetim için daha önce bekleyen silme/kaydetme varsa temizle, son kayıt geçerli olsun.
  kuyruk = kuyruk.filter(function(x){ return String(x.id) !== String(id); });
  denetim._offlineBekliyor = true;
  denetim._offlineZaman = new Date().toISOString();
  kuyruk.push({ type: 'save', id: id, denetim: denetim, zaman: denetim._offlineZaman });
  offlineKuyruguKaydet(kuyruk);
  console.log('Offline kayıt kuyruğa eklendi, toplam:', kuyruk.length);
}
function offlineSilKuyrugaEkle(id) {
  var kuyruk = offlineKuyruguGetir().map(offlineNormalize).filter(Boolean);
  // Kayıt zaten sadece yerelde bekliyorsa, silince sunucuya hiçbir şey göndermeye gerek yok.
  var sadeceYerelKayit = kuyruk.some(function(x){ return String(x.id) === String(id) && x.type === 'save'; });
  kuyruk = kuyruk.filter(function(x){ return String(x.id) !== String(id); });
  if (!sadeceYerelKayit) kuyruk.push({ type: 'delete', id: id, zaman: new Date().toISOString() });
  offlineKuyruguKaydet(kuyruk);
  console.log('Offline silme kuyruğa eklendi, toplam:', kuyruk.length);
}
function offlineDenetimleriUygula(liste) {
  var kuyruk = offlineKuyruguGetir().map(offlineNormalize).filter(Boolean);
  if (!kuyruk.length) return liste || [];
  var map = {};
  (liste || []).forEach(function(d){ map[String(d.id)] = d; });
  kuyruk.forEach(function(item) {
    if (item.type === 'delete') delete map[String(item.id)];
    else if (item.type === 'save' && item.denetim) map[String(item.id)] = Object.assign({}, item.denetim, { _offlineBekliyor: true });
  });
  return Object.keys(map).map(function(k){ return map[k]; }).sort(function(a,b){ return (b.id||0) - (a.id||0); });
}
async function offlineKuyruguGonder() {
  if (!navigator.onLine || !window.mevcutKullanici || typeof firebase === 'undefined') { offlineDurumGuncelle(); return; }
  var kuyruk = offlineKuyruguGetir().map(offlineNormalize).filter(Boolean);
  if (!kuyruk.length) { offlineDurumGuncelle(); return; }
  offlineDurumGuncelle('🔄 Senkronize ediliyor');
  var basariliAnahtarlar = [];
  for (var i = 0; i < kuyruk.length; i++) {
    var item = kuyruk[i];
    try {
      if (item.type === 'delete') {
        await firebase.firestore().collection('denetimler').doc(String(item.id)).delete();
      } else if (item.type === 'save' && item.denetim) {
        var gonderilecek = Object.assign({}, item.denetim);
        delete gonderilecek._offlineBekliyor;
        await firebase.firestore().collection('denetimler').doc(String(item.id)).set(gonderilecek);
      }
      basariliAnahtarlar.push(item.type + ':' + item.id);
    } catch(e) {
      console.warn('Offline sync hatası:', e);
      if (item.type === 'delete' && e && (e.code === 'permission-denied' || /permission|insufficient/i.test(e.message || ''))) {
        offlineDurumGuncelle('⚠️ Denetim silme yetki hatası - Firestore rules güncellenmeli');
      }
    }
  }
  if (basariliAnahtarlar.length) {
    var kalan = kuyruk.filter(function(x){ return basariliAnahtarlar.indexOf(x.type + ':' + x.id) === -1; });
    offlineKuyruguKaydet(kalan);
    denetimler = offlineDenetimleriUygula(denetimler);
    localStorage.setItem('denetimler', JSON.stringify(denetimler));
    if (typeof listeGuncelle === 'function') listeGuncelle();
    if (typeof ozetGuncelle === 'function') ozetGuncelle();
    bildirimGoster('☁️ ' + basariliAnahtarlar.length + ' bekleyen işlem senkronize edildi!');
  } else {
    offlineDurumGuncelle('⚠️ Senkron bekliyor');
  }
}
setTimeout(offlineDurumGuncelle, 500);
// firebaseKaydet'i override et - offline ise kuyruğa ekle
var _orijinalFirebaseKaydet = null;
window.addEventListener('fb-hazir', function() {
  _orijinalFirebaseKaydet = window.firebaseKaydet;
});
