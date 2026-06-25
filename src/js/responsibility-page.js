function haricTutulanlariKaydet() {
  localStorage.setItem('haricTutulanlar', JSON.stringify(haricTutulanlar));
  bildirimGoster('💾 Sorumluluk listesi güncellendi.');
}


function _sorumluTabStilinGuncelle() {
  ['tab-uretim','tab-satis','tab-koy','tab-haric'].forEach(function(id) {
    var el = document.getElementById(id);
    var t = id.replace('tab-', '');
    if (el) el.className = (aktifSorumluTablar.indexOf(t) >= 0) ? 'btn btn-yesil' : 'btn btn-gri';
  });
}
function sorumluTabDegistir(tab) {
  _manuelEklemeGrubu = null;
  _manuelEklemeArama = '';
  if (tab === 'haric') {
    aktifSorumluTablar = ['haric'];
  } else if (tab) {
    aktifSorumluTablar = aktifSorumluTablar.filter(function(t){ return t !== 'haric'; });
    var idx = aktifSorumluTablar.indexOf(tab);
    if (idx >= 0) {
      aktifSorumluTablar.splice(idx, 1);
    } else {
      aktifSorumluTablar.push(tab);
    }
  }
  _sorumluTabStilinGuncelle();
  sorumluluklarimGoster();
}

var _sorumlulukRiskFiltre = false;
var _sorumlulukAcik = {};
var _manuelEklemeGrubu = null;
var _manuelEklemeArama = '';
var _sonGruplar = {};
function _baslikAdGoster(b){
  if(!b) return '';
  if(b.tip==='uretim'){ var k=(typeof TUM_URETIM_KATEGORILER!=='undefined'?TUM_URETIM_KATEGORILER:[]).filter(function(x){return x.id===b.key;})[0]; return k?k.label:b.key; }
  return b.key;
}
function _sorumluTabSayiGuncelle(s){
  var u=document.getElementById('tab-uretim'); if(u) u.textContent='🏭 Üretim ('+(s.uretim||0)+')';
  var sa=document.getElementById('tab-satis'); if(sa) sa.textContent='🏪 Satış ('+(s.mahalle||0)+')';
  var k=document.getElementById('tab-koy'); if(k) k.textContent='🏘️ Köy ('+(s.koy||0)+')';
}
function sorumluluklarimGoster() {
  var liste = document.getElementById('sorumluluk-liste');
  if (!liste) return;
  ['panel-uretim','panel-satis','panel-koy'].forEach(function(id){ var e=document.getElementById(id); if(e) e.style.display='none'; });
  var aramaDiv=document.getElementById('sorumluluk-arama-div');
  var sonucDiv=document.getElementById('sorumluluk-sonuc-div');
  var ph=document.getElementById('panel-haric');
  var isAdminF=(typeof isAdmin!=='undefined'&&isAdmin);
  var th=document.getElementById('tab-haric'); if(th) th.style.display = isAdminF ? '' : 'none';

  _sorumluTabStilinGuncelle();
  if (aktifSorumluTablar.indexOf('haric') >= 0){
    if(!isAdminF){ aktifSorumluTablar=['uretim']; _sorumluTabStilinGuncelle(); }
    else {
      if(aramaDiv) aramaDiv.style.display='none';
      if(sonucDiv) sonucDiv.style.display='none';
      liste.style.display='none';
      if(ph) ph.style.display='block';
      if(typeof degisiklikPanelGoster==='function') degisiklikPanelGoster();
      return;
    }
  }
  if(ph) ph.style.display='none';
  liste.style.display='';
  if(aramaDiv) aramaDiv.style.display='flex';
  if(sonucDiv) sonucDiv.style.display='none';

  var tumModu = (typeof adminTumEkipSecili==='function'&&adminTumEkipSecili());
  var ekip = (typeof aktifEkip==='function') ? aktifEkip() : null;
  if (!ekip && !tumModu){ liste.innerHTML='<div class="bos-durum"><div class="ikon">👤</div><p>Henüz bir ekibe atanmadınız. Yöneticinize başvurun.</p></div>'; _sorumluTabSayiGuncelle({}); return; }

  var arama = ((document.getElementById('sorumluluk-arama')||{}).value||'').trim().toLocaleLowerCase('tr');
  var aktifTipler = {};
  aktifSorumluTablar.forEach(function(t){
    if (t === 'uretim') aktifTipler.uretim = true;
    else if (t === 'koy') aktifTipler.koy = true;
    else if (t === 'satis') aktifTipler.mahalle = true;
  });
  var sayim = {uretim:0, mahalle:0, koy:0};
  var riskSay = 0;
  var gruplar = {};
  // Tüm listeyi tarayıp her işletme için başlık/sorumlu hesaplamak yerine, aktif ekibin
  // önbellekli üye indeksini kullan (başlık zaten hesaplı). Ekip geçişinde yeniden hesap yok.
  aktifEkipUyeleri().forEach(function(rec){
    var i = rec.i, b = rec.b;
    if (!b) return;
    sayim[b.tip] = (sayim[b.tip]||0)+1;
    var rg = (typeof riskGecmisMi==='function') && riskGecmisMi(i);
    if (rg && aktifTipler[b.tip]) riskSay++;
    if (!aktifTipler[b.tip]) return;
    if (_sorumlulukRiskFiltre && !rg) return;
    if (arama){
      var hit=((i.isletmeAdi||'').toLocaleLowerCase('tr').indexOf(arama)>=0)||((i.kayitNo||'').toLocaleLowerCase('tr').indexOf(arama)>=0)||((i.adres||'').toLocaleLowerCase('tr').indexOf(arama)>=0);
      if(!hit) return;
    }
    var gk=b.tip+':'+b.key;
    if(!gruplar[gk]) gruplar[gk]={tip:b.tip,key:b.key, ad:_baslikAdGoster(b), isl:[]};
    gruplar[gk].isl.push(i);
  });
  var toplam = sayim.uretim+sayim.mahalle+sayim.koy;
  _sorumluTabSayiGuncelle(sayim);
  _sonGruplar = gruplar;

  var h='';
  if(tumModu){
    h+='<div style="font-weight:600;font-size:14px;margin-bottom:10px;">👁 Tüm Ekipler <span style="color:var(--gri);font-weight:400;">('+toplam+' işletme · sadece görüntüleme)</span></div>';
  } else if(!isAdminF){
    h+='<div style="font-weight:600;font-size:14px;margin-bottom:10px;">👁 '+_ekipEsc(ekip.ad||ekip.id)+' <span style="color:var(--gri);font-weight:400;">('+toplam+' işletme)</span></div>';
  }
  h+='<button class="btn '+(_sorumlulukRiskFiltre?'btn-turuncu':'btn-gri')+'" style="width:100%;margin-bottom:12px;" onclick="_sorumlulukRiskFiltre=!_sorumlulukRiskFiltre;sorumluluklarimGoster();">'+(_sorumlulukRiskFiltre?'✓ ':'')+'⚠️ Risk Tarihi Geçenleri Filtrele ('+riskSay+')</button>';

  var anahtarlar = Object.keys(gruplar).sort(function(a,b){ return gruplar[b].isl.length - gruplar[a].isl.length || gruplar[a].ad.localeCompare(gruplar[b].ad,'tr'); });
  if(!anahtarlar.length){
    h+='<div class="bos-durum"><div class="ikon">📭</div><p>'+(_sorumlulukRiskFiltre?'Risk tarihi geçen işletme yok.':(arama?'Aramayla eşleşen işletme yok.':'Bu sekmede sorumlu olduğunuz işletme yok.'))+'</p></div>';
    liste.innerHTML=h; return;
  }
  anahtarlar.forEach(function(gk){
    var g=gruplar[gk];
    var gkEsc=gk.replace(/'/g,"\\'");
    var acik = !!_sorumlulukAcik[gk] || !!arama;
    h+='<div onclick="_sorumlulukAcik[\''+gkEsc+'\']=!_sorumlulukAcik[\''+gkEsc+'\'];sorumluluklarimGoster();" style="display:flex;justify-content:space-between;align-items:center;gap:8px;background:var(--gri-acik);border-radius:8px;padding:11px 13px;margin-bottom:7px;cursor:pointer;font-weight:600;font-size:14px;">';
    h+='<span>'+(acik?'▼ ':'▶ ')+_ekipEsc(g.ad)+'</span><span style="color:var(--gri);font-weight:400;">('+g.isl.length+')</span></div>';
    if(acik){
      h+='<div style="margin:0 0 10px 4px;">';
      var sirali=g.isl.slice().sort(function(a,b){ return tarihSiralamaSkoru(a.riskeDayaliDenetimTarihi) - tarihSiralamaSkoru(b.riskeDayaliDenetimTarihi); });
      sirali.forEach(function(i){
        var risk=i.riskeDayaliDenetimTarihi||'';
        var _t=(typeof tarihParse==='function')?tarihParse(risk):null;
        var _gun=_t?gunFarki(bugunTarih(),_t):null;
        var _cok=(_gun!==null && _gun < -1000), _gecti=(_gun!==null && _gun <= 0);
        var kn=_ekipEsc(i.kayitNo||'').replace(/'/g,"\\'");
        var riskHtml = risk ? (' • '+(_cok?'<span style="color:#c0392b;font-weight:600;">⚠️ '+_ekipEsc(risk)+' · GGBS\'de kontrol et</span>':(_gecti?'<span style="color:#c0392b;">'+_ekipEsc(risk)+'</span>':_ekipEsc(risk)))) : '';
        h+='<div onclick="event.stopPropagation();isletmeDetayModal(\''+kn+'\')" style="padding:9px 11px;border:1px solid var(--sinir);border-radius:9px;margin-bottom:6px;cursor:pointer;background:#fff;">';
        h+='<div style="font-size:13px;font-weight:500;">'+_ekipEsc(i.isletmeAdi||'(isimsiz)')+'</div>';
        h+='<div style="font-size:11px;color:var(--gri);margin-top:2px;">'+_ekipEsc(i.kayitNo||'')+riskHtml+'</div>';
        h+='</div>';
      });
      if(isAdminF && !tumModu){
        var gkDomId='mgr-'+gk.replace(/[^a-zA-Z0-9]/g,'_');
        if(_manuelEklemeGrubu===gk){
          h+='<div style="margin-top:6px;">';
          h+='<input id="mgi-'+gkDomId+'" type="text" placeholder="İşletme adı veya kayıt no..." value="'+_ekipEsc(_manuelEklemeArama)+'" oninput="_manuelEklemeArama=this.value;_manuelGrubaEkleSonuclariGuncelle(\''+gkEsc+'\')" style="width:100%;padding:7px 10px;border:1px solid var(--sinir);border-radius:7px;font-size:13px;box-sizing:border-box;" />';
          h+='<div id="'+gkDomId+'">'+_manuelGrubaEkleSonucHTML(gk)+'</div>';
          h+='<button onclick="event.stopPropagation();_manuelEklemeGrubu=null;sorumluluklarimGoster();" style="margin-top:4px;font-size:12px;color:var(--gri);background:none;border:none;cursor:pointer;padding:0;">✕ İptal</button>';
          h+='</div>';
        } else {
          h+='<button onclick="event.stopPropagation();_manuelEklemeGrubu=\''+gkEsc+'\';_manuelEklemeArama=\'\';sorumluluklarimGoster();setTimeout(function(){var el=document.getElementById(\'mgi-mgr-'+gk.replace(/[^a-zA-Z0-9]/g,'_')+'\');if(el)el.focus();},50);" style="width:100%;padding:7px;border:1px dashed var(--sinir);border-radius:7px;background:none;font-size:13px;color:var(--gri);cursor:pointer;margin-top:4px;">+ Manuel İşletme Ekle</button>';
        }
      }
      h+='</div>';
    }
  });
  liste.innerHTML=h;
}
function _manuelGrubaEkleSonuclariGuncelle(gk) {
  var el = document.getElementById('mgr-' + gk.replace(/[^a-zA-Z0-9]/g,'_'));
  if (!el) return;
  el.innerHTML = _manuelGrubaEkleSonucHTML(gk);
}
function _manuelGrubaEkleSonucHTML(gk) {
  var arama = (_manuelEklemeArama||'').trim().toLocaleLowerCase('tr');
  if (!arama) return '<div style="font-size:12px;color:var(--gri);padding:4px 0;">İşletme adı veya kayıt no girin…</div>';
  var g = _sonGruplar[gk];
  var zatenVarKn = new Set((g ? g.isl : []).map(function(i){ return i.kayitNo; }));
  var sonuclar = (typeof ISLETMELER!=='undefined'?ISLETMELER:[]).filter(function(i){
    if (zatenVarKn.has(i.kayitNo)) return false;
    var ad = (i.isletmeAdi||'').toLocaleLowerCase('tr');
    var kn = (i.kayitNo||'').toLocaleLowerCase('tr');
    return ad.indexOf(arama)>=0 || kn.indexOf(arama)>=0;
  }).slice(0,8);
  if (!sonuclar.length) return '<div style="font-size:12px;color:var(--gri);padding:4px 0;">Sonuç bulunamadı.</div>';
  var gkEsc = gk.replace(/'/g,"\\'");
  var h='<div style="border:1px solid var(--sinir);border-radius:7px;overflow:hidden;margin-top:4px;">';
  sonuclar.forEach(function(i){
    var kn = (i.kayitNo||'').replace(/'/g,"\\'");
    h+='<div onclick="_manuelGrubaEkle(\''+gkEsc+'\',\''+kn+'\')" style="padding:8px 10px;border-bottom:1px solid var(--gri-acik);cursor:pointer;font-size:13px;background:#fff;">';
    h+=_ekipEsc(i.isletmeAdi||'(isimsiz)')+' <span style="color:var(--gri);font-size:11px;">['+_ekipEsc(i.kayitNo||'')+']</span></div>';
  });
  h+='</div>';
  return h;
}
function _manuelGrubaEkle(gk, kayitNo) {
  if (!isAdmin) { bildirimGoster('Bu işlemi sadece admin yapabilir.', 'hata'); return; }
  if (typeof tumEkipGoruntulemeModu==='function' && tumEkipGoruntulemeModu()) { bildirimGoster('Tüm ekipler görünümünde sorumluluk düzenlenemez. Önce bir ekip seçin.', 'uyari'); return; }
  var isletme = (typeof ISLETMELER!=='undefined'?ISLETMELER:[]).find(function(i){ return i.kayitNo===kayitNo; });
  if (!isletme) { bildirimGoster('İşletme bulunamadı.', 'hata'); return; }
  var kolonIdx = gk.indexOf(':');
  var tip = gk.substring(0, kolonIdx);
  var key = gk.substring(kolonIdx+1);
  var an = isletmeAnahtari(isletme);
  if (an) {
    if (typeof manuelBaslik==='undefined') window.manuelBaslik={};
    manuelBaslik[an] = {tip:tip, key:key};
    if (typeof manuelBaslikKaydet==='function') manuelBaslikKaydet();
  }
  if (typeof manuelSorumlular==='undefined') window.manuelSorumlular=[];
  if (!manuelSorumlular.includes(kayitNo)) manuelSorumlular.push(kayitNo);
  haricTutulanlar = (haricTutulanlar||[]).filter(function(k){ return k!==kayitNo; });
  if (typeof sorumlulukOverrideKaydet==='function') sorumlulukOverrideKaydet();
  _ekipSayiCache = null;
  _manuelEklemeGrubu = null;
  _manuelEklemeArama = '';
  bildirimGoster('➕ İşletme gruba eklendi.');
  sorumluluklarimGoster();
  ozetGuncelle();
}
window._manuelGrubaEkleSonuclariGuncelle = _manuelGrubaEkleSonuclariGuncelle;
window._manuelGrubaEkle = _manuelGrubaEkle;

function tarihSiralamaSkoru(tarihStr) {
  if (!tarihStr) return 99999999;
  // DD/MM/YYYY formatı
  const p = tarihStr.split('/');
  if (p.length === 3) return parseInt(p[2]+p[1]+p[0]);
  return 99999999;
}

function riskDurumHesapla(tarihStr, bugun) {
  if (!tarihStr || tarihStr.trim() === '') return {renk:'var(--turuncu)', etiket:'Tarih girilmemiş'};
  const p = tarihStr.split('/');
  if (p.length !== 3) return {renk:'var(--gri)', etiket: tarihStr};
  const tarih = p[2]+'-'+p[1]+'-'+p[0];
  const kalan = gunFarki(bugun, tarih);
  if (kalan < 0) return {renk:'var(--kirmizi)', etiket:`${Math.abs(kalan)} gün geçti`};
  if (kalan === 0) return {renk:'var(--kirmizi)', etiket:'bugün'};
  if (kalan === 1) return {renk:'var(--turuncu)', etiket:'yarın'};
  if (kalan <= 30) return {renk:'var(--turuncu)', etiket:`${kalan} gün kaldı`};
  if (kalan <= 90) return {renk:'#e6a817', etiket:`${kalan} gün kaldı`};
  return {renk:'var(--yesil)', etiket:`${kalan} gün kaldı`};
}

function isletmeSorumluMuDetayli(isletme) {
  if (!isletme) return false;
  if (typeof kaliciSilinenler !== 'undefined' && kaliciSilinenler.includes(isletme.kayitNo)) return false;
  if (typeof haricTutulanlar !== 'undefined' && haricTutulanlar.includes(isletme.kayitNo)) return false;
  if (typeof VARSAYILAN_HARIC !== 'undefined' && isletme.kayitNo && VARSAYILAN_HARIC.includes(isletme.kayitNo)) return false;

  // Üretim sekmesinin detayı: seçili üretim kategorisine girenler.
  for (const katId of seciliKategoriler) {
    const kat = TUM_URETIM_KATEGORILER.find(k => k.id === katId);
    if (kat && _ilkFaaliyet(isletme.faaliyetAlani).includes(kat.anahtar[0].toLocaleLowerCase('tr'))) return true;
    if (kat && kat.anahtar.some(a => _ilkFaaliyet(isletme.faaliyetAlani).includes(a.toLocaleLowerCase('tr')))) return true;
  }

  // Satış sekmesinin detayı: pozitif satış faaliyet listesi + seçili mahalle.
  if (!satisFaaliyetiMi(isletme)) return false;
  const adres = (isletme.adres || '').toLocaleLowerCase('tr');
  const merkezMi = !merkezDisindaMi(isletme);
  if (merkezMi) {
    for (const mahalle of seciliMahalleler) {
      if (mahalleAdreseUyuyorMu(adres, mahalle)) return true;
    }
  }
  return false;
}
function sorumlulukCikar(kayitNo) {
  if (!isAdmin) { bildirimGoster('Bu işlemi sadece admin yapabilir.', 'hata'); return; }
  if (typeof tumEkipGoruntulemeModu==='function' && tumEkipGoruntulemeModu()) { bildirimGoster('Tüm ekipler görünümünde sorumluluk düzenlenemez. Önce bir ekip seçin.', 'uyari'); return; }
  if (!haricTutulanlar.includes(kayitNo)) {
    haricTutulanlar.push(kayitNo);
    if (typeof manuelSorumlular !== 'undefined') manuelSorumlular = manuelSorumlular.filter(function(k){ return k !== kayitNo; });
    localStorage.setItem('haricTutulanlar', JSON.stringify(haricTutulanlar));
    if (typeof sorumlulukOverrideKaydet === 'function') sorumlulukOverrideKaydet();
    var btn = document.getElementById('tab-haric');
    if (btn) btn.textContent = '⛔ Sorumluluk Dışına Attıklarım (' + haricTutulanlar.length + ')';
    aktiviteKaydet('sorumluluk_cikar', kayitNo + ' sorumluluk dışına alındı', {kayitNo: kayitNo});
    bildirimGoster('⛔ Sorumluluk dışına alındı');
  }
  modalKapatForce();
  sorumluluklarimGoster();
  ozetGuncelle();
  // Açık özet listesini de yenile
  var _kart = document.getElementById('ozet-liste-kart');
  if (_kart && _kart.style.display !== 'none') {
    var _bEl = document.getElementById('ozet-liste-baslik');
    var _bTxt = _bEl ? _bEl.textContent : '';
    if (_bTxt.includes('Üretim')) ozetUretimGit();
    else ozetDigerGit();
  }
}

function sorumlulukGeriAl(kayitNo) {
  haricTutulanlar = haricTutulanlar.filter(k => k !== kayitNo);
  haricTutulanlariKaydet();
  if (typeof sorumlulukOverrideKaydet === 'function') sorumlulukOverrideKaydet();
  modalKapat();
  sorumluluklarimGoster();
  ozetGuncelle();
}

// Manuel sorumluluğa alma (admin) — kategorisine göre listeye girer, Firebase + gömülü tohum güncellenir
function sorumlulukAl(kayitNo) {
  if (!isAdmin) { bildirimGoster('Bu işlemi sadece admin yapabilir.', 'hata'); return; }
  if (typeof tumEkipGoruntulemeModu==='function' && tumEkipGoruntulemeModu()) { bildirimGoster('Tüm ekipler görünümünde sorumluluk düzenlenemez. Önce bir ekip seçin.', 'uyari'); return; }
  if (!kayitNo) { bildirimGoster('Kayıt numarası olmayan işletme eklenemez.', 'hata'); return; }
  haricTutulanlar = haricTutulanlar.filter(function(k){ return k !== kayitNo; });
  if (typeof manuelSorumlular === 'undefined') manuelSorumlular = [];
  if (!manuelSorumlular.includes(kayitNo)) manuelSorumlular.push(kayitNo);
  if (typeof sorumlulukOverrideKaydet === 'function') sorumlulukOverrideKaydet();
  try { aktiviteKaydet('sorumluluk_al', kayitNo + ' sorumluluğa alındı', {kayitNo: kayitNo}); } catch(e){}
  var _i = (ISLETMELER||[]).find(function(x){ return x.kayitNo === kayitNo; });
  var _kat = _i ? sorumlulukKategorisiBelirle(_i) : 'satis';
  bildirimGoster('➕ Sorumluluğa alındı (' + ({uretim:'Üretim',koy:'Köy',satis:'Satış'}[_kat]||'Satış') + ')');
  modalKapatForce();
  sorumluluklarimGoster();
  ozetGuncelle();
}

function kategoriToggle(id) {
  if (seciliKategoriler.includes(id)) {
    seciliKategoriler = seciliKategoriler.filter(k => k !== id);
  } else {
    seciliKategoriler.push(id);
  }
  localStorage.setItem('seciliKategoriler', JSON.stringify(seciliKategoriler));
  sorumluluklarimGoster();
}

function haricTumunuGeriAl() {
  if (confirm('Tüm çıkarılanları geri almak istiyor musunuz?')) {
    haricTutulanlar = [];
    haricTutulanlariKaydet();
    modalKapat();
    sorumluluklarimGoster();
  }
}

function haricListesiGoster() {
  if (haricTutulanlar.length === 0) return;
  const isletmeler = haricTutulanlar.map(k => {
    const i = ISLETMELER.find(x => x.kayitNo === k) || URETIM_YERLERI.find(x => x.kayitNo === k);
    return i ? i.isletmeAdi : k;
  });
  const satirlar = haricTutulanlar.map((k, idx) =>
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--sinir);">' +
    '<span style="font-size:14px;">' + isletmeler[idx] + '</span>' +
    '<button class="btn btn-gri btn-kucuk" onclick="sorumlulukGeriAl(\'' + k + '\')">↩ Geri Al</button>' +
    '</div>'
  ).join('');
  document.getElementById('modal-icerik').innerHTML =
    '<div class="modal-baslik"><h2>⛔ Listeden Çıkarılanlar</h2><button class="modal-kapat" onclick="modalKapat()">✕</button></div>' +
    '<p style="font-size:13px;color:var(--gri);margin-bottom:16px;">Bu işletmeler sorumluluklarım listesinden manuel olarak çıkarıldı.</p>' +
    satirlar +
    '<div class="buton-satir" style="margin-top:16px;">' +
    '<button class="btn btn-kirmizi" onclick="haricTumunuGeriAl()">Tümünü Geri Al</button>' +
    '<button class="btn btn-gri" onclick="modalKapat()">Kapat</button></div>';
  document.getElementById('modal-arkaplan').classList.add('acik');
}

function mahalleToggle(mahalle) {
  if (seciliMahalleler.includes(mahalle)) {
    seciliMahalleler = seciliMahalleler.filter(m => m !== mahalle);
  } else {
    seciliMahalleler.push(mahalle);
  }
  localStorage.setItem('seciliMahalleler', JSON.stringify(seciliMahalleler));
  sorumluluklarimGoster();
}
