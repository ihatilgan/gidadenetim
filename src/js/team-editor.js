// ===== Ekip Yönetimi editörü + ekip geçiş menüsü (admin) =====
var _duzenlenenEkipId = null;
function _ekipEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _ekipSay(n){ n=n||0; return ' <span style="font-size:11px;color:'+(n?'var(--gri)':'#c0392b')+';">('+n+')</span>'; }
function _ekipYeniId(){ var n=1, ids=EKIPLER.map(function(e){return e.id;}); while(ids.indexOf('ekip'+n)>=0) n++; return 'ekip'+n; }

function ekipAktifYap(id, yenidenCiz){
  var ek = (typeof ekipBul==='function') ? ekipBul(id) : null;
  if(!ek) return;
  _duzenlenenEkipId = id;
  if(typeof aktifEkibeGec==='function') aktifEkibeGec(id, yenidenCiz !== false);
  else if(typeof ekipKurallariUygula==='function') ekipKurallariUygula(ek);
  try{ _ekipSayiCache=null; _ekipSayiLen=-1; }catch(e){}
  try{ if(typeof ekipSeciciDoldur==='function') ekipSeciciDoldur(); }catch(e){}
  try{ if(typeof basliklarGoster==='function' && document.getElementById('sayfa-basliklar') && document.getElementById('sayfa-basliklar').classList.contains('aktif')) basliklarGoster(); }catch(e){}
}
function ekipDuzenleSec(id){
  ekipAktifYap(id, true);
  ekipYonetimiGoster();
}
function ekibeKullaniciEkle(ekipId){
  if(typeof sayfaGoster==='function') sayfaGoster('kullanicilar', null);
  setTimeout(function(){
    if(typeof ekipDropdownDoldur==='function') ekipDropdownDoldur('yeni-ekip', ekipId);
    var ad=document.getElementById('yeni-ad'); if(ad) ad.focus();
    if(typeof bildirimGoster==='function'){ var e=(typeof ekipBul==='function')?ekipBul(ekipId):null; bildirimGoster('Yeni kullanıcı '+((e&&(e.ad||e.id))||'ekip')+' ekibine atanacak.','bilgi'); }
  }, 180);
}
function ekipAdGuncelle(v){ var ek=ekipBul(_duzenlenenEkipId); if(ek) ek.ad=v; }
function ekipMahalleToggle(m,on){ var ek=ekipBul(_duzenlenenEkipId); if(!ek) return; ek.mahalleler=ek.mahalleler||[]; var i=ek.mahalleler.indexOf(m); if(on&&i<0) ek.mahalleler.push(m); if(!on&&i>=0) ek.mahalleler.splice(i,1); var b=document.getElementById('ekip-mah-sayac'); if(b) b.textContent=ek.mahalleler.length+' seçili'; if(aktifEkipId===_duzenlenenEkipId&&typeof ekipKurallariUygula==='function') ekipKurallariUygula(ek); }
function ekipKategoriToggle(id,on){ var ek=ekipBul(_duzenlenenEkipId); if(!ek) return; ek.uretimKategorileri=ek.uretimKategorileri||[]; var i=ek.uretimKategorileri.indexOf(id); if(on&&i<0) ek.uretimKategorileri.push(id); if(!on&&i>=0) ek.uretimKategorileri.splice(i,1); if(aktifEkipId===_duzenlenenEkipId&&typeof ekipKurallariUygula==='function') ekipKurallariUygula(ek); }
function ekipKoyEkle(){ var inp=document.getElementById('ekip-koy-input'); if(!inp||!inp.value.trim()) return; var ek=ekipBul(_duzenlenenEkipId); if(!ek) return; var v=inp.value.trim(); ek.kasabalar=ek.kasabalar||[]; if(ek.kasabalar.indexOf(v)<0) ek.kasabalar.push(v); inp.value=''; ekipYonetimiGoster(); setTimeout(function(){ var i2=document.getElementById('ekip-koy-input'); if(i2) i2.focus(); },0); }
function ekipKoySil(v){ var ek=ekipBul(_duzenlenenEkipId); if(!ek||!ek.kasabalar) return; ek.kasabalar=ek.kasabalar.filter(function(k){return k!==v;}); ekipYonetimiGoster(); }
function ekipPersonelEkle(){ var inp=document.getElementById('ekip-personel-input'); if(!inp||!inp.value.trim()) return; var ek=ekipBul(_duzenlenenEkipId); if(!ek) return; var v=inp.value.trim(); ek.personel=ek.personel||[]; if(ek.personel.indexOf(v)<0) ek.personel.push(v); inp.value=''; ekipYonetimiGoster(); setTimeout(function(){ var i2=document.getElementById('ekip-personel-input'); if(i2) i2.focus(); },0); }
function ekipPersonelSil(isim){ var ek=ekipBul(_duzenlenenEkipId); if(!ek||!ek.personel) return; ek.personel=ek.personel.filter(function(p){return p!==isim;}); ekipYonetimiGoster(); }
function ekipKoyToggle(k,on){ var ek=ekipBul(_duzenlenenEkipId); if(!ek) return; ek.kasabalar=ek.kasabalar||[]; var i=ek.kasabalar.indexOf(k); if(on&&i<0)ek.kasabalar.push(k); if(!on&&i>=0)ek.kasabalar.splice(i,1); var b=document.getElementById('ekip-koy-sayac'); if(b) b.textContent=ek.kasabalar.length+' seçili'; if(aktifEkipId===_duzenlenenEkipId&&typeof ekipKurallariUygula==='function') ekipKurallariUygula(ek); }

function ekipYeniEkle(){
  var id=_ekipYeniId();
  EKIPLER.push({ id:id, ad:'Ekip '+(EKIPLER.length+1), mahalleler:[], kasabalar:[], uretimKategorileri:[] });
  _duzenlenenEkipId=id; ekiplerKaydet();
  if(typeof ekipSeciciDoldur==='function') ekipSeciciDoldur();
  ekipYonetimiGoster();
}
function ekipSil(){
  var ek=ekipBul(_duzenlenenEkipId); if(!ek) return;
  if(EKIPLER.length<=1){ if(typeof bildirimGoster==='function') bildirimGoster('En az bir ekip kalmalı.','hata'); return; }
  if(!confirm('"'+ek.ad+'" ekibini silmek istediğinize emin misiniz?')) return;
  EKIPLER=EKIPLER.filter(function(e){return e.id!==_duzenlenenEkipId;});
  if(aktifEkipId===_duzenlenenEkipId && typeof aktifEkibeGec==='function') aktifEkibeGec(EKIPLER[0].id);
  _duzenlenenEkipId=EKIPLER[0].id; ekiplerKaydet();
  if(typeof ekipSeciciDoldur==='function') ekipSeciciDoldur();
  ekipYonetimiGoster();
}
function ekipDegisiklikleriKaydet(){
  ekiplerKaydet();
  if(aktifEkipId===_duzenlenenEkipId && typeof ekipKurallariUygula==='function'){
    ekipKurallariUygula(ekipBul(_duzenlenenEkipId));
    try{ if(typeof ozetGuncelle==='function') ozetGuncelle(); }catch(e){}
  }
  if(typeof ekipSeciciDoldur==='function') ekipSeciciDoldur();
  ekipYonetimiGoster();
  if(typeof bildirimGoster==='function') bildirimGoster('✅ Ekip kaydedildi.');
}

function ekipYonetimiGoster(){
  var root=document.getElementById('ekip-yonetim-root'); if(!root) return;
  if(!EKIPLER.length && typeof ekip1Tohumla==='function') ekip1Tohumla();
  if(!_duzenlenenEkipId || !ekipBul(_duzenlenenEkipId)) _duzenlenenEkipId=((typeof aktifEkip==='function'&&aktifEkip())||EKIPLER[0]||{}).id;
  var ek=ekipBul(_duzenlenenEkipId);
  if(!ek){ root.innerHTML='<p style="color:var(--gri);">Ekip bulunamadı.</p>'; return; }
  var say=(typeof ekipSecenekSayilari==='function')?ekipSecenekSayilari():{mah:{},koy:{},kat:{}};
  var mahOpts=(typeof tumMahalleSecenekleri==='function')?tumMahalleSecenekleri():(ek.mahalleler||[]);
  var h='';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">';
  h+='<select onchange="ekipDuzenleSec(this.value)" style="min-width:150px;">';
  EKIPLER.forEach(function(e){ h+='<option value="'+_ekipEsc(e.id)+'"'+(e.id===_duzenlenenEkipId?' selected':'')+'>'+_ekipEsc(e.ad||e.id)+(e.id===aktifEkipId?' • aktif':'')+'</option>'; });
  h+='</select>';
  h+='<button class="btn btn-yesil btn-kucuk" onclick="ekipYeniEkle()">+ Yeni Ekip</button>';
  h+='<button class="btn btn-kirmizi btn-kucuk" onclick="ekipSil()">🗑 Sil</button>';
  var _duzEkipEsc = _ekipEsc(_duzenlenenEkipId).replace(/'/g,"\\'");
  if(isAdmin) h+='<button class="btn btn-gri btn-kucuk" onclick="ekibeKullaniciEkle(\''+_duzEkipEsc+'\')">👤 Bu ekibe kullanıcı ekle</button>';
  if(isAdmin && _duzenlenenEkipId!==aktifEkipId) h+='<button class="btn btn-yesil btn-kucuk" onclick="ekipAktifYap(\''+_duzEkipEsc+'\',true);ekipYonetimiGoster();">✓ Aktif Yap</button>';
  h+='</div>';
  h+='<div class="bolum">Ekip Adı</div>';
  h+='<input type="text" value="'+_ekipEsc(ek.ad||'')+'" oninput="ekipAdGuncelle(this.value)" style="width:100%;margin-bottom:6px;">';
  if((ek.personel||[]).length){
    var kisaIsimler=(ek.personel||[]).map(function(p){
      var p2=p.trim().split(/\s+/);
      return (p2[0]?p2[0][0]+'.':'')+' '+(p2.length>1?p2[p2.length-1]:'');
    }).join(' • ');
    h+='<div style="font-size:12px;color:var(--gri);margin-bottom:14px;line-height:1.6;">'+_ekipEsc(kisaIsimler)+'</div>';
  } else {
    h+='<div style="margin-bottom:14px;"></div>';
  }
  h+='<div class="bolum">Mahalleler (<span id="ekip-mah-sayac">'+(ek.mahalleler||[]).length+' seçili</span>)</div>';
  h+='<div style="max-height:240px;overflow-y:auto;border:1px solid var(--sinir);border-radius:8px;padding:8px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:2px;">';
  mahOpts.forEach(function(m){ var on=(ek.mahalleler||[]).indexOf(m)>=0; h+='<label style="display:flex;align-items:center;gap:4px;width:48%;font-size:13px;padding:3px;box-sizing:border-box;"><input type="checkbox" value="'+_ekipEsc(m)+'" '+(on?'checked':'')+' onchange="ekipMahalleToggle(this.value,this.checked)">'+_ekipEsc(m)+_ekipSay(say.mah[m])+'</label>'; });
  h+='</div>';
  h+='<div class="bolum">Köy / Kasaba (<span id="ekip-koy-sayac">'+(ek.kasabalar||[]).length+' seçili</span>)</div>';
  h+='<div style="max-height:220px;overflow-y:auto;border:1px solid var(--sinir);border-radius:8px;padding:8px;margin-bottom:8px;display:flex;flex-wrap:wrap;gap:2px;">';
  var koyOpts=(typeof tumKoySecenekleri==='function')?tumKoySecenekleri():(ek.kasabalar||[]);
  koyOpts.forEach(function(k){ var on=(ek.kasabalar||[]).indexOf(k)>=0; h+='<label style="display:flex;align-items:center;gap:4px;width:48%;font-size:13px;padding:3px;box-sizing:border-box;"><input type="checkbox" value="'+_ekipEsc(k)+'" '+(on?'checked':'')+' onchange="ekipKoyToggle(this.value,this.checked)">'+_ekipEsc(k)+_ekipSay(say.koy[k])+'</label>'; });
  h+='</div>';
  h+='<div style="display:flex;gap:6px;margin-bottom:14px;"><input type="text" id="ekip-koy-input" placeholder="Listede yoksa yazıp ekleyin" style="flex:1;" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ekipKoyEkle();}"><button class="btn btn-yesil btn-kucuk" onclick="ekipKoyEkle()">+ Ekle</button></div>';
  h+='<div class="bolum">Üretim Kategorileri ('+ (ek.uretimKategorileri||[]).length +' seçili)</div>';
  h+='<div style="max-height:240px;overflow-y:auto;border:1px solid var(--sinir);border-radius:8px;padding:8px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:2px;">';
  (typeof TUM_URETIM_KATEGORILER!=='undefined'?TUM_URETIM_KATEGORILER:[]).forEach(function(k){ var on=(ek.uretimKategorileri||[]).indexOf(k.id)>=0; h+='<label style="display:flex;align-items:center;gap:4px;width:48%;font-size:13px;padding:3px;box-sizing:border-box;"><input type="checkbox" value="'+_ekipEsc(k.id)+'" '+(on?'checked':'')+' onchange="ekipKategoriToggle(this.value,this.checked)">'+_ekipEsc(k.label)+_ekipSay(say.kat[k.id])+'</label>'; });
  h+='</div>';
  h+='<div class="bolum">Personel ('+(ek.personel||[]).length+' kişi)</div>';
  h+='<div style="border:1px solid var(--sinir);border-radius:8px;margin-bottom:8px;overflow:hidden;">';
  if((ek.personel||[]).length){
    (ek.personel||[]).forEach(function(p,pi){
      var pEsc=_ekipEsc(p).replace(/'/g,"\\'");
      h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;font-size:13px;'+(pi>0?'border-top:1px solid var(--sinir);':'')+'">'+
        '<span>'+_ekipEsc(p)+'</span>'+
        '<button onclick="ekipPersonelSil(\''+pEsc+'\')" style="background:none;border:none;color:#c0392b;font-size:18px;cursor:pointer;line-height:1;padding:0 4px;">×</button>'+
        '</div>';
    });
  } else {
    h+='<div style="font-size:12px;color:var(--gri);padding:10px;">Henüz personel eklenmedi.</div>';
  }
  h+='</div>';
  h+='<div style="display:flex;gap:6px;margin-bottom:14px;"><input type="text" id="ekip-personel-input" placeholder="Ad Soyad" style="flex:1;" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ekipPersonelEkle();}"><button class="btn btn-yesil btn-kucuk" onclick="ekipPersonelEkle()">+ Ekle</button></div>';
  h+='<button class="btn btn-yesil" style="width:100%;" onclick="ekipDegisiklikleriKaydet()">💾 Ekibi Kaydet</button>';
  h+='<p style="font-size:12px;color:var(--gri);margin-top:10px;">Not: Satış faaliyet türleri (45 tür) tüm ekiplerde ortaktır, burada seçilmez. Bir ekip aktifken yaptığınız kayıt anında listeye yansır.</p>';
  root.innerHTML=h;
}

// ----- Ekip geçiş menüsü (Sorumluluklarım sayfası, admin) -----
function ekipIsletmeSayisi(ekip){
  if(!ekip) return 0;
  var s=(typeof ekipSecenekSayilari==='function')?ekipSecenekSayilari():{ekipToplam:{}};
  return (s.ekipToplam&&s.ekipToplam[ekip.id])||0;
}
function ekipSeciciDoldur(){
  var opts=EKIPLER.map(function(e){ return '<option value="'+_ekipEsc(e.id)+'"'+(e.id===aktifEkipId?' selected':'')+'>'+_ekipEsc(e.ad||e.id)+' ('+ekipIsletmeSayisi(e)+' işletme)</option>'; }).join('');
  ['ekip-secici','ekip-secici-ozet'].forEach(function(id){ var sel=document.getElementById(id); if(sel) sel.innerHTML=opts; });
}
function ekipSeciciDegisti(id){
  if(typeof aktifEkibeGec==='function') aktifEkibeGec(id);
  _duzenlenenEkipId = id;
  try{ if(typeof sorumluluklarimGoster==='function') sorumluluklarimGoster(); }catch(e){}
  try{ if(typeof ekipYonetimiGoster==='function' && document.getElementById('ekip-yonetim-root')) ekipYonetimiGoster(); }catch(e){}
  if(typeof ekipSeciciDoldur==='function') ekipSeciciDoldur();
}

// ----- Seçenek başına işletme sayıları (editör başlıklarında gösterilir) -----
var _ekipSayiCache=null, _ekipSayiLen=-1, _ekipSayiIlk=null, _ekipSayiSon=null, _ekipSayiOrta=null;
// ----- Bir işletmenin TEK birincil başlığı: manuel override → üretim → köy → mahalle -----
function isletmeBaslikBelirle(i){
  if(!i) return null;
  if(typeof kayitHaricMi==='function' && kayitHaricMi(i)) return null;
  var an=isletmeAnahtari(i);
  if(an && typeof manuelBaslik!=='undefined' && manuelBaslik[an]){
    var mb=manuelBaslik[an];
    if(mb.tip==='uretim'){
      var kats2=(typeof TUM_URETIM_KATEGORILER!=='undefined')?TUM_URETIM_KATEGORILER:[];
      // Kategori hâlâ yüklüyse geçerli; yoksa boştaya düşsün (silme — Firebase geç yüklenmiş olabilir)
      if(kats2.find(function(x){return x.id===mb.key;})) return mb;
      return null;
    }
    return mb;
  }
  var dis=(typeof merkezDisindaMi==='function')&&merkezDisindaMi(i);
  var kats=(typeof TUM_URETIM_KATEGORILER!=='undefined')?TUM_URETIM_KATEGORILER:[];
  if(!dis){ for(var c=0;c<kats.length;c++){ if(uretimKatEslesir(i.faaliyetAlani,kats[c])) return {tip:'uretim',key:kats[c].id}; } }
  var satis=(typeof satisFaaliyetiMi==='function')&&satisFaaliyetiMi(i);
  if(satis){
    var koylar=(typeof KOY_MASTER!=='undefined')?KOY_MASTER:[];
    for(var k=0;k<koylar.length;k++){ if(koyAdreseUyuyorMu((i.adres||'')+' '+(i.ilce||''),koylar[k])) return {tip:'koy',key:koylar[k]}; }
    if(!dis){ var mahler=(typeof MERKEZ_MAHALLE_MASTER!=='undefined')?MERKEZ_MAHALLE_MASTER:[]; for(var m=0;m<mahler.length;m++){ if(mahalleAdreseUyuyorMu(i.adres,mahler[m])) return {tip:'mahalle',key:mahler[m]}; } }
  }
  return null;
}
function ekipSecenekSayilari(){
  var kaynak=(typeof ISLETMELER!=='undefined'&&ISLETMELER.length)?ISLETMELER:[];
  // Önbellek anahtarı yalnızca uzunluğa değil, ilk/orta/son işletme NESNE kimliğine de bakar:
  // ISLETMELER dizisi (Excel güncelleme, master yeniden yükleme, cihaz önbelleği) aynı
  // uzunlukta yeni nesnelerle değiştirildiğinde önbellek eski referansları tutmasın.
  var _ilk=kaynak[0]||null, _son=kaynak[kaynak.length-1]||null, _orta=kaynak[kaynak.length>>1]||null;
  if(_ekipSayiCache && _ekipSayiLen===kaynak.length && _ekipSayiIlk===_ilk && _ekipSayiSon===_son && _ekipSayiOrta===_orta) return _ekipSayiCache;
  var mah={}, koy={}, kat={};
  var mahList=(typeof tumMahalleSecenekleri==='function')?tumMahalleSecenekleri():[];
  var koyList=(typeof tumKoySecenekleri==='function')?tumKoySecenekleri():[];
  var kats=(typeof TUM_URETIM_KATEGORILER!=='undefined')?TUM_URETIM_KATEGORILER:[];
  mahList.forEach(function(m){mah[m]=0;}); koyList.forEach(function(k){koy[k]=0;}); kats.forEach(function(k){kat[k.id]=0;});
  var ekipToplam={};
  // Per-işletme önbellek: başlık ve sorumlu ekip işletmenin kendisine bağlıdır,
  // AKTİF EKİPTEN BAĞIMSIZDIR. Bir kez burada hesaplanıp saklanır; ekip geçişlerinde
  // yeniden hesaplanmaz (yalnızca veri değişince _ekipSayiCache sıfırlanır).
  var baslikMap={}, sorumluMap={}, ekipUyeleri={};
  kaynak.forEach(function(i){
    var _an=isletmeAnahtari(i);
    var b=isletmeBaslikBelirle(i);
    if(_an) baslikMap[_an]=b||null;
    if(!b){ if(_an){ sorumluMap[_an]=(typeof manuelEkip!=='undefined' && manuelEkip[_an]) ? manuelEkip[_an] : null; } return; }
    if(b.tip==='mahalle'){ if(!(b.key in mah)) mah[b.key]=0; mah[b.key]++; }
    else if(b.tip==='koy'){ if(!(b.key in koy)) koy[b.key]=0; koy[b.key]++; }
    else if(b.tip==='uretim'){ if(!(b.key in kat)) kat[b.key]=0; kat[b.key]++; }
    var _eid=(typeof manuelEkip!=='undefined' && manuelEkip[_an]) ? manuelEkip[_an] : (function(){ var ek=(typeof baslikEkibiBul==='function')?baslikEkibiBul(b):null; return ek?ek.id:null; })();
    if(_an) sorumluMap[_an]=_eid||null;
    if(_eid){ ekipToplam[_eid]=(ekipToplam[_eid]||0)+1; (ekipUyeleri[_eid]||(ekipUyeleri[_eid]=[])).push({i:i,b:b}); }
  });
  _ekipSayiCache={mah:mah,koy:koy,kat:kat,ekipToplam:ekipToplam,baslikMap:baslikMap,sorumluMap:sorumluMap,ekipUyeleri:ekipUyeleri}; _ekipSayiLen=kaynak.length; _ekipSayiIlk=_ilk; _ekipSayiSon=_son; _ekipSayiOrta=_orta;
  return _ekipSayiCache;
}
// Aktif ekibin (başlığı belirlenebilen) işletmeleri — önbellekli indeksden, tüm listeyi taramadan
function aktifEkipUyeleri(){
  var c=ekipSecenekSayilari();
  return (c && c.ekipUyeleri && c.ekipUyeleri[aktifEkipId]) || [];
}
// Önbellekli başlık: ekipSecenekSayilari pass'inde hesaplanmış değeri döndürür (ekip geçişinde yeniden hesaplama yok)
function isletmeBaslikCacheli(i){
  if(!i) return null;
  var an=isletmeAnahtari(i);
  var c=ekipSecenekSayilari();
  if(c && c.baslikMap && an && (an in c.baslikMap)) return c.baslikMap[an];
  return isletmeBaslikBelirle(i);
}

// ----- Bir ekip, bir işletmeden sorumlu mu? (global'leri değiştirmeden) -----
function isletmeSorumluEkipId(i){
  if(!i) return null;
  if(typeof kayitHaricMi==='function' && kayitHaricMi(i)) return null;
  var an=isletmeAnahtari(i);
  if(an && typeof manuelEkip!=='undefined' && manuelEkip[an]) return manuelEkip[an];
  // Önbellekten oku (ekipSecenekSayilari pass'i) — ekip geçişinde yeniden hesaplama yok
  var c=ekipSecenekSayilari();
  if(c && c.sorumluMap && an && (an in c.sorumluMap)) return c.sorumluMap[an];
  var b=isletmeBaslikBelirle(i);
  if(!b) return null;
  var ek=(typeof baslikEkibiBul==='function')?baslikEkibiBul(b):null;
  return ek?ek.id:null;
}
function ekipSorumluMu(ekip, i){
  if(!ekip||!i) return false;
  return isletmeSorumluEkipId(i)===ekip.id;
}

// ----- Dağıtım raporu: çakışan (2+ ekip) ve boşta kalan (0 ekip) işletmeler -----
function ekipDagitimRaporu(){
  var el=document.getElementById('ekip-rapor-icerik'); if(!el) return;
  el.innerHTML='<p style="color:var(--gri);font-size:13px;">Hesaplanıyor…</p>';
  setTimeout(function(){
    var kaynak=(typeof ISLETMELER!=='undefined'&&ISLETMELER.length)?ISLETMELER:[];
    var conflicts=[],orphans=[];
    kaynak.forEach(function(i){
      // Kapsam dışı: açıkça hariç tutulanlar
      if(typeof kayitHaricMi==='function' && kayitHaricMi(i)) return;
      // Kapsam kontrolü: başlık belirlenebiliyorsa VEYA manuel ekip ataması varsa işletme kapsamdadır
      var baslik = (typeof isletmeBaslikBelirle==='function') ? isletmeBaslikBelirle(i) : null;
      var an = (typeof isletmeAnahtari==='function') ? isletmeAnahtari(i) : (i.kayitNo||i.isletmeAdi||'');
      var hasManuelEkip = (typeof manuelEkip!=='undefined' && !!manuelEkip[an]);
      if (!baslik && !hasManuelEkip) return; // başlık yok → kapsam dışı (tüm başlıklar "boşta" listesinden farklı kapsam)
      var claim=EKIPLER.filter(function(e){return ekipSorumluMu(e,i);});
      if(claim.length===0) orphans.push(i);
      else if(claim.length>=2) conflicts.push({i:i,ekipler:claim.map(function(e){return e.ad||e.id;})});
    });
    var h='';
    h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">';
    h+='<span style="background:#fdecea;color:#c0392b;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600;">⚠️ Çakışan: '+conflicts.length+'</span>';
    h+='<span style="background:#fff7e6;color:#b45309;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600;">🕳️ Boşta kalan: '+orphans.length+'</span>';
    h+='</div>';
    function liste(arr,baslik,tip){
      var s='<div class="bolum">'+baslik+' ('+arr.length+')</div>';
      if(!arr.length) return s+'<p style="font-size:13px;color:var(--yesil);margin-bottom:6px;">Yok 👍</p>';
      s+='<div style="max-height:260px;overflow-y:auto;border:1px solid var(--sinir);border-radius:8px;margin-bottom:6px;">';
      arr.slice(0,100).forEach(function(o){
        var i=(tip==='c')?o.i:o;
        var ekstra=(tip==='c')?(' — <b style="color:#c0392b;">'+_ekipEsc(o.ekipler.join(', '))+'</b>'):'';
        s+='<div style="padding:7px 10px;border-bottom:1px solid var(--gri-acik);font-size:13px;">'+_ekipEsc(i.isletmeAdi||'(ad yok)')+' <span style="color:var(--gri);font-size:11px;">['+_ekipEsc(i.kayitNo||'')+']</span>'+ekstra+'</div>';
      });
      if(arr.length>100) s+='<div style="padding:7px 10px;font-size:12px;color:var(--gri);">…ve '+(arr.length-100)+' tane daha</div>';
      s+='</div>';
      return s;
    }
    h+=liste(conflicts,'⚠️ Birden fazla ekibe düşenler','c');
    h+=liste(orphans,'🕳️ Hiçbir ekibe düşmeyenler','o');
    el.innerHTML=h;
  },30);
}
window.ekipDagitimRaporu=ekipDagitimRaporu;
window.ekipSorumluMu=ekipSorumluMu;
window.ekipKoyToggle=ekipKoyToggle;

window.ekipYonetimiGoster=ekipYonetimiGoster;
window.ekipAktifYap=ekipAktifYap;
window.ekipSeciciDoldur=ekipSeciciDoldur;
window.ekipSeciciDegisti=ekipSeciciDegisti;
