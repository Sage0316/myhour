// MYHOUR 푸시 서버 — Cloudflare Worker
// 역할: (1) 구독 저장/삭제, (2) 30분마다 크론으로 각 구독자의 기록 시간에 맞춰 Web Push 발송
// Web Push 암호화(RFC 8291 aes128gcm)와 VAPID(RFC 8292)를 WebCrypto로 직접 구현.

// ─── 유틸 ───────────────────────────────────────────────────────────────────

const te = new TextEncoder();

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...arrs) {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8,
  );
  return new Uint8Array(bits);
}

// ─── RFC 8291: 페이로드 암호화 (aes128gcm) ───────────────────────────────────

export async function encryptPayload(p256dhB64url, authB64url, payloadStr) {
  const uaPub = b64urlToBytes(p256dhB64url);   // 65 bytes (uncompressed point)
  const authSecret = b64urlToBytes(authB64url); // 16 bytes

  const asKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  );
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey(
    'raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256),
  );

  const keyInfo = concat(te.encode('WebPush: info\0'), uaPub, asPub);
  const prk = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, prk, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, prk, te.encode('Content-Encoding: nonce\0'), 12);

  const plaintext = concat(te.encode(payloadStr), new Uint8Array([2])); // 0x02 = 마지막 레코드 구분자
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext),
  );

  // aes128gcm 헤더: salt(16) | record_size(4, BE) | keyid_len(1) | keyid(=송신자 공개키 65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concat(salt, rs, new Uint8Array([asPub.length]), asPub);
  return concat(header, ciphertext);
}

// ─── RFC 8292: VAPID 서명 ────────────────────────────────────────────────────

async function vapidAuthHeader(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const enc = obj => bytesToB64url(te.encode(JSON.stringify(obj)));
  const signingInput = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud, exp, sub: `mailto:${env.VAPID_SUBJECT}` })}`;
  const key = await crypto.subtle.importKey(
    'jwk', JSON.parse(env.VAPID_PRIVATE_JWK),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(signingInput),
  ));
  return `vapid t=${signingInput}.${bytesToB64url(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

// ─── 푸시 발송 ──────────────────────────────────────────────────────────────

async function sendPush(sub, payloadStr, env) {
  const body = await encryptPayload(sub.keys.p256dh, sub.keys.auth, payloadStr);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': await vapidAuthHeader(sub.endpoint, env),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '1800',
      'Urgency': 'high',
    },
    body,
  });
  return res.status;
}

// ─── 구독 저장 키 ────────────────────────────────────────────────────────────

async function subKey(endpoint) {
  const digest = await crypto.subtle.digest('SHA-256', te.encode(endpoint));
  return bytesToB64url(new Uint8Array(digest)).slice(0, 32);
}

function parseHM(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + (m || 0);
}

// ─── 핸들러 ─────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': 'https://sage0316.github.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// AI 분석 프록시 — API 키 없는 사용자(친구 테스트용)도 쓸 수 있게 서버의 키로 대신 호출한다.
// 남용 방지로 하루 총량/기기(IP)별 한도를 KV(SUBS 재사용)에 카운트한다.
const DIRECTOR_TOTAL_DAILY_CAP = 80;
const DIRECTOR_IP_DAILY_CAP = 15;
const DIRECTOR_TTL_SEC = 60 * 60 * 26; // 하루 조금 넘게 — 자정 근처 요청도 안전하게 걸치게

async function handleDirector(request, env, json) {
  const origin = request.headers.get('Origin');
  if (origin !== 'https://sage0316.github.io') return json({ error: '허용되지 않은 출처' }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI 분석이 아직 설정되지 않았어요' }, 503);

  const body = await request.json().catch(() => null);
  const prompt = body?.prompt;
  if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) return json({ error: '잘못된 요청' }, 400);

  const day = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const totalKey = `rl_total_${day}`;
  const ipKey = `rl_ip_${day}_${ip}`;
  const [totalRaw, ipRaw] = await Promise.all([env.SUBS.get(totalKey), env.SUBS.get(ipKey)]);
  const total = parseInt(totalRaw || '0', 10);
  const ipCount = parseInt(ipRaw || '0', 10);
  if (total >= DIRECTOR_TOTAL_DAILY_CAP) return json({ error: '오늘 전체 사용량을 다 썼어요. 내일 다시 시도해주세요.' }, 429);
  if (ipCount >= DIRECTOR_IP_DAILY_CAP) return json({ error: '오늘 이 기기의 사용량을 다 썼어요. 내일 다시 시도해주세요.' }, 429);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 700,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    await Promise.all([
      env.SUBS.put(totalKey, String(total + 1), { expirationTtl: DIRECTOR_TTL_SEC }),
      env.SUBS.put(ipKey, String(ipCount + 1), { expirationTtl: DIRECTOR_TTL_SEC }),
    ]);
  }
  return json(data, res.status);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

    if (url.pathname === '/health') return json({ ok: true });

    if (request.method !== 'POST') return json({ error: 'method' }, 405);

    if (url.pathname === '/subscribe') {
      const body = await request.json();
      const { subscription, interval, startTime, endTime, tzOffsetMin } = body;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh) return json({ error: 'bad subscription' }, 400);
      const record = {
        sub: subscription,
        interval: [30, 60, 120].includes(interval) ? interval : 60,
        start: parseHM(startTime || '09:00'),
        end: parseHM(endTime || '22:00'),
        tz: Number.isFinite(tzOffsetMin) ? tzOffsetMin : -540, // 기본 KST
      };
      await env.SUBS.put(await subKey(subscription.endpoint), JSON.stringify(record));
      return json({ ok: true });
    }

    if (url.pathname === '/unsubscribe') {
      const { endpoint } = await request.json();
      if (endpoint) await env.SUBS.delete(await subKey(endpoint));
      return json({ ok: true });
    }

    if (url.pathname === '/director') return handleDirector(request, env, json);

    if (url.pathname === '/test') {
      // 구독 직후 확인용: 그 구독자에게 즉시 테스트 푸시
      const { endpoint } = await request.json();
      const raw = await env.SUBS.get(await subKey(endpoint));
      if (!raw) return json({ error: 'not found' }, 404);
      const { sub } = JSON.parse(raw);
      const status = await sendPush(sub, JSON.stringify({
        title: 'MYHOUR', body: '알림 연결 완료! 이렇게 기록 시간을 알려드릴게요 ✨',
      }), env);
      return json({ ok: status < 300, status });
    }

    return json({ error: 'not found' }, 404);
  },

  // 30분마다 실행 — 각 구독자의 로컬 시간 기준으로 기록 시간이면 푸시
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      const now = new Date();
      const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
      let cursor;
      do {
        const list = await env.SUBS.list({ cursor });
        cursor = list.list_complete ? undefined : list.cursor;
        for (const { name } of list.keys) {
          const raw = await env.SUBS.get(name);
          if (!raw) continue;
          const rec = JSON.parse(raw);
          // tz는 getTimezoneOffset() 값 (KST=-540): local = utc - tz
          const localMin = ((utcMin - rec.tz) % 1440 + 1440) % 1440;
          const since = localMin - rec.start;
          if (since < 0 || localMin > rec.end) continue;
          if (since % rec.interval >= 30) continue; // 크론 주기(30분) 안에 든 슬롯만
          const status = await sendPush(rec.sub, JSON.stringify({
            title: 'MYHOUR', body: '지금 이 순간을 기록해볼까요? 📝',
          }), env);
          if (status === 404 || status === 410) await env.SUBS.delete(name); // 만료된 구독 정리
        }
      } while (cursor);
    })());
  },
};
