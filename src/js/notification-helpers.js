// ===== BİLDİRİM YARDIMCILARI (mevcut mesajlar sistemi üzerinden) =====
function bildirimMesajiGonder(aliciUid, metin){
  if(!aliciUid || typeof firebase==='undefined' || typeof mevcutKullanici==='undefined' || !mevcutKullanici) return;
  if(typeof konuIdOlustur!=='function') return;
  if(aliciUid===mevcutKullanici.uid) return;
  var konuId=konuIdOlustur(mevcutKullanici.uid, aliciUid);
  firebase.firestore().collection('mesajlar').doc(konuId).collection('iletiler').add({
    gonderen: mevcutKullanici.uid,
    gonderenAd: (typeof mevcutKullaniciAdi!=='undefined'?mevcutKullaniciAdi:'Sistem'),
    alici: aliciUid,
    metin: metin,
    zaman: firebase.firestore.FieldValue.serverTimestamp(),
    okundu: false
  }).catch(function(){});
}
// Bir ekibin tüm kullanıcılarına bildirim gönder
function ekipKullanicilarinaBildir(ekipId, metin){
  if(!ekipId || typeof firebase==='undefined') return;
  firebase.firestore().collection('kullanicilar').where('ekipId','==',ekipId).get().then(function(snap){
    snap.forEach(function(d){ bildirimMesajiGonder(d.id, metin); });
  }).catch(function(){});
}

// ===== ADMIN: KULLANICI SORUN BİLDİRİMLERİ EKRANI =====
function sorunlariGoster(){
  var el=document.getElementById('sorunlar-root'); if(!el) return;
  if(typeof firebase==='undefined'||!firebase.apps||!firebase.apps.length){ el.innerHTML='<p style="color:var(--gri);">Bağlantı yok.</p>'; return; }
  if(typeof mevcutKullanici==='undefined'||!mevcutKullanici){ el.innerHTML='<p style="color:var(--gri);">Giriş yapmanız gerekli.</p>'; return; }
  el.innerHTML='<p style="color:var(--gri);padding:10px;">Yükleniyor…</p>';
  var kol=(typeof DEV_MODU!=='undefined'&&DEV_MODU)?'sorun_bildirimleri_dev':'sorun_bildirimleri';
  var ref=firebase.firestore().collection(kol);
  var q=(typeof isAdmin!=='undefined'&&isAdmin)
    ? ref.orderBy('tarih','desc')
    : ref.where('bildirenUid','==',mevcutKullanici.uid);
  q.get().then(function(snap){
    if(snap.empty){ el.innerHTML='<div class="bos-durum"><div class="ikon">✅</div><p>Bekleyen sorun bildirimi yok.</p></div>'; return; }
    var acik=[], cozulen=[];
    snap.forEach(function(d){ var r=d.data(); r._id=d.id; (r.durum==='cozuldu'?cozulen:acik).push(r); });
    acik.sort(function(a,b){ return String(b.tarih||'').localeCompare(String(a.tarih||'')); });
    cozulen.sort(function(a,b){ return String(b.tarih||'').localeCompare(String(a.tarih||'')); });
    var h='';
    h+='<div style="font-weight:700;font-size:14px;margin-bottom:8px;">'+((typeof isAdmin!=='undefined'&&isAdmin)?'🟠 Açık':'🟠 Bildirdiklerim')+' ('+acik.length+')</div>';
    if(!acik.length) h+='<div style="font-size:13px;color:var(--gri);margin-bottom:12px;">Açık bildirim yok.</div>';
    acik.forEach(function(r){ h+=_sorunKart(r,false); });
    if(cozulen.length){
      h+='<div style="font-weight:700;font-size:14px;margin:16px 0 8px;">✅ Çözülen ('+cozulen.length+')</div>';
      cozulen.forEach(function(r){ h+=_sorunKart(r,true); });
    }
    el.innerHTML=h;
  }).catch(function(e){
    var msg=e&&e.message?e.message:'';
    if(/permission|insufficient/i.test(msg)){
      el.innerHTML='<p style="color:var(--kirmizi);">Yetki hatası: Firestore rules güncel olmayabilir veya bu hesap admin olarak tanımlı değil.</p>';
      return;
    }
    el.innerHTML='<p style="color:var(--kirmizi);">Hata: '+msg+'</p>';
  });
}
function _sorunKart(r, cozuldu){
  var t=new Date(r.tarih); var ts=t.toLocaleDateString('tr')+' '+t.toLocaleTimeString('tr',{hour:'2-digit',minute:'2-digit'});
  var h='<div style="border:1px solid var(--sinir);border-radius:10px;padding:12px;margin-bottom:9px;'+(cozuldu?'opacity:0.75;':'')+'">';
  h+='<div style="font-weight:600;font-size:14px;">'+_ekipEsc(r.isletmeAd||r.isletmeKey||'')+'</div>';
  h+='<div style="font-size:13px;margin-top:4px;">⚠️ '+_ekipEsc(r.metin||'')+'</div>';
  h+='<div style="font-size:11px;color:var(--gri);margin-top:5px;">'+_ekipEsc(r.bildirenAd||'')+(r.ekipAd?(' • '+_ekipEsc(r.ekipAd)):'')+' • '+ts+(r.kayitNo?(' • '+_ekipEsc(r.kayitNo)):'')+'</div>';
  if(cozuldu){
    h+='<div style="font-size:12px;color:var(--yesil);margin-top:6px;background:var(--yesil-acik);border-radius:6px;padding:6px 8px;">✅ '+_ekipEsc(r.cozumMetin||'Çözüldü')+'</div>';
  } else {
    h+='<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">';
    if(r.kayitNo) h+='<button class="btn btn-gri btn-kucuk" onclick="isletmeDetayModal(\''+_ekipEsc(r.kayitNo).replace(/\x27/g,"\\x27")+'\')">İşletmeyi Aç</button>';
    if(typeof isAdmin!=='undefined'&&isAdmin) h+='<button class="btn btn-yesil btn-kucuk" onclick="sorunCoz(\''+r._id+'\',\''+_ekipEsc(r.bildirenUid||'')+'\',\''+_ekipEsc(r.isletmeAd||'').replace(/\x27/g,"\\x27")+'\')">✓ Çözüldü olarak işaretle</button>';
    h+='</div>';
  }
  h+='</div>';
  return h;
}
function sorunCoz(docId, bildirenUid, isletmeAd){
  var cozum=prompt('Çözüm açıklaması (bildirene gidecek):','İşletme yeniden değerlendirildi.');
  if(cozum===null) return;
  cozum=(cozum||'').trim()||'Sonuçlandırıldı.';
  var kol=(typeof DEV_MODU!=='undefined'&&DEV_MODU)?'sorun_bildirimleri_dev':'sorun_bildirimleri';
  firebase.firestore().collection(kol).doc(docId).update({
    durum:'cozuldu', cozumMetin:cozum, cozumTarih:new Date().toISOString(),
    cozenAd:(typeof mevcutKullaniciAdi!=='undefined'?mevcutKullaniciAdi:'')
  }).then(function(){
    if(bildirenUid) bildirimMesajiGonder(bildirenUid, '✅ Bildiriminiz sonuçlandı — '+(isletmeAd||'')+': '+cozum);
    if(typeof bildirimGoster==='function') bildirimGoster('Bildirim çözüldü, bildirene mesaj gönderildi.','basari');
    sorunlariGoster();
  }).catch(function(e){ if(typeof bildirimGoster==='function') bildirimGoster('Hata: '+(e.message||''),'hata'); });
}
window.sorunlariGoster=sorunlariGoster;
window.sorunCoz=sorunCoz;
window.bildirimMesajiGonder=bildirimMesajiGonder;
window.ekipKullanicilarinaBildir=ekipKullanicilarinaBildir;
