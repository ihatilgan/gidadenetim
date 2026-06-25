// ==========================================================
// ÇOK EKİPLİ SORUMLULUK SİSTEMİ (Ekip Yönetimi)
// Her ekip = {id, ad, mahalleler[], kasabalar[], uretimKategorileri[]}
// Satış faaliyet listesi (45 tür) TÜM EKİPLERDE ORTAK, ekipten ekibe değişmez.
// Motor aynı kalır; aktif ekip değişince kural global'leri (TUM_MAHALLELER,
// SORUMLU_KASABALAR, seciliKategoriler) yerinde güncellenir.
// ==========================================================

// Merkez mahalle evreni (veri setinden çıkarıldı, editörde seçenek listesi olarak kullanılır)
var MERKEZ_MAHALLE_MASTER = ["Akçın","Akmescit","Ali İhsan Paşa","Aliçetinkaya","Ataköy","Barbaros","Battalgazi","Bedrik","Beyazıt","Burmalı","Camikebir","Cumhuriyet","Çakır","Çavuşbaş","Dairecep","Demirçevre","Derviş Paşa","Dörtyol","Dumlupınar","Erenler","Ertuğrulgazi","Esentepe","Eşrefpaşa","Fakıpaşa","Fatih","Gazi","Güvenevler","Hacıabdurrahman","Hacı Mustafa","Hacı Nuh","Hamidiye","Hasan Karaağaç","Hattat Karahisar","Hoca Ahmet Yesevi","İsmail","İstiklal","Kanlıca","Karaman","Karşıyaka","Kasımpaşa","Kayadibi","Kışlacık","Kocatepe","Küçük Çobanlı","Mareşal Fevzi Çakmak","Marulcu","Mecidiye","Mevlana","Nazmi Saatçi","Olucak","Organize Sanayi Bölgesi","Orhangazi","Osmangazi","Örnekevler","Sadıkbey","Sahipata","Selçuklu","Sinanpaşa","Sümer","Tacı Ahmet","Umurbey","Veyselkarani","Yarenler","Yenice","Yeşilyurt","Yunus Emre","Zafer"];

// Köy/kasaba evreni (editörde seçenek listesi)
var KOY_MASTER = ["Anıtkaya","Bayatçık","Bayramgazi","Belkaracaören","Beyyazı","Bostanlı","Burhaniye","Çavdarlı","Çayırbağ","Çıkrık","Değirmenayvalı","Değirmendere","Erkmen","Fethibey","Gebeceler","Halımoru","Işıklar","Karaaslan","Kızıldağ","Kozluca","Köprülü","Küçükkalecik","Nuribey","Salar","Saraydüzü","Sarık","Susuz","Sülümenli","Sülün"];

// Manuel eklenen başlıklar (localStorage + Firebase)
var MAHALLE_EKSTRA = [];
var KOY_EKSTRA = [];
var KAT_EKSTRA = [];
try { MAHALLE_EKSTRA = JSON.parse(localStorage.getItem('ekstra_mahalleler')||'[]'); } catch(e){}
try { KOY_EKSTRA = JSON.parse(localStorage.getItem('ekstra_koyler')||'[]'); } catch(e){}
try { KAT_EKSTRA = JSON.parse(localStorage.getItem('ekstra_kategoriler')||'[]'); } catch(e){}

var EKIPLER = [];
var aktifEkipId = null;
var TUM_EKIPLER_ID = '__tum__';
var EKIP_URETIM_KATEGORILERI = [];  // aktif ekibin sorumlu olduğu üretim kategori id'leri
var DEV_MODU = false;  // dev sürümünde true yapılır: ekip ayarları _dev'e yazılır, canlı veriye dokunulmaz
var AKTIF_EKIP_KEY = DEV_MODU ? 'aktif_ekip_id_dev' : 'aktif_ekip_id';
var EKIPLER_KEY = DEV_MODU ? 'ekipler_v1_dev' : 'ekipler_v1';
var EKIPLER_DOC = DEV_MODU ? 'ekipler_dev' : 'ekipler';

// ===== İşletme-bazlı MANUEL BAŞLIK ATAMA + YOKSAY (kalıcı, cihazlar arası) =====
var MANUEL_BASLIK_KEY = DEV_MODU ? 'manuel_baslik_v1_dev' : 'manuel_baslik_v1';
var YOKSAY_KEY = DEV_MODU ? 'yoksay_v1_dev' : 'yoksay_v1';
var ATAMA_DOC = DEV_MODU ? 'atama_overrides_dev' : 'atama_overrides';
var manuelBaslik = {};
try { manuelBaslik = JSON.parse(localStorage.getItem(MANUEL_BASLIK_KEY)||'null') || {}; } catch(e){ manuelBaslik={}; }
var yoksayListesi = [];
try { yoksayListesi = JSON.parse(localStorage.getItem(YOKSAY_KEY)||'null') || []; } catch(e){ yoksayListesi=[]; }
var MANUEL_EKIP_KEY = DEV_MODU ? 'manuel_ekip_v1_dev' : 'manuel_ekip_v1';
var manuelEkip = {};
try { manuelEkip = JSON.parse(localStorage.getItem(MANUEL_EKIP_KEY)||'null') || {}; } catch(e){ manuelEkip={}; }
// İlk kurulum tohumu (kullanıcı kararları)
(function(){
  var mbTohum = { 'TR-03-K-003106': {tip:'mahalle', key:'Dörtyol'} };
  Object.keys(mbTohum).forEach(function(k){ if(!manuelBaslik[k]) manuelBaslik[k]=mbTohum[k]; });
  ['Göksu Kardeşler-Fatma GÖKSU','Özuğur Et ve Gıda Sanayi Tic.ltd.Şti.'].forEach(function(k){ if(yoksayListesi.indexOf(k)<0) yoksayListesi.push(k); });
})();
function isletmeAnahtari(i){ return (i && (i.kayitNo || i.isletmeAdi)) || ''; }
var _atamaKayitZaman=null;
function _atamaFirestoreKaydet(){
  if(_atamaKayitZaman) clearTimeout(_atamaKayitZaman);
  _atamaKayitZaman=setTimeout(function(){
    if(typeof firebase==='undefined'||!firebase.apps||!firebase.apps.length) return;
    if(typeof mevcutKullanici==='undefined'||!mevcutKullanici) return;
    firebase.firestore().collection('app_meta').doc(ATAMA_DOC)
      .set({manuelBaslik:manuelBaslik, manuelEkip:manuelEkip, yoksay:yoksayListesi, guncelleme:new Date().toISOString()})
      .catch(function(e){ console.warn('atama overrides kaydı başarısız:', e.message); });
  }, 800);
}
function manuelBaslikKaydet(){ try{ localStorage.setItem(MANUEL_BASLIK_KEY, JSON.stringify(manuelBaslik)); }catch(e){} try{ _ekipSayiCache=null; }catch(e){} _atamaFirestoreKaydet(); }
function yoksayKaydet(){ try{ localStorage.setItem(YOKSAY_KEY, JSON.stringify(yoksayListesi)); }catch(e){} try{ _ekipSayiCache=null; }catch(e){} _atamaFirestoreKaydet(); }
function manuelEkipKaydet(){ try{ localStorage.setItem(MANUEL_EKIP_KEY, JSON.stringify(manuelEkip)); }catch(e){} try{ _ekipSayiCache=null; }catch(e){} _atamaFirestoreKaydet(); }
function atamaOverridesFirestoreYukle(){
  if(typeof firebase==='undefined'||!firebase.apps||!firebase.apps.length) return;
  firebase.firestore().collection('app_meta').doc(ATAMA_DOC).get()
    .then(function(doc){
      if(!doc.exists){ manuelBaslikKaydet(); return; }
      var d=doc.data()||{};
      if(d.manuelBaslik && typeof d.manuelBaslik==='object'){ manuelBaslik=d.manuelBaslik; try{localStorage.setItem(MANUEL_BASLIK_KEY,JSON.stringify(manuelBaslik));}catch(e){} }
      if(Array.isArray(d.yoksay)){ yoksayListesi=d.yoksay; try{localStorage.setItem(YOKSAY_KEY,JSON.stringify(yoksayListesi));}catch(e){} }
      if(d.manuelEkip && typeof d.manuelEkip==='object'){ manuelEkip=d.manuelEkip; try{localStorage.setItem(MANUEL_EKIP_KEY,JSON.stringify(manuelEkip));}catch(e){} }
      try{ _ekipSayiCache=null; }catch(e){}
      // Admin için: geçerli ekibin işletmesi yoksa ilk dolu ekibe geç
      if(isAdmin && EKIPLER.length > 1 && typeof ekipIsletmeSayisi==='function' && typeof aktifEkibeGec==='function'){
        var _aktEk=ekipBul(aktifEkipId)||EKIPLER[0];
        if(_aktEk && ekipIsletmeSayisi(_aktEk)===0){
          var _ilkDolu=null; for(var _ii=0;_ii<EKIPLER.length;_ii++){ if(ekipIsletmeSayisi(EKIPLER[_ii])>0){_ilkDolu=EKIPLER[_ii];break;} }
          if(_ilkDolu) aktifEkibeGec(_ilkDolu.id, false);
        }
      }
      if(typeof ekipSeciciDoldur==='function') try{ekipSeciciDoldur();}catch(e){}
      if(typeof ozetGuncelle==='function') try{ozetGuncelle();}catch(e){}
    })
    .catch(function(e){ console.warn('atama overrides okuması başarısız:', e.message); });
}
if (window._fbHazir) { atamaOverridesFirestoreYukle(); } else { window.addEventListener('fb-hazir', atamaOverridesFirestoreYukle); }

// Editörde gösterilecek mahalle seçenekleri: master + tüm ekiplerde geçen + mevcut aktif
function tumMahalleSecenekleri() {
  var set = {};
  (MERKEZ_MAHALLE_MASTER||[]).forEach(function(m){ set[m] = true; });
  (EKIPLER||[]).forEach(function(e){ (e.mahalleler||[]).forEach(function(m){ set[m]=true; }); });
  (typeof TUM_MAHALLELER !== 'undefined' ? TUM_MAHALLELER : []).forEach(function(m){ set[m]=true; });
  return Object.keys(set).sort(function(a,b){ return a.localeCompare(b,'tr'); });
}
function tumKoySecenekleri() {
  var set = {};
  (typeof KOY_MASTER !== 'undefined' ? KOY_MASTER : []).forEach(function(k){ set[k]=true; });
  (EKIPLER||[]).forEach(function(e){ (e.kasabalar||[]).forEach(function(k){ set[k]=true; }); });
  return Object.keys(set).sort(function(a,b){ return a.localeCompare(b,'tr'); });
}

function ekiplerYukle() {
  try {
    var raw = localStorage.getItem(EKIPLER_KEY);
    if (raw) { var l = JSON.parse(raw); if (Array.isArray(l)) EKIPLER = l; }
  } catch(e){}
  try { aktifEkipId = localStorage.getItem(AKTIF_EKIP_KEY) || null; } catch(e){}
}

var _ekipKaydetZaman = null;
function ekiplerKaydet() {
  try { localStorage.setItem(EKIPLER_KEY, JSON.stringify(EKIPLER)); } catch(e){}
  if (_ekipKaydetZaman) clearTimeout(_ekipKaydetZaman);
  _ekipKaydetZaman = setTimeout(function(){
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
    if (typeof mevcutKullanici === 'undefined' || !mevcutKullanici) return;
    firebase.firestore().collection('app_meta').doc(EKIPLER_DOC)
      .set({ ekipler: EKIPLER, guncelleme: new Date().toISOString() })
      .catch(function(e){ console.warn('ekipler Firestore kaydı başarısız:', e.message); });
  }, 800);
}

function ekiplerFirestoreYukle() {
  if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
  firebase.firestore().collection('app_meta').doc(EKIPLER_DOC).get()
    .then(function(doc){
      if (!doc.exists) { if (EKIPLER.length) ekiplerKaydet(); return; }
      var uzak = (doc.data()||{}).ekipler;
      if (Array.isArray(uzak) && uzak.length) {
        EKIPLER = uzak;
        ekipKategoriMigrasyon();
        try { localStorage.setItem(EKIPLER_KEY, JSON.stringify(EKIPLER)); } catch(e){}
        // Profil fetch localStorage'a daha güncel bir ekipId yazmış olabilir — onu oku
        try { var _lsEkip = localStorage.getItem(AKTIF_EKIP_KEY); if (_lsEkip) aktifEkipId = _lsEkip; } catch(e){}
        // Aktif ekip kuralını tazele
        if (aktifEkipId !== TUM_EKIPLER_ID) {
          var ek = ekipBul(aktifEkipId) || EKIPLER[0];
          if (ek) { aktifEkipId = ek.id; ekipKurallariUygula(ek); }
        }
        // Ekip listesi değişti — sayım önbelleğini iptal et ki yeni dağılım hesaplansın
        try { _ekipSayiCache = null; _ekipSayiLen = -1; } catch(e){}
        // Bekleyen ekip geçişi varsa şimdi uygula (profil fetch EKIPLER'den önce geldiyse)
        if (window._pendingEkipGecisi && !isAdmin) {
          var _pendEk = ekipBul(window._pendingEkipGecisi);
          if (_pendEk) { aktifEkipId = _pendEk.id; ekipKurallariUygula(_pendEk); window._pendingEkipGecisi = null; }
        }
        if (typeof ekipSeciciDoldur === 'function') { try { ekipSeciciDoldur(); } catch(e){} }
        if (typeof ozetGuncelle === 'function') { try { ozetGuncelle(); } catch(e){} }
        var _seEl = document.getElementById('sayfa-ekipler');
        if (typeof ekipYonetimiGoster === 'function' && _seEl && _seEl.classList.contains('aktif')) {
          try { ekipYonetimiGoster(); } catch(e){}
        }
        var _skEl = document.getElementById('sayfa-kullanicilar');
        if (typeof kullaniciListesiYukle === 'function' && _skEl && _skEl.classList.contains('aktif')) {
          try { kullaniciListesiYukle(); } catch(e){}
        }
        var _sbEl = document.getElementById('sayfa-basliklar');
        if (typeof basliklarGoster === 'function' && _sbEl && _sbEl.classList.contains('aktif')) {
          try { basliklarGoster(); } catch(e){}
        }
      }
    })
    .catch(function(e){ console.warn('ekipler Firestore okuması başarısız:', e.message); });
}

function ekipBul(id) {
  if (id === TUM_EKIPLER_ID) return null;
  if (!id) return null;
  for (var i=0;i<EKIPLER.length;i++){ if (EKIPLER[i].id === id) return EKIPLER[i]; }
  return null;
}
function adminTumEkipSecili() { return !!(typeof isAdmin !== 'undefined' && isAdmin && aktifEkipId === TUM_EKIPLER_ID); }
function tumEkipGoruntulemeModu() { return adminTumEkipSecili(); }
function aktifEkip() { if (adminTumEkipSecili()) return null; return ekipBul(aktifEkipId) || EKIPLER[0] || null; }

// İlk kurulum: Ekip 1 = mevcut (gömülü) kurallar
function ekip1Tohumla() {
  if (EKIPLER.length) return;
  EKIPLER = [{
    id: 'ekip1',
    ad: 'Ekip 1',
    mahalleler: (typeof TUM_MAHALLELER !== 'undefined' ? TUM_MAHALLELER.slice() : []),
    kasabalar: (typeof SORUMLU_KASABALAR !== 'undefined' ? SORUMLU_KASABALAR.slice() : []),
    uretimKategorileri: (typeof TUM_URETIM_KATEGORILER !== 'undefined' ? TUM_URETIM_KATEGORILER.map(function(k){ return k.id; }) : [])
  }];
  aktifEkipId = 'ekip1';
  try { localStorage.setItem(AKTIF_EKIP_KEY, aktifEkipId); } catch(e){}
  ekiplerKaydet();
}

// Bir ekibin kurallarını motora uygula (global'leri yerinde değiştir)
function ekipKurallariUygula(ekip) {
  if (!ekip) return;
  // Mahalleler
  if (typeof TUM_MAHALLELER !== 'undefined') {
    TUM_MAHALLELER.length = 0;
    (ekip.mahalleler||[]).forEach(function(m){ TUM_MAHALLELER.push(m); });
  }
  // Mahalle kalıplarını yeniden kur (bilinen kalıp varsa koru, yoksa 'X Mah')
  if (typeof MAHALLE_KALIPLARI !== 'undefined') {
    var eski = {}; for (var key in MAHALLE_KALIPLARI) eski[key] = MAHALLE_KALIPLARI[key];
    for (var k in MAHALLE_KALIPLARI) delete MAHALLE_KALIPLARI[k];
    (ekip.mahalleler||[]).forEach(function(m){ MAHALLE_KALIPLARI[m] = eski[m] || (m + ' Mah'); });
  }
  if (typeof SORUMLU_MAHALLELER !== 'undefined') { SORUMLU_MAHALLELER.length = 0; (ekip.mahalleler||[]).forEach(function(m){ SORUMLU_MAHALLELER.push(m); }); }
  // Kasabalar
  if (typeof SORUMLU_KASABALAR !== 'undefined') {
    SORUMLU_KASABALAR.length = 0;
    // KOY_MASTER'da olmayan kasabalar (silinmiş veya mahalleye taşınmış) otomatik atlanır
    (ekip.kasabalar||[]).forEach(function(m){ if((typeof KOY_MASTER==='undefined')||KOY_MASTER.indexOf(m)>=0) SORUMLU_KASABALAR.push(m); });
  }
  // KOY_ISLETMELERI'ni yeni SORUMLU_KASABALAR'a göre yeniden doldur
  try { if (typeof koyIsletmeleriDoldur === 'function' && typeof ISLETMELER !== 'undefined' && ISLETMELER.length) koyIsletmeleriDoldur(); } catch(e){}
  // Satış faaliyet listesi TÜM EKİPLERDE ORTAK — burada değiştirilmez.
  // Üretim kategorileri: ekibin sorumlu olduğu kategoriler
  EKIP_URETIM_KATEGORILERI = (ekip.uretimKategorileri||[]).slice();
  if (typeof seciliKategoriler !== 'undefined') {
    seciliKategoriler.length = 0;
    (ekip.uretimKategorileri||[]).forEach(function(id){ seciliKategoriler.push(id); });
  }
  aktifEkipId = ekip.id;
  try { localStorage.setItem(AKTIF_EKIP_KEY, aktifEkipId); } catch(e){}
  try {
    var _hea=document.getElementById('header-ekip-adi');
    if(_hea){
      _hea.textContent=ekip.ad||ekip.id;
      _hea.style.display='';
      _hea.dataset.personel=JSON.stringify(ekip.personel||[]);
    }
  }catch(e){}
}

// Aktif ekibi değiştir + ekranı tazele (admin ekip geçişi / giriş)
function aktifEkibeGec(id, yenidenCiz) {
  if (id === TUM_EKIPLER_ID) {
    if (!(typeof isAdmin !== 'undefined' && isAdmin)) return;
    aktifEkipId = TUM_EKIPLER_ID;
    try { localStorage.setItem(AKTIF_EKIP_KEY, aktifEkipId); } catch(e){}
    try {
      var _heaAll=document.getElementById('header-ekip-adi');
      if(_heaAll){
        _heaAll.textContent='Tüm Ekipler';
        _heaAll.style.display='';
        _heaAll.dataset.personel='[]';
      }
    }catch(e){}
    if(typeof riskCacheTemizle==='function') riskCacheTemizle();
    if (yenidenCiz !== false) {
      try { if (typeof ozetGuncelle === 'function') ozetGuncelle(); } catch(e){}
      try {
        var _sorAll = document.getElementById('sayfa-sorumluluklarim');
        if (typeof sorumluluklarimGoster === 'function' && _sorAll && _sorAll.classList.contains('aktif')) sorumluluklarimGoster();
      } catch(e){}
    }
    return;
  }
  var ek = ekipBul(id);
  if (!ek) return;
  if(typeof riskCacheTemizle==='function') riskCacheTemizle();
  ekipKurallariUygula(ek);
  try { if (typeof planliEkipDenetimlerYukle === 'function') planliEkipDenetimlerYukle(); } catch(e){}
  // Gömülü sorumluluk tohumunu bu ekibe göre tekrar hesapla (varsa)
  try { if (typeof sorumluTohumHesapla === 'function') { /* tohum aktif kurala göre yeniden üretilir */ } } catch(e){}
  if (yenidenCiz !== false) {
    try { if (typeof ozetGuncelle === 'function') ozetGuncelle(); } catch(e){}
    try {
      var _sorEl = document.getElementById('sayfa-sorumluluklarim');
      if (typeof sorumluluklarimGoster === 'function' && _sorEl && _sorEl.classList.contains('aktif')) sorumluluklarimGoster();
    } catch(e){}
    try {
      var _ekipEl = document.getElementById('sayfa-ekipler');
      if (typeof ekipYonetimiGoster === 'function' && _ekipEl && _ekipEl.classList.contains('aktif')) ekipYonetimiGoster();
    } catch(e){}
  }
}

// Eski kategori id'lerini (gida_temas vb.) yeni taksonomiye taşı: geçersiz id'leri olan ekibi "tüm üretim"e çevir
function ekipKategoriMigrasyon() {
  if (typeof TUM_URETIM_KATEGORILER === 'undefined') return;
  var gecerli = TUM_URETIM_KATEGORILER.map(function(k){ return k.id; });
  var degisti = false;
  EKIPLER.forEach(function(e){
    var orj = (e.uretimKategorileri||[]);
    var filt = orj.filter(function(id){ return gecerli.indexOf(id) >= 0; });
    if (orj.length && !filt.length) { e.uretimKategorileri = gecerli.slice(); degisti = true; }
    else if (filt.length !== orj.length) { e.uretimKategorileri = filt; degisti = true; }
  });
  if (degisti && typeof ekiplerKaydet === 'function') ekiplerKaydet();
}

// Başlatma: yerelden yükle, yoksa Ekip 1'i tohumla, aktif ekibi uygula
function ekipSistemiBaslat() {
  ekiplerYukle();
  if (!EKIPLER.length) ekip1Tohumla();
  ekipKategoriMigrasyon();
  if (aktifEkipId === TUM_EKIPLER_ID) return;
  var ek = ekipBul(aktifEkipId) || EKIPLER[0];
  if (ek) { aktifEkipId = ek.id; ekipKurallariUygula(ek); }
}
document.addEventListener('DOMContentLoaded', ekipSistemiBaslat);
if (DEV_MODU) document.addEventListener('DOMContentLoaded', function(){
  var b=document.createElement('div');
  b.textContent='🧪 GELİŞTİRME';
  b.style.cssText='position:fixed;top:8px;right:8px;background:#b45309;color:#fff;font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;z-index:99999;box-shadow:0 1px 4px rgba(0,0,0,.3);letter-spacing:.5px;';
  document.body.appendChild(b);
});
ekipSistemiBaslat(); // localStorage'dan ekipleri hemen yükle (Firebase'den önce)
if (window._fbHazir) { ekiplerFirestoreYukle(); } else { window.addEventListener('fb-hazir', ekiplerFirestoreYukle); }

window.EKIPLER = EKIPLER;
window.aktifEkip = aktifEkip;
window.aktifEkibeGec = aktifEkibeGec;
window.adminTumEkipSecili = adminTumEkipSecili;
window.tumEkipGoruntulemeModu = tumEkipGoruntulemeModu;
window.tumMahalleSecenekleri = tumMahalleSecenekleri;
window.ekiplerKaydet = ekiplerKaydet;
