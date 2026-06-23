// iOS PWA için document-level event delegation
(function() {
  var _lastTouch = 0;
  function handleHizliDenetim(e) {
    var el = e.target;
    // data-hizli attribute olan butonu bul (tıklanan veya parent)
    while (el && el !== document) {
      if (el.getAttribute && el.getAttribute('data-hizli-kayit-no') !== null) break;
      el = el.parentNode;
    }
    if (!el || el === document) return;
    var kayitNo = el.getAttribute('data-hizli-kayit-no');
    var isletmeAdi = el.getAttribute('data-hizli-adi');
    if (!isletmeAdi) return;
    e.stopPropagation();
    e.preventDefault();
    // Buton görsel feedback
    el.disabled = true;
    el.textContent = '⏳...';
    // İşletme objesini bul
    var ist = null;
    if (typeof ISLETMELER !== 'undefined') {
      ist = ISLETMELER.find(function(x){ return x.kayitNo === kayitNo; });
    }
    if (!ist && typeof URETIM_YERLERI !== 'undefined') {
      ist = URETIM_YERLERI.find(function(x){ return x.kayitNo === kayitNo; });
    }
    if (!ist && typeof KOY_ISLETMELERI !== 'undefined') {
      Object.keys(KOY_ISLETMELERI).forEach(function(k) {
        if (!ist) ist = KOY_ISLETMELERI[k].find(function(x){ return x.kayitNo === kayitNo; });
      });
    }
    if (!ist) ist = { isletmeAdi: isletmeAdi, kayitNo: kayitNo };
    if (el.getAttribute('data-hizli-modal')) {
      if (typeof modalKapatForce === 'function') modalKapatForce();
    }
    hizliDenetimEkle(ist, el);
  }
  document.addEventListener('touchend', handleHizliDenetim, { passive: false });
  document.addEventListener('click', function(e) {
    var now = Date.now();
    if (now - _lastTouch < 500) return; // touchend zaten işledi
    handleHizliDenetim(e);
  });
  document.addEventListener('touchstart', function(e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.getAttribute && el.getAttribute('data-hizli-kayit-no') !== null) {
        _lastTouch = Date.now();
        break;
      }
      el = el.parentNode;
    }
  }, { passive: true });
})();

function addClickHandler(el, fn) {
  // Artık kullanılmıyor - sadece geriye dönük uyumluluk için
  el.addEventListener('click', function(e){ e.stopPropagation(); fn(e); });
}

var ADMIN_UID = 'sIKGnuwKj7cAMGnPvJg3BF1JWXf1';
window.ADMIN_UID = ADMIN_UID;

// Vergi/TC lookup - Excel importtan kalıcı veri
var VERGI_LOOKUP = (function() {
  try { return JSON.parse(localStorage.getItem('vergi_lookup') || '{}'); } catch(e) { return {}; }
})();

function vergiLookupUygula(liste) {
  if (!liste || !liste.length) return;
  liste.forEach(function(ist) {
    var lu = ist.kayitNo && VERGI_LOOKUP[ist.kayitNo];
    if (!lu) return;
    if (!ist.vergiDairesi && lu.vergiDairesi) ist.vergiDairesi = lu.vergiDairesi;
    if (!ist.vergiNo && lu.vergiNo) ist.vergiNo = lu.vergiNo;
    if (!ist.tcKimlikNo && lu.tcKimlikNo) ist.tcKimlikNo = lu.tcKimlikNo;
  });
}

// --- Vergi/TC lookup Firestore senkronizasyonu ---
// localStorage hızlı yerel önbellek olarak kalır; Firestore kalıcı ana kaynaktır.
// Tüm harita tek dokümanda tutulur: app_meta/vergi_lookup
function _fbAktifMi() {
  return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length;
}

// Belleği + localStorage önbelleğini güncelle, sonra Firestore'a yaz.
var _vergiKaydetZaman = null;
function vergiLookupKaydet() {
  // Yerel önbellek (anında, çevrimdışı için)
  try { localStorage.setItem('vergi_lookup', JSON.stringify(VERGI_LOOKUP)); } catch(e) {}
  // Firestore'a yaz (kısa debounce ile peş peşe yazımları birleştir)
  if (_vergiKaydetZaman) clearTimeout(_vergiKaydetZaman);
  _vergiKaydetZaman = setTimeout(function() {
    if (!_fbAktifMi()) return;
    firebase.firestore().collection('app_meta').doc('vergi_lookup')
      .set({ veri: VERGI_LOOKUP, guncelleme: new Date().toISOString() })
      .catch(function(e){ console.warn('vergi_lookup Firestore kaydı başarısız:', e.message); });
  }, 800);
}

// Açılışta Firestore'dan yükle, bellek + önbelleği güncelle, listelere uygula.
function vergiLookupFirestoreYukle() {
  if (!_fbAktifMi()) return;
  firebase.firestore().collection('app_meta').doc('vergi_lookup').get()
    .then(function(doc) {
      if (!doc.exists) {
        // İlk kez: yerel önbellekte veri varsa Firestore'a taşı (tek seferlik geçiş)
        if (Object.keys(VERGI_LOOKUP).length) vergiLookupKaydet();
        return;
      }
      var uzak = (doc.data() || {}).veri || {};
      // Uzak veri ile belleği birleştir (uzaktaki değerler önceliklidir)
      Object.assign(VERGI_LOOKUP, uzak);
      try { localStorage.setItem('vergi_lookup', JSON.stringify(VERGI_LOOKUP)); } catch(e) {}
      // Yüklenmiş listelere yeniden uygula
      try { if (typeof ISLETMELER !== 'undefined') vergiLookupUygula(ISLETMELER); } catch(e) {}
      try { if (typeof URETIM_YERLERI !== 'undefined') vergiLookupUygula(URETIM_YERLERI); } catch(e) {}
      try { if (typeof KOY_ISLETMELERI !== 'undefined') Object.keys(KOY_ISLETMELERI).forEach(function(k){ vergiLookupUygula(KOY_ISLETMELERI[k]); }); } catch(e) {}
    })
    .catch(function(e){ console.warn('vergi_lookup Firestore okuması başarısız:', e.message); });
}
if (window._fbHazir) { vergiLookupFirestoreYukle(); }
else { window.addEventListener('fb-hazir', vergiLookupFirestoreYukle); }
function initFirebase() {
  if (typeof firebase === 'undefined') {
    setTimeout(initFirebase, 100);
    return;
  }
  var firebaseConfig = {
    apiKey: "AIzaSyAbN0778vLKrgP3iwarBIyeV0gr8O8uBDc",
    authDomain: "gidadenetim-d829c.firebaseapp.com",
    projectId: "gidadenetim-d829c",
    storageBucket: "gidadenetim-d829c.firebasestorage.app",
    messagingSenderId: "609097711322",
    appId: "1:609097711322:web:6bdad208f76b919a27efe3"
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  window._fbHazir = true;
  window.dispatchEvent(new Event('fb-hazir'));
}
initFirebase();
