function kullaniciMenuToggle(e){ if(e&&e.stopPropagation)e.stopPropagation(); var m=document.getElementById('kullanici-menu'); if(m) m.style.display=(m.style.display==='none'||!m.style.display)?'block':'none'; }
function kullaniciMenuKapat(){ var m=document.getElementById('kullanici-menu'); if(m) m.style.display='none'; }
document.addEventListener('click', function(e){ var m=document.getElementById('kullanici-menu'); var b=document.getElementById('kullanici-ad-btn'); if(m&&m.style.display==='block'&&!m.contains(e.target)&&b&&!b.contains(e.target)) m.style.display='none'; });
function cikisYap(){ try{ if(typeof firestoreDinleyici!=='undefined'&&firestoreDinleyici){ firestoreDinleyici(); firestoreDinleyici=null; } }catch(e){} if(typeof firebase!=='undefined'&&firebase.auth){ firebase.auth().signOut().then(function(){ location.reload(); }).catch(function(){ location.reload(); }); } else { location.reload(); } }
function kullaniciAyarlariAc(){
  var ov=document.getElementById('kullanici-ayar-overlay'); if(ov)ov.remove();
  ov=document.createElement('div'); ov.id='kullanici-ayar-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:100003;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.addEventListener('click',function(e){ if(e.target===ov) ov.remove(); });
  var ekip=(typeof aktifEkip==='function')?aktifEkip():null;
  var ad=(typeof mevcutKullaniciAdi!=='undefined'?mevcutKullaniciAdi:'');
  var email=(typeof mevcutKullanici!=='undefined'&&mevcutKullanici?mevcutKullanici.email:'');
  var appSurum='v145';
  try { appSurum = localStorage.getItem('app_surum') || appSurum; } catch(e) {}
  var box=document.createElement('div');
  box.style.cssText='background:#fff;border-radius:14px;padding:20px;max-width:340px;width:100%;';
  box.innerHTML='<div style="font-weight:700;font-size:16px;margin-bottom:16px;">⚙️ Kullanıcı Ayarları</div>'
    +'<div style="font-size:12px;color:var(--gri);">Ad</div><div style="font-size:14px;margin-bottom:12px;">'+_ekipEsc(ad)+'</div>'
    +'<div style="font-size:12px;color:var(--gri);">E-posta</div><div style="font-size:14px;margin-bottom:12px;">'+_ekipEsc(email)+'</div>'
    +(ekip?('<div style="font-size:12px;color:var(--gri);">Ekip</div><div style="font-size:14px;margin-bottom:12px;">'+_ekipEsc(ekip.ad||ekip.id)+'</div>'):'')
    +'<div style="font-size:12px;color:var(--gri);">Uygulama sürümü</div><div style="font-size:14px;margin-bottom:12px;font-weight:600;">'+_ekipEsc(appSurum)+'</div>'
    +'<button class="btn btn-gri" style="width:100%;" onclick="var o=document.getElementById(\'kullanici-ayar-overlay\');if(o)o.remove();">Kapat</button>';
  ov.appendChild(box); document.body.appendChild(ov);
}
function yardimAc() {
  var ov = document.getElementById('yardim-overlay'); if (ov) ov.remove();
  ov = document.createElement('div'); ov.id = 'yardim-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:100003;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;-webkit-overflow-scrolling:touch;';
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:14px;padding:22px;max-width:420px;width:100%;margin:auto;';
  box.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">' +
      '<div style="font-weight:700;font-size:17px;">❓ Yardım &amp; Hakkında</div>' +
      '<button onclick="document.getElementById(\'yardim-overlay\').remove()" style="background:#f0f0f0;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;font-weight:600;">✕ Kapat</button>' +
    '</div>' +
    '<div style="font-weight:600;font-size:14px;margin-bottom:6px;color:#1a56c4;">🍽️ Uygulama Hakkında</div>' +
    '<p style="font-size:13px;color:#444;line-height:1.65;margin-bottom:14px;">Gıda Denetim, Afyonkarahisar gıda kontrol görevlilerinin işletme denetimlerini kayıt altına almasını, sorumluluk listelerini takip etmesini ve risk listelerini görüntülemesini sağlayan mobil uyumlu bir web uygulamasıdır.</p>' +
    '<div style="font-weight:600;font-size:14px;margin-bottom:6px;color:#1a56c4;">📋 Temel Kullanım</div>' +
    '<ul style="font-size:13px;color:#444;line-height:1.9;margin-bottom:14px;padding-left:18px;">' +
      '<li><b>Özet:</b> Ekibinizin denetim istatistikleri, risk listeleri ve son kayıtlar.</li>' +
      '<li><b>Denetim Ekle:</b> İşletme seçip denetim notu ve puanı girerek kayıt oluşturun.</li>' +
      '<li><b>Hızlı Denetim:</b> İşletme seçip olumlu hızlı denetim oluşturun. Bunu yaptığınızda işletme artık risk listenizde görünmeyecek. Hızlı denetim butonunu işletmenin içindeyken kullanmanız durumunda işletmenin koordinatları kayıt altına alınır; bu sayede bir sonraki gidişinizde karmaşık adreslere takılmadan harita sizi otomatik götürebilir.</li>' +
      '<li><b>Sorumluluklarım:</b> Ekibinize atanmış tüm işletmeleri listeler ve filtreler.</li>' +
      '<li><b>Yenile (🔄):</b> Güncel veriyi çekmek için sağ üstteki düğmeye basın.</li>' +
    '</ul>' +
    '<div style="font-weight:600;font-size:14px;margin-bottom:6px;color:#1a56c4;">👥 Ekip Sistemi</div>' +
    '<p style="font-size:13px;color:#444;line-height:1.65;margin-bottom:16px;">Her denetçi bir ekibe atanır. Özet ve risk listeleri yalnızca kendi ekibinizin sorumluluk alanındaki işletmeleri gösterir. Yönetici tüm ekipleri görebilir ve geçiş yapabilir.</p>' +
    '<div style="background:#fff8e1;border:1.5px solid #ffca28;border-radius:10px;padding:14px;margin-bottom:16px;">' +
      '<div style="font-weight:700;font-size:13px;color:#7a5c00;margin-bottom:7px;">🔒 KVKK Gizlilik Uyarısı</div>' +
      '<p style="font-size:12px;color:#5a4200;line-height:1.65;margin:0;">Bu uygulama aracılığıyla erişilen işletme adları, adresleri ve denetim sonuçları <b>gizli kurumsal veri</b> niteliğindedir.<br><br>Bu bilgilerin <b>kasten veya bilmeyerek</b> üçüncü kişilerle paylaşılması, <b>6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)</b> ve ilgili mevzuat kapsamında yasal sorumluluk doğurabilir.<br><br>Tüm verileri yalnızca resmî görev kapsamında ve yetkili kişilerle paylaşınız.</p>' +
    '</div>' +
    '<div style="text-align:center;font-size:12px;color:#aaa;padding-top:4px;">İsmail Hakkı Atılgan</div>';
  ov.appendChild(box); document.body.appendChild(ov);
}
window.yardimAc = yardimAc;
window.kullaniciMenuToggle=kullaniciMenuToggle; window.kullaniciMenuKapat=kullaniciMenuKapat; window.cikisYap=cikisYap; window.kullaniciAyarlariAc=kullaniciAyarlariAc;
