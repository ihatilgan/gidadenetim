# Push Bildirim Kurulumu (Cloudflare Workers — kartsız/ücretsiz)

Telefon kapalıyken/uygulama kapalıyken admin'e push bildirimi göndermek için.
İki bölüm var: **(A) Firebase Console ayarları**, **(B) Cloudflare Worker deploy**.
İkisi de bittiğinde, app.html içine iki değer yazılacak (VAPID anahtarı + Worker adresi).

---

## A. Firebase Console (5 dk)

1. https://console.firebase.google.com → **gidadenetim** projesi
2. **⚙️ Project Settings → Cloud Messaging** sekmesi
   - "Cloud Messaging API (V1)" **Enabled** olmalı (genelde otomatik açık).
3. Aynı sayfada **Web Push certificates → Generate key pair**
   - Oluşan **public key** (uzun bir metin) → bunu not edin. (VAPID anahtarı)
4. **Project Settings → Service accounts → Generate new private key**
   - İnen **JSON dosyasını** saklayın. (Worker'a secret olarak verilecek.)
   - ⚠️ Bu dosya gizlidir, repoya/clouda yüklemeyin, kimseyle paylaşmayın.

---

## B. Cloudflare Worker deploy (10 dk)

Bilgisayarınızda (Node.js kurulu olmalı):

```bash
npm install -g wrangler        # bir kez
cd push-worker
wrangler login                 # tarayıcıdan Cloudflare hesabı (ücretsiz; kart yok)

# Service account JSON'u secret olarak ekle (komut çalışınca JSON içeriğini yapıştır):
wrangler secret put SERVICE_ACCOUNT

# Deploy:
wrangler deploy
```

Deploy sonunda bir adres verir, örn:
`https://gidadenetim-push.<hesabınız>.workers.dev`
Bu adresi not edin. (Worker URL)

> Not: `wrangler.toml` içindeki FIREBASE_API_KEY/PROJECT_ID/ADMIN_UID/ALLOW_ORIGIN
> zaten doldurulmuş. ALLOW_ORIGIN'i sitenizin gerçek origin'i yapın
> (GitHub Pages için `https://ihatilgan.github.io`).

---

## C. app.html'e iki değeri yazma

`app.html` içinde şu iki satırı bulup doldurun (ben placeholder bıraktım):

```js
var FCM_VAPID_KEY = 'BURAYA_VAPID_PUBLIC_KEY';   // A.3'teki public key
var PUSH_WORKER_URL = '';                          // B'deki worker.dev adresi
```

Bana bu iki değeri verirseniz ben de yazıp push'layabilirim.

---

## D. Test

1. Admin hesabıyla giriş → **Admin Panel → "Bildirimleri Aç"** butonu → izin ver.
   (Token Firestore'da `kullanicilar/<adminUID>.fcmTokenlari` altına kaydolur.)
2. Telefonu/sekmeyi kapatın.
3. Başka bir cihazdan yeni bir test hesabı **Kayıt Ol** yapın.
4. Admin cihazında sistem bildirimi düşmeli: "Yeni kayıt isteği — … onay bekliyor".

### iOS notu
iOS'ta web push yalnızca **ana ekrana eklenmiş PWA** için ve **iOS 16.4+** ile çalışır.
Safari sekmesinde çalışmaz. Admin, uygulamayı "Ana Ekrana Ekle" ile kurmalı,
sonra açıp "Bildirimleri Aç" demeli.

---

## Güvenlik notu
- Worker, isteği atan kişinin Firebase ID token'ını public API ile doğrular;
  yani yalnızca sistemde gerçekten kayıtlı/oturum açmış biri tetikleyebilir.
- Gönderme için gereken service account anahtarı **yalnızca Worker'da** (secret) durur,
  istemci koduna gömülmez.
- Geçersiz/expired FCM token'ları gönderim sırasında otomatik temizlenir.
