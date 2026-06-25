// ===== TÜM BAŞLIKLAR (başlık → ekip atama) =====
var _basliklarBostaFiltre = false;
var _basliklarBosTip = false;
var _baslikEklemeAcik = {}; // {uretim:false, koy:false, mahalle:false}
var _baslikEklemeDeger = {};

function ekstraBasliklarKaydet() {
  try { localStorage.setItem('ekstra_mahalleler', JSON.stringify(MAHALLE_EKSTRA)); } catch(e){}
  try { localStorage.setItem('ekstra_koyler', JSON.stringify(KOY_EKSTRA)); } catch(e){}
  try { localStorage.setItem('ekstra_kategoriler', JSON.stringify(KAT_EKSTRA)); } catch(e){}
  if (typeof firebase!=='undefined' && typeof mevcutKullanici!=='undefined' && mevcutKullanici) {
    firebase.firestore().collection('app_meta').doc('ekstra_basliklar')
      .set({mahalleler:MAHALLE_EKSTRA, koyler:KOY_EKSTRA, kategoriler:KAT_EKSTRA, guncelleme:new Date().toISOString()})
      .catch(function(e){ console.warn('ekstra başlık kayıt hatası:', e&&e.message); });
  }
}
function ekstraBasliklarYukle() {
  if (typeof firebase==='undefined' || !mevcutKullanici) return;
  firebase.firestore().collection('app_meta').doc('ekstra_basliklar').get()
    .then(function(doc){
      if (!doc.exists) return;
      var d = doc.data()||{};
      var degisti = false;
      var fbSyncGerekli = false;
      if (Array.isArray(d.mahalleler)) {
        d.mahalleler.forEach(function(m){
          if(MAHALLE_EKSTRA.indexOf(m)<0){ MAHALLE_EKSTRA.push(m); degisti=true; }
          if(MERKEZ_MAHALLE_MASTER.indexOf(m)<0) MERKEZ_MAHALLE_MASTER.push(m);
        });
        if(degisti){ try{localStorage.setItem('ekstra_mahalleler',JSON.stringify(MAHALLE_EKSTRA));}catch(e){} }
        if(MAHALLE_EKSTRA.length > d.mahalleler.length) fbSyncGerekli=true;
      }
      if (Array.isArray(d.koyler)) {
        var koyDegisti=false;
        d.koyler.forEach(function(k){
          if(KOY_EKSTRA.indexOf(k)<0){ KOY_EKSTRA.push(k); koyDegisti=true; degisti=true; }
          if(KOY_MASTER.indexOf(k)<0) KOY_MASTER.push(k);
        });
        if(koyDegisti){ try{localStorage.setItem('ekstra_koyler',JSON.stringify(KOY_EKSTRA));}catch(e){} }
        if(KOY_EKSTRA.length > d.koyler.length) fbSyncGerekli=true;
      }
      if (Array.isArray(d.kategoriler)) {
        var katDegisti=false;
        d.kategoriler.forEach(function(k){
          if(!KAT_EKSTRA.find(function(x){return x.id===k.id;})){
            KAT_EKSTRA.push(k); katDegisti=true; degisti=true;
          }
          if(!TUM_URETIM_KATEGORILER.find(function(x){return x.id===k.id;}))
            TUM_URETIM_KATEGORILER.push({id:k.id,label:k.label,anahtar:[],ekstra:true});
        });
        if(katDegisti){ try{localStorage.setItem('ekstra_kategoriler',JSON.stringify(KAT_EKSTRA));}catch(e){} }
        if(KAT_EKSTRA.length > d.kategoriler.length) fbSyncGerekli=true;
      }
      if(fbSyncGerekli && typeof ekstraBasliklarKaydet==='function') ekstraBasliklarKaydet();
      if (degisti && typeof basliklarGoster==='function' && document.getElementById('basliklar-root')) basliklarGoster();
    })
    .catch(function(e){ console.warn('ekstra başlık yükleme hatası:', e&&e.message); });
}
if (window._fbHazir) { ekstraBasliklarYukle(); } else { window.addEventListener('fb-hazir', ekstraBasliklarYukle); }

function baslikEkle(tip) {
  if (!isAdmin) { bildirimGoster('Bu işlemi sadece admin yapabilir.', 'hata'); return; }
  if (typeof tumEkipGoruntulemeModu==='function' && tumEkipGoruntulemeModu()) { bildirimGoster('Tüm ekipler görünümünde başlık düzenlenemez. Önce bir ekip seçin.', 'uyari'); return; }
  var deger = (_baslikEklemeDeger[tip]||'').trim();
  if (!deger) { bildirimGoster('Lütfen bir ad girin.', 'hata'); return; }
  if (tip==='mahalle') {
    if (MERKEZ_MAHALLE_MASTER.indexOf(deger)>=0) { bildirimGoster('Bu mahalle zaten mevcut.', 'hata'); return; }
    MERKEZ_MAHALLE_MASTER.push(deger);
    MAHALLE_EKSTRA.push(deger);
  } else if (tip==='koy') {
    if (KOY_MASTER.indexOf(deger)>=0) { bildirimGoster('Bu köy/kasaba zaten mevcut.', 'hata'); return; }
    KOY_MASTER.push(deger);
    KOY_EKSTRA.push(deger);
  } else if (tip==='uretim') {
    var yeniId = 'x_' + Date.now();
    if (TUM_URETIM_KATEGORILER.find(function(x){return x.label===deger;})) { bildirimGoster('Bu kategori zaten mevcut.', 'hata'); return; }
    TUM_URETIM_KATEGORILER.push({id:yeniId, label:deger, anahtar:[], ekstra:true});
    KAT_EKSTRA.push({id:yeniId, label:deger});
  }
  _baslikEklemeDeger[tip] = '';
  _baslikEklemeAcik[tip] = false;
  try { _ekipSayiCache = null; } catch(e){}
  ekstraBasliklarKaydet();
  basliklarGoster();
  bildirimGoster('➕ Başlık eklendi.');
}
function baslikEkstraSil(tip, deger) {
  if (!isAdmin) { bildirimGoster('Bu işlemi sadece admin yapabilir.', 'hata'); return; }
  if (typeof tumEkipGoruntulemeModu==='function' && tumEkipGoruntulemeModu()) { bildirimGoster('Tüm ekipler görünümünde başlık düzenlenemez. Önce bir ekip seçin.', 'uyari'); return; }
  if (tip==='mahalle') {
    MAHALLE_EKSTRA = MAHALLE_EKSTRA.filter(function(m){return m!==deger;});
    var idx = MERKEZ_MAHALLE_MASTER.indexOf(deger); if(idx>=0) MERKEZ_MAHALLE_MASTER.splice(idx,1);
  } else if (tip==='koy') {
    KOY_EKSTRA = KOY_EKSTRA.filter(function(k){return k!==deger;});
    var idx = KOY_MASTER.indexOf(deger); if(idx>=0) KOY_MASTER.splice(idx,1);
  } else if (tip==='uretim') {
    KAT_EKSTRA = KAT_EKSTRA.filter(function(k){return k.id!==deger;});
    var idx2 = TUM_URETIM_KATEGORILER.findIndex(function(x){return x.id===deger;}); if(idx2>=0) TUM_URETIM_KATEGORILER.splice(idx2,1);
  }
  try { _ekipSayiCache = null; } catch(e){}
  ekstraBasliklarKaydet();
  basliklarGoster();
  bildirimGoster('🗑️ Başlık silindi.');
}
window.baslikEkle = baslikEkle;
window.baslikEkstraSil = baslikEkstraSil;
var _basliklarAcik = {uretim:false, koy:false, mahalle:false};
var _basliklarArama = '';

function tumBasliklarListe() {
  var arr = [];
  (typeof TUM_URETIM_KATEGORILER!=='undefined'?TUM_URETIM_KATEGORILER:[]).forEach(function(k){ arr.push({tip:'uretim', ad:k.label, key:k.id}); });
  (typeof KOY_MASTER!=='undefined'?KOY_MASTER:[]).slice().sort(function(a,b){return a.localeCompare(b,'tr');}).forEach(function(k){ arr.push({tip:'koy', ad:k, key:k}); });
  (typeof MERKEZ_MAHALLE_MASTER!=='undefined'?MERKEZ_MAHALLE_MASTER:[]).slice().sort(function(a,b){return a.localeCompare(b,'tr');}).forEach(function(m){ arr.push({tip:'mahalle', ad:m, key:m}); });
  return arr;
}
function _baslikListe(e, tip) {
  if (tip==='mahalle') return (e.mahalleler = e.mahalleler||[]);
  if (tip==='koy') return (e.kasabalar = e.kasabalar||[]);
  return (e.uretimKategorileri = e.uretimKategorileri||[]);
}
function baslikEkibiBul(b) {
  for (var i=0;i<EKIPLER.length;i++){
    if (_baslikListe(EKIPLER[i], b.tip).indexOf(b.key) >= 0) return EKIPLER[i];
  }
  return null;
}
function baslikSayi(b, sayac) {
  if (b.tip==='mahalle') return (sayac.mah[b.key]||0);
  if (b.tip==='koy') return (sayac.koy[b.key]||0);
  return (sayac.kat[b.key]||0);
}
function baslikAd(tip, key) {
  if (tip==='uretim') { var k=(TUM_URETIM_KATEGORILER||[]).filter(function(x){return x.id===key;})[0]; return k?k.label:key; }
  return key;
}
function baslikEkibeAta(tip, key, ekipId) {
  if (typeof tumEkipGoruntulemeModu==='function' && tumEkipGoruntulemeModu()) { bildirimGoster('Tüm ekipler görünümünde sorumluluk düzenlenemez. Önce bir ekip seçin.', 'uyari'); return; }
  var eskiEkip = null, yeniEkip = null;
  EKIPLER.forEach(function(e){
    var l = _baslikListe(e, tip);
    var idx = l.indexOf(key);
    if (idx>=0) { eskiEkip = e; l.splice(idx,1); }
  });
  if (ekipId) {
    yeniEkip = ekipBul(ekipId);
    if (yeniEkip) { var l2=_baslikListe(yeniEkip,tip); if (l2.indexOf(key)<0) l2.push(key); }
  }
  if (typeof ekiplerKaydet==='function') ekiplerKaydet();
  try { var ek=aktifEkip(); if(ek && typeof ekipKurallariUygula==='function') ekipKurallariUygula(ek); } catch(e){}
  try { _ekipSayiCache=null; } catch(e){}
  var ad = baslikAd(tip,key);
  var msj;
  if (yeniEkip && eskiEkip && yeniEkip.id!==eskiEkip.id) msj = ad + ' — ' + (eskiEkip.ad||eskiEkip.id) + "'ten alınıp " + (yeniEkip.ad||yeniEkip.id) + "'e verildi";
  else if (yeniEkip) msj = ad + ' — ' + (yeniEkip.ad||yeniEkip.id) + "'e atandı";
  else if (eskiEkip) msj = ad + ' — ' + (eskiEkip.ad||eskiEkip.id) + "'ten alındı (boşta)";
  else msj = ad + ' güncellendi';
  if(yeniEkip && typeof ekipKullanicilarinaBildir==='function'){
    var _s=(typeof ekipSecenekSayilari==='function')?ekipSecenekSayilari():{mah:{},koy:{},kat:{}};
    var _say = tip==='mahalle'?(_s.mah[key]||0):tip==='koy'?(_s.koy[key]||0):(_s.kat[key]||0);
    ekipKullanicilarinaBildir(yeniEkip.id, '➕ Yeni sorumluluk: '+ad+' ('+_say+' işletme)');
  }
  if(typeof degisiklikEkle==='function') degisiklikEkle(msj);
  basliklarGoster();
  if (typeof bildirimGoster==='function') bildirimGoster(msj,'basari');
}

function baslikAtaAc(tip, key) {
  var ad = baslikAd(tip,key);
  var mevcut = baslikEkibiBul({tip:tip,key:key});
  var ov = document.getElementById('baslik-ata-overlay');
  if (ov) ov.remove();
  ov = document.createElement('div');
  ov.id='baslik-ata-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:100000;display:flex;align-items:flex-end;justify-content:center;';
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
  var box=document.createElement('div');
  box.style.cssText='background:#fff;width:100%;max-width:480px;border-radius:16px 16px 0 0;padding:18px;max-height:75vh;overflow:auto;';
  var h='<div style="font-weight:700;font-size:16px;margin-bottom:4px;">'+_ekipEsc(ad)+'</div>';
  h+='<div style="font-size:12px;color:var(--gri);margin-bottom:14px;">Bu başlığı bir ekibe ata. Bir başlık aynı anda yalnızca tek ekipte olabilir.</div>';
  box.innerHTML=h;
  EKIPLER.forEach(function(e){
    var b=document.createElement('button');
    var aktif = mevcut && mevcut.id===e.id;
    b.className='btn '+(aktif?'btn-yesil':'btn-gri');
    b.style.cssText='width:100%;margin-bottom:8px;text-align:left;';
    b.textContent=(aktif?'✓ ':'')+(e.ad||e.id);
    b.onclick=function(){ baslikEkibeAta(tip,key,e.id); var o=document.getElementById('baslik-ata-overlay'); if(o)o.remove(); };
    box.appendChild(b);
  });
  var bb=document.createElement('button');
  bb.className='btn'; bb.style.cssText='width:100%;margin-bottom:8px;background:#fdecea;color:#c0392b;';
  bb.textContent='Boşta bırak (ekipten kaldır)';
  bb.onclick=function(){ baslikEkibeAta(tip,key,null); var o=document.getElementById('baslik-ata-overlay'); if(o)o.remove(); };
  box.appendChild(bb);
  var ic=document.createElement('button');
  ic.className='btn btn-gri'; ic.style.cssText='width:100%;'; ic.textContent='İptal';
  ic.onclick=function(){ var o=document.getElementById('baslik-ata-overlay'); if(o)o.remove(); };
  box.appendChild(ic);
  ov.appendChild(box);
  document.body.appendChild(ov);
}

function ekipSorumlulukSayimi(eid) {
  var c = (typeof ekipSecenekSayilari === 'function') ? ekipSecenekSayilari() : null;
  var arr = (c && c.ekipUyeleri && c.ekipUyeleri[eid]) ? c.ekipUyeleri[eid] : [];
  var out = {uretim:0, mahalle:0, koy:0, toplam:0};
  arr.forEach(function(rec){
    var tip = rec && rec.b && rec.b.tip;
    if (tip && out.hasOwnProperty(tip)) { out[tip]++; out.toplam++; }
  });
  return out;
}
function baslikliAmaSorumluluktaEksikListe() {
  var eksik = [];
  (typeof ISLETMELER !== 'undefined' ? ISLETMELER : []).forEach(function(i){
    if (typeof kayitHaricMi === 'function' && kayitHaricMi(i)) return;
    var b = (typeof isletmeBaslikBelirle === 'function') ? isletmeBaslikBelirle(i) : null;
    if (!b) return;
    var eid = (typeof isletmeSorumluEkipId === 'function') ? isletmeSorumluEkipId(i) : null;
    if (!eid) eksik.push({i:i, b:b});
  });
  return eksik;
}

function basliklarGoster() {
  var root=document.getElementById('basliklar-root'); if(!root) return;
  var sayac = (typeof ekipSecenekSayilari==='function')?ekipSecenekSayilari():{mah:{},koy:{},kat:{}};
  var liste = tumBasliklarListe();
  var ara = _basliklarArama.trim().toLocaleLowerCase('tr');
  var bostaSay = liste.filter(function(b){ return !baslikEkibiBul(b); }).length;
  var html='';
  function _sumObj(o){ var t=0; for(var k in o){ if(o.hasOwnProperty(k)) t+=(o[k]||0); } return t; }
  var _uTop=_sumObj(sayac.kat), _kTop=_sumObj(sayac.koy), _mTop=_sumObj(sayac.mah), _genelTop=_uTop+_kTop+_mTop;
  html+='<div style="font-weight:700;font-size:15px;margin-bottom:10px;">🗂️ Tüm Başlıklar <span style="color:var(--gri);font-weight:500;">('+_genelTop+' işletme)</span></div>';
  html+='<div style="display:flex;gap:8px;margin-bottom:8px;">';
  html+='<button class="btn '+(_basliklarBostaFiltre?'btn-turuncu':'btn-gri')+'" style="flex:1;" onclick="_basliklarBostaFiltre=!_basliklarBostaFiltre;basliklarGoster();">'+(_basliklarBostaFiltre?'✓ ':'')+'Sadece boşta ('+bostaSay+')</button>';
  html+='<button class="btn '+(_basliklarBosTip?'btn-turuncu':'btn-gri')+'" style="flex:1;" onclick="_basliklarBosTip=!_basliklarBosTip;basliklarGoster();">'+(_basliklarBosTip?'✓ ':'')+'İşletmesi olmayanı gizle</button>';
  html+='</div>';
  html+='<input type="text" placeholder="🔍 Başlık ara..." value="'+_ekipEsc(_basliklarArama)+'" oninput="_basliklarArama=this.value;basliklarGoster();" style="width:100%;margin-bottom:6px;">';

  // Sınıflandırılamayan (hiçbir başlığa girmeyen) işletmeler — yeni Excel sonrası burada görünür
  var _bostaIsl=[], _eskiKatIsl=[];
  var kats3=(typeof TUM_URETIM_KATEGORILER!=='undefined')?TUM_URETIM_KATEGORILER:[];
  (typeof ISLETMELER!=='undefined'?ISLETMELER:[]).forEach(function(i){
    if(typeof merkezDisindaMi==='function' && merkezDisindaMi(i)) return;
    var _an=(i.kayitNo||i.isletmeAdi)||'';
    if(typeof yoksayListesi!=='undefined' && yoksayListesi.indexOf(_an)>=0) return;
    if(typeof kayitHaricMi==='function' && kayitHaricMi(i)) return;
    // Sahipsiz üretim kategorisi ataması — kategori silinmiş/ID değişmiş
    var mb2=(typeof manuelBaslik!=='undefined')?manuelBaslik[_an]:null;
    if(mb2 && mb2.tip==='uretim' && !kats3.find(function(x){return x.id===mb2.key;})){
      _eskiKatIsl.push(i); return;
    }
    if(!isletmeBaslikBelirle(i)) _bostaIsl.push(i);
  });
  if(_eskiKatIsl.length){
    html+='<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:10px;padding:11px 13px;margin-bottom:12px;">';
    html+='<div style="font-weight:600;color:#856404;font-size:13px;cursor:pointer;" onclick="var e=document.getElementById(\'eski-kat-liste\');if(e)e.style.display=(e.style.display===\'none\'?\'block\':\'none\');">🔶 '+_eskiKatIsl.length+' işletmenin kategorisi silinmiş/değişmiş — yeniden ata</div>';
    html+='<div style="font-size:11px;color:#856404;margin-bottom:4px;">Bu işletmeler eski bir üretim kategorisine atanmıştı. Tıklayıp yeni başlık seçin.</div>';
    html+='<div id="eski-kat-liste" style="margin-top:8px;">';
    _eskiKatIsl.forEach(function(i){
      var _ae=_ekipEsc((i.kayitNo||i.isletmeAdi)||'').replace(/'/g,"\\'");
      var mb2=manuelBaslik[isletmeAnahtari(i)]||{};
      html+='<div onclick="isletmeBaslikDegistirAc(\''+_ae+'\')" style="padding:8px 10px;border:1px solid #ffc107;border-radius:8px;margin-bottom:6px;cursor:pointer;background:#fff;">';
      html+='<div style="font-size:13px;">'+_ekipEsc(i.isletmeAdi||_ae)+'</div>';
      html+='<div style="font-size:11px;color:#856404;">Eski ID: '+_ekipEsc(mb2.key||'')+'</div></div>';
    });
    html+='</div></div>';
  }
  if(_bostaIsl.length){
    html+='<div style="background:#fdecea;border:1px solid #f5c6cb;border-radius:10px;padding:11px 13px;margin-bottom:12px;">';
    html+='<div style="font-weight:600;color:#c0392b;font-size:13px;cursor:pointer;" onclick="var e=document.getElementById(\'bosta-isl-liste\');if(e)e.style.display=(e.style.display===\'none\'?\'block\':\'none\');">⚠️ '+_bostaIsl.length+' işletme hiçbir başlığa girmiyor — göster/gizle</div>';
    html+='<div id="bosta-isl-liste" style="display:none;margin-top:8px;">';
    _bostaIsl.slice(0,150).forEach(function(i){
      var _ae=_ekipEsc((i.kayitNo||i.isletmeAdi)||'').replace(/'/g,"\\'");
      html+='<div onclick="isletmeBaslikDegistirAc(\''+_ae+'\')" style="padding:8px 10px;border:1px solid #f5c6cb;border-radius:8px;margin-bottom:6px;cursor:pointer;background:#fff;"><div style="font-size:13px;">'+_ekipEsc(i.isletmeAdi||_ae)+'</div><div style="font-size:11px;color:var(--gri);">'+_ekipEsc((i.faaliyetAlani||'').split(',')[0])+'</div></div>';
    });
    html+='</div></div>';
  }

  var gruplar = [
    {tip:'uretim', ad:'🏭 Üretim Kategorileri', konu:(typeof TUM_URETIM_KATEGORILER!=='undefined'?TUM_URETIM_KATEGORILER.length:0), konuEt:'konu', isl:_uTop},
    {tip:'koy', ad:'🌾 Köyler / Kasabalar', konu:(typeof KOY_MASTER!=='undefined'?KOY_MASTER.length:0), konuEt:'köy/kasaba', isl:_kTop},
    {tip:'mahalle', ad:'🏘️ Mahalleler', konu:(typeof MERKEZ_MAHALLE_MASTER!=='undefined'?MERKEZ_MAHALLE_MASTER.length:0), konuEt:'mahalle', isl:_mTop}
  ];
  gruplar.forEach(function(g){
    var satirlar = liste.filter(function(b){ return b.tip===g.tip; });
    if (ara) satirlar = satirlar.filter(function(b){ return b.ad.toLocaleLowerCase('tr').indexOf(ara)>=0; });
    if (_basliklarBostaFiltre) satirlar = satirlar.filter(function(b){ return !baslikEkibiBul(b); });
    if (_basliklarBosTip) satirlar = satirlar.filter(function(b){ return baslikSayi(b,sayac)>0; });
    var acik = _basliklarAcik[g.tip] || !!ara;
    html+='<div onclick="_basliklarAcik[\''+g.tip+'\']=!_basliklarAcik[\''+g.tip+'\'];if(!_basliklarAcik[\''+g.tip+'\']){_baslikEklemeAcik[\''+g.tip+'\']=false;}basliklarGoster();" style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:700;font-size:14px;margin:16px 0 8px;cursor:pointer;background:var(--gri-acik);border-radius:8px;padding:10px 12px;">';
    html+='<span>'+(acik?'▼ ':'▶ ')+g.ad+'</span>';
    html+='<span style="color:var(--gri);font-weight:400;font-size:11px;text-align:right;">('+g.konu+' '+g.konuEt+' ve '+g.isl+' işletme)</span>';
    html+='</div>';
    if(!acik) return;
    var isAdminF = (typeof isAdmin!=='undefined'&&isAdmin);
    satirlar.forEach(function(b){
      var ek = baslikEkibiBul(b);
      var sayi = baslikSayi(b, sayac);
      var rozet = ek
        ? '<span style="background:#e8f0fe;color:#1a56c4;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;white-space:nowrap;">'+_ekipEsc(ek.ad||ek.id)+'</span>'
        : '<span style="background:#fdecea;color:#c0392b;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;">Boşta</span>';
      var keyAttr = _ekipEsc(b.key).replace(/'/g,"\\'");
      var ekstraMi = (b.tip==='uretim') ? !!(KAT_EKSTRA.find(function(k){return k.id===b.key;})) : (b.tip==='mahalle' ? MAHALLE_EKSTRA.indexOf(b.key)>=0 : KOY_EKSTRA.indexOf(b.key)>=0);
      html+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;">';
      html+='<div onclick="baslikAtaAc(\''+b.tip+'\',\''+keyAttr+'\')" style="flex:1;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;border:1px solid var(--sinir);border-radius:10px;cursor:pointer;background:#fff;">';
      html+='<div style="min-width:0;"><div style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_ekipEsc(b.ad)+(ekstraMi?' <span style="font-size:10px;color:var(--gri);background:#f0f0f0;border-radius:4px;padding:1px 5px;">manuel</span>':'')+'</div><div style="font-size:11px;color:var(--gri);margin-top:2px;">'+sayi+' işletme</div></div>';
      html+='<div style="flex-shrink:0;">'+rozet+'</div>';
      html+='</div>';
      if (isAdminF && ekstraMi) {
        html+='<button onclick="event.stopPropagation();baslikEkstraSil(\''+b.tip+'\',\''+keyAttr+'\')" title="Sil" style="padding:8px 10px;border:1px solid #f5c6cb;border-radius:8px;background:#fdecea;color:#c0392b;cursor:pointer;font-size:13px;flex-shrink:0;">🗑️</button>';
      }
      html+='</div>';
    });
    if (isAdminF) {
      if (_baslikEklemeAcik[g.tip]) {
        var ph = g.tip==='uretim' ? 'Kategori adı...' : (g.tip==='mahalle' ? 'Mahalle adı...' : 'Köy/kasaba adı...');
        html+='<div style="margin-top:6px;display:flex;gap:6px;">';
        html+='<input id="baslik-ekle-input-'+g.tip+'" type="text" placeholder="'+ph+'" value="'+_ekipEsc(_baslikEklemeDeger[g.tip]||'')+'" oninput="_baslikEklemeDeger[\''+g.tip+'\']=this.value" onkeydown="if(event.key===\'Enter\')baslikEkle(\''+g.tip+'\')" style="flex:1;padding:7px 10px;border:1px solid var(--sinir);border-radius:7px;font-size:13px;" />';
        html+='<button onclick="baslikEkle(\''+g.tip+'\')" style="padding:7px 12px;background:var(--yesil);color:#fff;border:none;border-radius:7px;font-size:13px;cursor:pointer;font-weight:600;">Ekle</button>';
        html+='<button onclick="_baslikEklemeAcik[\''+g.tip+'\']=false;basliklarGoster();" style="padding:7px 10px;background:none;border:1px solid var(--sinir);border-radius:7px;font-size:13px;cursor:pointer;color:var(--gri);">✕</button>';
        html+='</div>';
      } else {
        html+='<button onclick="_baslikEklemeAcik[\''+g.tip+'\']=true;_baslikEklemeDeger[\''+g.tip+'\']=\'\';basliklarGoster();setTimeout(function(){var el=document.getElementById(\'baslik-ekle-input-'+g.tip+'\');if(el)el.focus();},50);" style="width:100%;padding:7px;border:1px dashed var(--sinir);border-radius:7px;background:none;font-size:13px;color:var(--gri);cursor:pointer;margin-top:6px;">+ Yeni Ekle</button>';
      }
    }
  });

  // ── Doğrulama Raporu ──────────────────────────────────────────────────────
  var sayacEkip = {};
  var sumEkip = 0;
  (typeof EKIPLER !== 'undefined' ? EKIPLER : []).forEach(function(e){ var es=ekipSorumlulukSayimi(e.id); sayacEkip[e.id]=es.toplam; sumEkip += es.toplam; });
  var eksikSorumluluklar = baslikliAmaSorumluluktaEksikListe();
  var bostaBaslikli = eksikSorumluluklar.length;
  var toplamlarEsit = (_genelTop === sumEkip);

  // Toplam kapsam içi işletme (kayitHaricMi dışı, merkezDışı dahil)
  var kapsamIci = 0;
  (typeof ISLETMELER !== 'undefined' ? ISLETMELER : []).forEach(function(i){
    if(typeof kayitHaricMi==='function' && kayitHaricMi(i)) return;
    kapsamIci++;
  });
  var kapsamDisi = kapsamIci - _genelTop - _bostaIsl.length;

  html += '<div style="margin-top:24px;border-top:2px solid var(--sinir);padding-top:16px;">';
  html += '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">📊 İşletme Sayısı Doğrulaması</div>';

  // Ekip dağılım tablosu
  html += '<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:10px;">';
  html += '<tr style="background:var(--gri-acik);"><th style="text-align:left;padding:6px 8px;border-radius:6px 0 0 0;">Ekip</th><th style="text-align:right;padding:6px 8px;border-radius:0 6px 0 0;">İşletme</th></tr>';
  (typeof EKIPLER !== 'undefined' ? EKIPLER : []).forEach(function(e){
    var es = ekipSorumlulukSayimi(e.id);
    var c = es.toplam;
    html += '<tr><td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;">'+_ekipEsc(e.ad||e.id)+'</td><td style="text-align:right;padding:5px 8px;font-weight:600;border-bottom:1px solid #f0f0f0;">'+c+' <span style="font-weight:400;color:var(--gri);font-size:10px;">('+es.uretim+'/'+es.mahalle+'/'+es.koy+')</span></td></tr>';
  });
  if(bostaBaslikli > 0){
    html += '<tr style="background:#fef6e4;"><td style="padding:5px 8px;color:#856404;">🟡 Boşta başlıklı</td><td style="text-align:right;padding:5px 8px;font-weight:600;color:#856404;">'+bostaBaslikli+'</td></tr>';
  }
  html += '<tr style="border-top:2px solid var(--sinir);font-weight:700;background:#f8f9fa;"><td style="padding:7px 8px;">Tüm başlıklar toplamı</td><td style="text-align:right;padding:7px 8px;">'+_genelTop+'</td></tr>';
  html += '<tr style="font-weight:700;"><td style="padding:7px 8px;color:var(--gri);font-size:11px;">↳ Ekip toplamı</td><td style="text-align:right;padding:7px 8px;font-size:11px;color:var(--gri);">'+sumEkip+'</td></tr>';
  html += '</table>';

  // Sonuç kutusu
  var okRenk='#d4edda', okYaz='#155724', warnRenk='#fdecea', warnYaz='#c0392b';
  if(toplamlarEsit){
    html += '<div style="background:'+okRenk+';color:'+okYaz+';padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:8px;">✅ Tüm başlıklı işletmeler ekiplere dağıtılmış ('+_genelTop+'/'+_genelTop+')</div>';
  } else {
    var fark = _genelTop - sumEkip;
    html += '<div style="background:'+warnRenk+';color:'+warnYaz+';padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:8px;">⚠️ Tüm başlıklar toplamı ('+_genelTop+') ile ekip toplamı ('+sumEkip+') eşleşmiyor. Fark: '+fark+'.</div>';
    if(eksikSorumluluklar.length){
      html += '<div style="font-weight:600;font-size:13px;margin:8px 0 6px;color:#c0392b;">Sorumluluklarım listelerinde eksik görünen işletmeler ('+eksikSorumluluklar.length+')</div>';
      html += '<div style="border:1px solid #f5c6cb;border-radius:8px;margin-bottom:8px;max-height:280px;overflow:auto;background:#fff;">';
      eksikSorumluluklar.forEach(function(o){
        var i=o.i, b=o.b;
        var idx = ISLETMELER.indexOf(i);
        html += '<div onclick="isletmeDetayModal('+idx+')" style="padding:8px 10px;border-bottom:1px solid #f8d7da;cursor:pointer;">';
        html += '<div style="font-size:13px;font-weight:500;">'+_ekipEsc(i.isletmeAdi||'(isimsiz)')+'</div>';
        html += '<div style="font-size:11px;color:var(--gri);">'+_ekipEsc(i.kayitNo||'')+' · '+_ekipEsc(baslikAd(b.tip,b.key))+'</div>';
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div style="font-size:12px;color:var(--gri);background:#fff;border:1px solid var(--sinir);border-radius:8px;padding:9px 11px;margin-bottom:8px;">Başlığı olup ekibi bulunmayan işletme listesi boş. Fark devam ediyorsa aynı işletme birden fazla ekipte sayılıyor olabilir veya ekip listesi henüz yeniden yüklenmemiştir.</div>';
    }
  }

  // Başlıksız
  if(_bostaIsl.length > 0){
    html += '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:10px 12px;margin-bottom:6px;">';
    html += '<div style="font-weight:600;color:#856404;font-size:13px;margin-bottom:8px;">⚠️ '+_bostaIsl.length+' işletme hiçbir başlığa girmiyor — tıklayıp başlık atayın</div>';
    _bostaIsl.forEach(function(i){
      var idx = ISLETMELER.indexOf(i);
      var _ae=_ekipEsc((i.kayitNo||i.isletmeAdi)||'').replace(/'/g,"\\'");
      html += '<div onclick="isletmeDetayModal('+idx+')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:1px solid #ffc107;border-radius:8px;margin-bottom:5px;cursor:pointer;background:#fff;">';
      html += '<div><div style="font-size:13px;font-weight:500;">'+_ekipEsc(i.isletmeAdi||_ae)+'</div>';
      html += '<div style="font-size:11px;color:var(--gri);margin-top:2px;">'+_ekipEsc(i.kayitNo||'')+(i.faaliyetAlani?' · '+_ekipEsc((i.faaliyetAlani||'').split(',')[0]):'')+'</div></div>';
      html += '<span style="font-size:11px;color:#856404;white-space:nowrap;">Detay →</span>';
      html += '</div>';
    });
    html += '</div>';
  } else {
    html += '<div style="background:'+okRenk+';color:'+okYaz+';padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:6px;">✅ Tüm işletmeler bir başlığa eşleşiyor.</div>';
  }

  // Genel sayım özeti
  html += '<div style="font-size:11px;color:var(--gri);padding:6px 2px;">';
  html += 'Kapsam içi toplam: <b>'+kapsamIci+'</b> &nbsp;|&nbsp; ';
  html += 'Başlıklı: <b>'+_genelTop+'</b> &nbsp;|&nbsp; ';
  html += 'Başlıksız: <b>'+_bostaIsl.length+'</b>';
  if(kapsamDisi > 0) html += ' &nbsp;|&nbsp; Merkez dışı/diğer: <b>'+kapsamDisi+'</b>';
  html += '</div>';
  html += '</div>';
  // ─────────────────────────────────────────────────────────────────────────

  root.innerHTML=html;
}
window.basliklarGoster = basliklarGoster;
window.baslikAtaAc = baslikAtaAc;
