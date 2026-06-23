// ===== İŞLETME: sorumlu ekip gösterimi + manuel başlık/ekip değiştirme + yoksay =====
var DEGISIKLIK_KEY = (typeof DEV_MODU!=='undefined'&&DEV_MODU) ? 'degisiklik_gunlugu_dev' : 'degisiklik_gunlugu';
var degisiklikGunlugu = [];
try { degisiklikGunlugu = JSON.parse(localStorage.getItem(DEGISIKLIK_KEY)||'[]') || []; } catch(e){ degisiklikGunlugu=[]; }
function degisiklikEkle(metin){
  degisiklikGunlugu.unshift({ tarih:new Date().toISOString(), metin:metin, kim:(typeof mevcutKullaniciAdi!=='undefined'?mevcutKullaniciAdi:'') });
  if (degisiklikGunlugu.length>500) degisiklikGunlugu.length=500;
  try { localStorage.setItem(DEGISIKLIK_KEY, JSON.stringify(degisiklikGunlugu)); } catch(e){}
  if(typeof aktiviteKaydet==='function') aktiviteKaydet('sorumluluk_degisiklik', metin, {});
}

function baslikEtiket(b){
  if(!b) return '—';
  if(b.tip==='uretim'){ var k=(typeof TUM_URETIM_KATEGORILER!=='undefined'?TUM_URETIM_KATEGORILER:[]).filter(function(x){return x.id===b.key;})[0]; return 'Üretim: '+(k?k.label:b.key); }
  if(b.tip==='koy') return 'Köy/Kasaba: '+b.key;
  return 'Mahalle: '+b.key;
}
// İşletmenin başlığı + o başlığın sahibi ekip
function isletmeSorumluEkip(i){
  var b = (typeof isletmeBaslikBelirle==='function') ? isletmeBaslikBelirle(i) : null;
  var an = (typeof isletmeAnahtari==='function') ? isletmeAnahtari(i) : ((i&&(i.kayitNo||i.isletmeAdi))||'');
  if(an && typeof manuelEkip!=='undefined' && manuelEkip[an]){
    var ekD=(typeof ekipBul==='function')?ekipBul(manuelEkip[an]):null;
    return { baslik:b, ekip:ekD, dogrudan:true };
  }
  var ek = (b && typeof baslikEkibiBul==='function') ? baslikEkibiBul(b) : null;
  return { baslik:b, ekip:ek };
}
function _isletmeBulAnahtar(an){
  var kaynak=(typeof ISLETMELER!=='undefined'?ISLETMELER:[]);
  for(var x=0;x<kaynak.length;x++){ if((kaynak[x].kayitNo||kaynak[x].isletmeAdi)===an) return kaynak[x]; }
  return null;
}
function _detayTazele(an){
  var i=_isletmeBulAnahtar(an);
  if(i && i.kayitNo && typeof isletmeDetayModal==='function'){ isletmeDetayModal(i.kayitNo); }
  else if(typeof modalKapat==='function'){ modalKapat(); }
  try{ if(typeof ozetGuncelle==='function') ozetGuncelle(); }catch(e){}
}

// Detayda gösterilecek "Sorumlu ekip" satırı (HTML döndürür)
function isletmeSorumlulukSatiri(i){
  var an = (typeof isletmeAnahtari==='function') ? isletmeAnahtari(i) : (i.kayitNo||i.isletmeAdi||'');
  var anEsc = _ekipEsc(an).replace(/'/g,"\\'");
  if (typeof yoksayListesi!=='undefined' && yoksayListesi.indexOf(an)>=0){
    return '<div style="margin-top:12px;padding:10px 12px;background:#f4f4f5;border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'
      + '<span style="font-size:13px;color:var(--gri);">⏸️ Bu işletme <b>yoksayılıyor</b> (hiçbir başlıkta/ekipte değil)</span>'
      + (isAdmin ? '<button class="btn btn-gri btn-kucuk" onclick="isletmeYoksayKaldir(\''+anEsc+'\')">↩ Yoksaydan çıkar</button>' : '')
      + '</div>';
  }
  var se = isletmeSorumluEkip(i);
  var ekipAd = se.ekip ? (_ekipEsc(se.ekip.ad||se.ekip.id) + (se.dogrudan?' <span style="font-size:10px;background:#fff3e0;color:#e65100;padding:1px 6px;border-radius:6px;">doğrudan</span>':'')) : '<span style="color:#c0392b;">Boşta (ekip atanmamış)</span>';
  var bAd = _ekipEsc(baslikEtiket(se.baslik));
  return '<div style="margin-top:12px;padding:10px 12px;background:var(--gri-acik);border-radius:8px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'
    + '<div style="font-size:13px;"><div>📌 Başlık: <b>'+bAd+'</b></div><div style="margin-top:3px;">👥 Sorumlu ekip: <b>'+ekipAd+'</b></div></div>'
    + (isAdmin ? '<button class="btn btn-yesil btn-kucuk" onclick="isletmeBaslikDegistirAc(\''+anEsc+'\')">🔧 Başlığını / Ekibini Değiştir</button>' : '')
    + '</div></div>';
}

var _baslikDegisArama = '';
function isletmeBaslikDegistirAc(an){
  var i=_isletmeBulAnahtar(an); if(!i) return;
  _baslikDegisArama='';
  var ov=document.getElementById('baslik-degis-overlay'); if(ov) ov.remove();
  ov=document.createElement('div');
  ov.id='baslik-degis-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:100001;display:flex;align-items:flex-end;justify-content:center;';
  ov.addEventListener('click',function(e){ if(e.target===ov) ov.remove(); });
  var box=document.createElement('div');
  box.id='baslik-degis-box';
  box.style.cssText='background:#fff;width:100%;max-width:480px;border-radius:16px 16px 0 0;padding:18px;max-height:82vh;overflow:auto;';
  ov.appendChild(box);
  document.body.appendChild(ov);
  _baslikDegisCiz(an);
  setTimeout(function(){var e=document.getElementById('baslik-degis-ara');if(e)e.focus();},80);
}
function _baslikDegisCiz(an){
  var i=_isletmeBulAnahtar(an); var box=document.getElementById('baslik-degis-box'); if(!i||!box) return;
  var anEsc=_ekipEsc(an).replace(/'/g,"\\'");
  var se=isletmeSorumluEkip(i);
  var manuelMi = (typeof manuelBaslik!=='undefined' && manuelBaslik[an]);
  // İlk açılışta statik kısım (input dahil) bir kez oluşturulur; sonraki çağrılarda dokunulmaz.
  if (!document.getElementById('baslik-degis-ara')) {
    var h='<div style="font-weight:700;font-size:16px;margin-bottom:2px;">'+_ekipEsc(i.isletmeAdi||an)+'</div>';
    h+='<div style="font-size:12px;color:var(--gri);margin-bottom:4px;">Şu an: '+_ekipEsc(baslikEtiket(se.baslik))+(se.ekip?(' • '+_ekipEsc(se.ekip.ad||se.ekip.id)):' • boşta')+(manuelMi?' • <b>manuel</b>':' • otomatik')+'</div>';
    h+='<div style="font-size:12px;color:var(--gri);margin-bottom:12px;">Yeni bir başlık seç (işletme o başlığın ekibine geçer). Başlık ara:</div>';
    h+='<input type="text" id="baslik-degis-ara" placeholder="🔍 mahalle, köy veya üretim..." style="width:100%;margin-bottom:10px;">';
    h+='<div id="baslik-degis-sonuclar"></div>';
    h+='<div id="baslik-degis-alt"></div>';
    box.innerHTML=h;
    var inp=document.getElementById('baslik-degis-ara');
    inp.addEventListener('input',function(){ _baslikDegisArama=this.value; _baslikDegisGuncelle(an); });
  }
  _baslikDegisGuncelle(an);
}
function _baslikDegisGuncelle(an){
  var sonuclar=document.getElementById('baslik-degis-sonuclar');
  var altDiv=document.getElementById('baslik-degis-alt');
  if(!sonuclar||!altDiv) return;
  var anEsc=_ekipEsc(an).replace(/'/g,"\\'");
  var ara=_baslikDegisArama.trim().toLocaleLowerCase('tr');
  var sh='';
  if(ara){
    var liste=(typeof tumBasliklarListe==='function')?tumBasliklarListe():[];
    var bulunan=liste.filter(function(b){ return b.ad.toLocaleLowerCase('tr').indexOf(ara)>=0; }).slice(0,40);
    if(!bulunan.length) sh='<div style="font-size:13px;color:var(--gri);padding:8px 0;">Eşleşen başlık yok.</div>';
    bulunan.forEach(function(b){
      var ek=(typeof baslikEkibiBul==='function')?baslikEkibiBul(b):null;
      var rozet=ek?'<span style="background:#e8f0fe;color:#1a56c4;border-radius:6px;padding:1px 7px;font-size:10px;font-weight:600;">'+_ekipEsc(ek.ad||ek.id)+'</span>':'<span style="background:#fdecea;color:#c0392b;border-radius:6px;padding:1px 7px;font-size:10px;font-weight:600;">Boşta</span>';
      var tipEt=b.tip==='uretim'?'Üretim':b.tip==='koy'?'Köy':'Mahalle';
      var keyEsc=_ekipEsc(b.key).replace(/'/g,"\\'");
      sh+='<div onclick="isletmeBaslikUygula(\''+anEsc+'\',\''+b.tip+'\',\''+keyEsc+'\')" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 11px;border:1px solid var(--sinir);border-radius:9px;margin-bottom:6px;cursor:pointer;">'
        +'<div style="min-width:0;"><div style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_ekipEsc(b.ad)+'</div><div style="font-size:10px;color:var(--gri);">'+tipEt+'</div></div>'+rozet+'</div>';
    });
    var araEsc=_ekipEsc(ara).replace(/'/g,"\\'");
    sh+='<div style="border-top:1px dashed var(--sinir);margin-top:8px;padding-top:10px;">';
    sh+='<div style="font-size:12px;color:var(--gri);margin-bottom:6px;">Bulunamadıysa yeni başlık ekle:</div>';
    sh+='<div style="display:flex;gap:6px;align-items:center;">';
    sh+='<select id="baslik-yeni-tip-'+anEsc.replace(/[^a-zA-Z0-9]/g,'_')+'" style="flex:1;padding:7px 8px;border:1px solid var(--sinir);border-radius:7px;font-size:12px;">';
    sh+='<option value="mahalle">🏘️ Mahalle</option>';
    sh+='<option value="koy">🌾 Köy/Kasaba</option>';
    sh+='<option value="uretim">🏭 Üretim kategorisi</option>';
    sh+='</select>';
    sh+='<button onclick="_baslikDegisYeniEkle(\''+anEsc+'\',\''+araEsc+'\')" style="padding:7px 13px;background:var(--yesil);color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">+ Ekle</button>';
    sh+='</div></div>';
  }
  sonuclar.innerHTML=sh;
  var manuelBaslikVal=(typeof manuelBaslik!=='undefined')?manuelBaslik[an]:null;
  var ah='<div style="border-top:1px solid var(--sinir);margin-top:10px;padding-top:10px;">';
  ah+='<div style="font-size:12px;font-weight:600;margin-bottom:6px;">Doğrudan ekibe ata (kategorisinden bağımsız):</div>';
  (typeof EKIPLER!=='undefined'?EKIPLER:[]).forEach(function(e){
    var _aktif=(typeof manuelEkip!=='undefined' && manuelEkip[an]===e.id);
    ah+='<button class="btn '+(_aktif?'btn-yesil':'btn-gri')+'" style="width:100%;margin-bottom:6px;text-align:left;" onclick="isletmeEkibeAta(\''+anEsc+'\',\''+_ekipEsc(e.id).replace(/\x27/g,"\\x27")+'\')">'+(_aktif?'✓ ':'')+_ekipEsc(e.ad||e.id)+'</button>';
  });
  if(typeof manuelEkip!=='undefined' && manuelEkip[an]) ah+='<button class="btn btn-gri" style="width:100%;margin-bottom:8px;" onclick="isletmeEkipOverrideKaldir(\''+anEsc+'\')">↺ Doğrudan ekip atamasını kaldır</button>';
  ah+='<div style="border-top:1px dashed var(--sinir);margin:10px 0;"></div>';
  if(manuelBaslikVal) ah+='<button class="btn btn-gri" style="width:100%;margin-bottom:8px;" onclick="isletmeOtomatigeDondur(\''+anEsc+'\')">↺ Otomatiğe döndür (adresine göre)</button>';
  ah+='<button class="btn" style="width:100%;margin-bottom:8px;background:#fdecea;color:#c0392b;" onclick="isletmeYoksayEt(\''+anEsc+'\')">⏸️ Bu işletmeyi yoksay</button>';
  ah+='<button class="btn btn-gri" style="width:100%;" onclick="var o=document.getElementById(\'baslik-degis-overlay\');if(o)o.remove();">İptal</button>';
  ah+='</div>';
  altDiv.innerHTML=ah;
}
function _baslikDegisYeniEkle(an, deger){
  if(!isAdmin){ bildirimGoster('Bu işlemi sadece admin yapabilir.','hata'); return; }
  deger = deger.trim();
  if(!deger){ bildirimGoster('Başlık adı boş olamaz.','hata'); return; }
  var anKey = an.replace(/[^a-zA-Z0-9]/g,'_');
  var tipEl = document.getElementById('baslik-yeni-tip-'+anKey);
  var tip = tipEl ? tipEl.value : 'mahalle';
  var key = deger;
  if(tip==='mahalle'){
    if(MERKEZ_MAHALLE_MASTER.indexOf(deger)>=0){ bildirimGoster('Bu mahalle zaten mevcut.','hata'); return; }
    MERKEZ_MAHALLE_MASTER.push(deger);
    MAHALLE_EKSTRA.push(deger);
  } else if(tip==='koy'){
    if(KOY_MASTER.indexOf(deger)>=0){ bildirimGoster('Bu köy/kasaba zaten mevcut.','hata'); return; }
    KOY_MASTER.push(deger);
    KOY_EKSTRA.push(deger);
  } else if(tip==='uretim'){
    if(TUM_URETIM_KATEGORILER.find(function(x){return x.label===deger;})){ bildirimGoster('Bu kategori zaten mevcut.','hata'); return; }
    key = 'x_'+Date.now();
    TUM_URETIM_KATEGORILER.push({id:key, label:deger, anahtar:[], ekstra:true});
    KAT_EKSTRA.push({id:key, label:deger});
  }
  try{ _ekipSayiCache=null; }catch(e){}
  if(typeof ekstraBasliklarKaydet==='function') ekstraBasliklarKaydet();
  isletmeBaslikUygula(an, tip, key);
}
function isletmeBaslikUygula(an, tip, key){
  var i=_isletmeBulAnahtar(an);
  manuelBaslik[an]={tip:tip,key:key};
  if(typeof manuelEkip!=='undefined') delete manuelEkip[an];
  if(typeof manuelEkipKaydet==='function') manuelEkipKaydet();
  if(typeof manuelBaslikKaydet==='function') manuelBaslikKaydet();
  var yeniEk=(typeof baslikEkibiBul==='function')?baslikEkibiBul({tip:tip,key:key}):null;
  degisiklikEkle((i&&i.isletmeAdi?i.isletmeAdi:an)+' → '+baslikEtiket({tip:tip,key:key})+(yeniEk?(' ['+(yeniEk.ad||yeniEk.id)+']'):' [boşta]'));
  if(yeniEk && typeof ekipKullanicilarinaBildir==='function') ekipKullanicilarinaBildir(yeniEk.id, '➕ Şu işletme sorumluluğunuza eklendi: '+((i&&i.isletmeAdi)||an));
  if(typeof bildirimGoster==='function') bildirimGoster('Başlık güncellendi → '+baslikEtiket({tip:tip,key:key}),'basari');
  var o=document.getElementById('baslik-degis-overlay'); if(o)o.remove();
  _detayTazele(an);
}
function isletmeOtomatigeDondur(an){
  var i=_isletmeBulAnahtar(an);
  if(typeof manuelBaslik!=='undefined') delete manuelBaslik[an];
  if(typeof manuelEkip!=='undefined') delete manuelEkip[an];
  if(typeof manuelEkipKaydet==='function') manuelEkipKaydet();
  if(typeof manuelBaslikKaydet==='function') manuelBaslikKaydet();
  degisiklikEkle((i&&i.isletmeAdi?i.isletmeAdi:an)+' → otomatik başlığa döndürüldü');
  if(typeof bildirimGoster==='function') bildirimGoster('Otomatik başlığa döndürüldü','basari');
  var o=document.getElementById('baslik-degis-overlay'); if(o)o.remove();
  _detayTazele(an);
}
function isletmeYoksayEt(an){
  var i=_isletmeBulAnahtar(an);
  if(typeof yoksayListesi!=='undefined' && yoksayListesi.indexOf(an)<0) yoksayListesi.push(an);
  if(typeof yoksayKaydet==='function') yoksayKaydet();
  degisiklikEkle((i&&i.isletmeAdi?i.isletmeAdi:an)+' → yoksayıldı');
  if(typeof bildirimGoster==='function') bildirimGoster('İşletme yoksayıldı','uyari');
  var o=document.getElementById('baslik-degis-overlay'); if(o)o.remove();
  _detayTazele(an);
}
function isletmeYoksayKaldir(an){
  var i=_isletmeBulAnahtar(an);
  if(typeof yoksayListesi!=='undefined'){ var ix=yoksayListesi.indexOf(an); if(ix>=0) yoksayListesi.splice(ix,1); }
  if(typeof yoksayKaydet==='function') yoksayKaydet();
  degisiklikEkle((i&&i.isletmeAdi?i.isletmeAdi:an)+' → yoksaydan çıkarıldı');
  if(typeof bildirimGoster==='function') bildirimGoster('Yoksaydan çıkarıldı','basari');
  _detayTazele(an);
}
window.isletmeBaslikDegistirAc=isletmeBaslikDegistirAc;
window._baslikDegisCiz=_baslikDegisCiz;
window._baslikDegisGuncelle=_baslikDegisGuncelle;
window.isletmeBaslikUygula=isletmeBaslikUygula;
window.isletmeOtomatigeDondur=isletmeOtomatigeDondur;
window.isletmeYoksayEt=isletmeYoksayEt;
function isletmeEkibeAta(an, ekipId){
  var i=_isletmeBulAnahtar(an);
  if(typeof manuelEkip==='undefined') return;
  manuelEkip[an]=ekipId;
  if(typeof manuelEkipKaydet==='function') manuelEkipKaydet();
  var ek=(typeof ekipBul==='function')?ekipBul(ekipId):null;
  degisiklikEkle((i&&i.isletmeAdi?i.isletmeAdi:an)+' → doğrudan ekip: '+(ek?(ek.ad||ek.id):ekipId));
  if(ek && typeof ekipKullanicilarinaBildir==='function') ekipKullanicilarinaBildir(ekipId, '➕ Şu işletme sorumluluğunuza eklendi: '+((i&&i.isletmeAdi)||an));
  if(typeof bildirimGoster==='function') bildirimGoster('İşletme doğrudan '+(ek?(ek.ad||ek.id):'ekibe')+' atandı','basari');
  var o=document.getElementById('baslik-degis-overlay'); if(o)o.remove();
  _detayTazele(an);
}
function isletmeEkipOverrideKaldir(an){
  var i=_isletmeBulAnahtar(an);
  if(typeof manuelEkip!=='undefined') delete manuelEkip[an];
  if(typeof manuelEkipKaydet==='function') manuelEkipKaydet();
  degisiklikEkle((i&&i.isletmeAdi?i.isletmeAdi:an)+' → doğrudan ekip ataması kaldırıldı');
  if(typeof bildirimGoster==='function') bildirimGoster('Doğrudan ekip ataması kaldırıldı','basari');
  var o=document.getElementById('baslik-degis-overlay'); if(o)o.remove();
  _detayTazele(an);
}
window.isletmeEkibeAta=isletmeEkibeAta;
window.isletmeEkipOverrideKaldir=isletmeEkipOverrideKaldir;
window.isletmeYoksayKaldir=isletmeYoksayKaldir;
function degisiklikPanelGoster(){
  var el=document.getElementById('haric-liste-panel'); if(!el) return;
  if(!degisiklikGunlugu || !degisiklikGunlugu.length){
    el.innerHTML='<div class="bos-durum"><div class="ikon">📝</div><p>Henüz bir değişiklik yapmadın.</p></div>';
    return;
  }
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="font-size:13px;color:var(--gri);">Panelinde yaptığın son değişiklikler</div><button class="btn btn-gri btn-kucuk" onclick="degisiklikGunluguTemizle()">🗑️ Temizle</button></div>';
  degisiklikGunlugu.forEach(function(d){
    var t=new Date(d.tarih);
    var ts=t.toLocaleDateString('tr')+' '+t.toLocaleTimeString('tr',{hour:'2-digit',minute:'2-digit'});
    h+='<div style="padding:9px 11px;border:1px solid var(--sinir);border-radius:9px;margin-bottom:7px;"><div style="font-size:13px;">'+_ekipEsc(d.metin)+'</div><div style="font-size:10px;color:var(--gri);margin-top:3px;">'+ts+'</div></div>';
  });
  el.innerHTML=h;
}
function degisiklikGunluguTemizle(){
  if(!confirm('Tüm değişiklik kaydı silinsin mi?')) return;
  degisiklikGunlugu=[]; try{localStorage.setItem(DEGISIKLIK_KEY,'[]');}catch(e){}
  degisiklikPanelGoster();
}
window.degisiklikPanelGoster=degisiklikPanelGoster;
window.degisiklikGunluguTemizle=degisiklikGunluguTemizle;
