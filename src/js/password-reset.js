function sifremiUnuttum(){
  var email=((document.getElementById('giris-email')||{}).value||'').trim();
  if(!email){ if(typeof bildirimGoster==='function') bildirimGoster('Önce e-posta adresinizi yazın, sonra bu butona basın.','uyari'); else alert('Önce e-posta adresinizi yazın.'); return; }
  if(typeof firebase==='undefined'||!firebase.auth){ if(typeof bildirimGoster==='function') bildirimGoster('Bağlantı kurulamadı, lütfen tekrar deneyin.','hata'); else alert('Bağlantı yok.'); return; }
  firebase.auth().sendPasswordResetEmail(email).then(function(){
    if(typeof bildirimGoster==='function') bildirimGoster('Parola sıfırlama bağlantısı '+email+' adresine gönderildi.','basari'); else alert('Sıfırlama e-postası gönderildi.');
  }).catch(function(e){
    var c=e&&e.code;
    var msg = c==='auth/user-not-found' ? 'Bu e-posta kayıtlı değil.' : c==='auth/invalid-email' ? 'Geçersiz e-posta adresi.' : c==='auth/missing-email' ? 'E-posta adresi gerekli.' : 'Gönderilemedi: '+((e&&e.message)||'');
    if(typeof bildirimGoster==='function') bildirimGoster(msg,'hata'); else alert(msg);
  });
}
window.sifremiUnuttum=sifremiUnuttum;
