// Eski/bozuk service worker ve önbellek durumundan BİR KEZE MAHSUS kurtul.
// Önceden bu blok her açılışta SW'yi siliyor, alttaki kayıt yeniden kuruyordu →
// sürekli churn + her açılışta ağır kütüphanelerin yeniden indirilmesi (telefonda
// dakikalarca takılma). Artık yalnızca bir kez çalışır, sonra SW kararlı kalır.
if ('serviceWorker' in navigator && !localStorage.getItem('_sw_reset_v47')) {
  try { localStorage.setItem('_sw_reset_v47', '1'); } catch(e){}
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    regs.forEach(function(reg) { reg.unregister(); });
  });
  caches.keys().then(function(names) {
    names.forEach(function(name) { caches.delete(name); });
  });
}
