/* Cloudflare Worker — Gıda Denetim push tetikleyici.
 *
 * Akış:
 *   1. Kayıt olan istemci buraya POST eder: { idToken, tip:"yeni-kayit", ad }
 *   2. idToken, Firebase'in public API anahtarıyla doğrulanır (sahte istek engellenir)
 *   3. Service Account ile Google OAuth access token alınır (RS256 imzalı JWT)
 *   4. Admin kullanıcı belgesi Firestore'dan okunur → fcmTokenlari
 *   5. Her token'a FCM HTTP v1 ile bildirim gönderilir
 *
 * Gerekli secret/var (wrangler.toml + `wrangler secret put`):
 *   SERVICE_ACCOUNT   (secret)  : Firebase service account JSON (tek satır)
 *   FIREBASE_API_KEY  (var)     : public web API key
 *   PROJECT_ID        (var)     : gidadenetim-d829c
 *   ADMIN_UID         (var)     : sIKGnuwKj7cAMGnPvJg3BF1JWXf1
 *   ALLOW_ORIGIN      (var)     : https://ihatilgan.github.io
 */

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST gerekli' }, 405, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'gecersiz govde' }, 400, cors); }
    const { idToken, tip, ad } = body || {};
    if (!idToken) return json({ error: 'idToken yok' }, 401, cors);

    // 1) Caller doğrulama — public API key ile accounts:lookup
    const caller = await verifyIdToken(idToken, env.FIREBASE_API_KEY);
    if (!caller) return json({ error: 'gecersiz token' }, 401, cors);

    // 2) Service account ile access token
    const sa = JSON.parse(env.SERVICE_ACCOUNT);
    const accessToken = await getAccessToken(sa);

    // 3) Admin token'larını oku
    const tokens = await adminTokenlari(env.PROJECT_ID, env.ADMIN_UID, accessToken);
    if (!tokens.length) return json({ ok: true, sent: 0, info: 'admin token yok' }, 200, cors);

    // 4) Bildirim içeriği (şimdilik yeni-kayit)
    const title = 'Yeni kayıt isteği';
    const bodyTxt = (ad || 'Bir kullanıcı') + ' onay bekliyor';

    let sent = 0;
    const olu = [];
    for (const t of tokens) {
      const r = await fcmGonder(env.PROJECT_ID, accessToken, t, title, bodyTxt, { tip: tip || 'yeni-kayit' });
      if (r.ok) sent++;
      else if (r.remove) olu.push(t);
    }
    // Geçersiz token'ları temizle
    if (olu.length) await tokenSil(env.PROJECT_ID, env.ADMIN_UID, accessToken, tokens, olu);

    return json({ ok: true, sent }, 200, cors);
  }
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
  });
}

// ---- ID token doğrulama (public REST) ----
async function verifyIdToken(idToken, apiKey) {
  const res = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + apiKey,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.users && data.users.length ? data.users[0] : null;
}

// ---- Service Account -> OAuth access token (RS256 JWT) ----
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const scope = [
    'https://www.googleapis.com/auth/datastore',
    'https://www.googleapis.com/auth/firebase.messaging',
  ].join(' ');
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc(header) + '.' + enc(claim);
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = unsigned + '.' + b64url(new Uint8Array(sig));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('access_token alinamadi: ' + JSON.stringify(data));
  return data.access_token;
}

async function importPrivateKey(pem) {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

function b64url(bytes) {
  let s = btoa(String.fromCharCode.apply(null, bytes));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---- Firestore: admin fcmTokenlari oku ----
async function adminTokenlari(projectId, adminUid, accessToken) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + projectId +
    '/databases/(default)/documents/kullanicilar/' + adminUid;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
  if (!res.ok) return [];
  const doc = await res.json();
  const f = doc.fields && doc.fields.fcmTokenlari;
  if (!f || !f.arrayValue || !f.arrayValue.values) return [];
  return f.arrayValue.values.map((v) => v.stringValue).filter(Boolean);
}

// ---- FCM HTTP v1 gönder ----
async function fcmGonder(projectId, accessToken, token, title, body, data) {
  const url = 'https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send';
  const message = {
    message: {
      token,
      notification: { title, body },
      webpush: { notification: { title, body }, fcm_options: { link: 'app.html' } },
      data: data || {},
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  const code = err && err.error && err.error.status;
  const remove = code === 'NOT_FOUND' || code === 'INVALID_ARGUMENT' || code === 'UNREGISTERED';
  return { ok: false, remove };
}

// ---- Geçersiz token'ları admin belgesinden çıkar ----
async function tokenSil(projectId, adminUid, accessToken, hepsi, silinecek) {
  const kalan = hepsi.filter((t) => silinecek.indexOf(t) < 0);
  const url = 'https://firestore.googleapis.com/v1/projects/' + projectId +
    '/databases/(default)/documents/kullanicilar/' + adminUid +
    '?updateMask.fieldPaths=fcmTokenlari';
  const fields = { fcmTokenlari: { arrayValue: { values: kalan.map((t) => ({ stringValue: t })) } } };
  await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  }).catch(() => {});
}
