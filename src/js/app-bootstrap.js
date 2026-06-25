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

// Vergi/TC bilgileri artık kişisel veri riski nedeniyle kullanılmaz ve saklanmaz.
var VERGI_LOOKUP = {};

function vergiLookupUygula(liste) {
  if (!liste || !liste.length) return;
  liste.forEach(function(ist) {
    if (!ist) return;
    delete ist.vergiDairesi;
    delete ist.vergiNo;
    delete ist.tcKimlikNo;
  });
}

function _fbAktifMi() {
  return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length;
}

var _vergiKaydetZaman = null;
function vergiLookupKaydet() {
  VERGI_LOOKUP = {};
  try { localStorage.removeItem('vergi_lookup'); } catch(e) {}
  if (_vergiKaydetZaman) clearTimeout(_vergiKaydetZaman);
  _vergiKaydetZaman = setTimeout(function() {
    if (!_fbAktifMi()) return;
    firebase.firestore().collection('app_meta').doc('vergi_lookup')
      .delete()
      .catch(function(e){ console.warn('vergi_lookup Firestore temizliği başarısız:', e.message); });
  }, 800);
}

function vergiLookupFirestoreYukle() {
  vergiLookupKaydet();
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
