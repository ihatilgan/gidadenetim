// Ağır kütüphaneler (Chart.js, jsQR) açılışta yüklenmez; yalnızca gerektiğinde tek sefer yüklenir.
(function(){
  var _kp = {};
  window.kutuphaneYukle = function(src){
    if (_kp[src]) return _kp[src];
    _kp[src] = new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = src; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function(){ resolve(); };
      s.onerror = function(){ _kp[src] = null; reject(new Error('Yuklenemedi: ' + src)); };
      document.head.appendChild(s);
    });
    return _kp[src];
  };
  window.CHART_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  window.JSQR_SRC  = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
  window.chartYukle = function(){ return (typeof Chart !== 'undefined') ? Promise.resolve() : window.kutuphaneYukle(window.CHART_SRC); };
  window.jsqrYukle  = function(){ return (typeof jsQR  !== 'undefined') ? Promise.resolve() : window.kutuphaneYukle(window.JSQR_SRC); };
})();
