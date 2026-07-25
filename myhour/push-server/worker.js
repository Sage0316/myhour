const encoder = new TextEncoder();
const MAX_BODY_BYTES = 32_000;
const TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;

function fromBase64url(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function toBase64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...arrays) {
  const output = new Uint8Array(arrays.reduce((total, item) => total + item.length, 0));
  let offset = 0;
  for (const array of arrays) { output.set(array, offset); offset += array.length; }
  return output;
}

async function hkdf(salt, input, info, length) {
  const key = await crypto.subtle.importKey('raw', input, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8,
  ));
}

export async function encryptPayload(publicKey, auth, payload) {
  const userPublic = fromBase64url(publicKey);
  const authSecret = fromBase64url(auth);
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  );
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));
  const userKey = await crypto.subtle.importKey(
    'raw', userPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );
  const secret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userKey }, serverKeys.privateKey, 256,
  ));
  const info = concat(encoder.encode('WebPush: info\0'), userPublic, serverPublic);
  const prk = await hkdf(authSecret, secret, info, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, prk, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, prk, encoder.encode('Content-Encoding: nonce\0'), 12);
  const plaintext = concat(encoder.encode(payload), new Uint8Array([2]));
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, plaintext));
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concat(salt, recordSize, new Uint8Array([serverPublic.length]), serverPublic, ciphertext);
}

async function vapidHeader(endpoint, env) {
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;
  const encode = value => toBase64url(encoder.encode(JSON.stringify(value)));
  const input = `${encode({ typ: 'JWT', alg: 'ES256' })}.${encode({
    aud: new URL(endpoint).origin, exp: expiry, sub: `mailto:${env.VAPID_SUBJECT}`,
  })}`;
  const key = await crypto.subtle.importKey(
    'jwk', JSON.parse(env.VAPID_PRIVATE_JWK),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(input),
  ));
  return `vapid t=${input}.${toBase64url(signature)}, k=${env.VAPID_PUBLIC_KEY}`;
}

async function sendPush(subscription, payload, env) {
  const body = await encryptPayload(subscription.keys.p256dh, subscription.keys.auth, payload);
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': await vapidHeader(subscription.endpoint, env),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '1800',
      'Urgency': 'high',
    },
    body,
  });
  return response.status;
}

async function subscriptionKey(endpoint) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(endpoint));
  return toBase64url(new Uint8Array(digest)).slice(0, 32);
}

function parseTime(value) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const origins = (env.ALLOWED_ORIGINS || 'https://sage0316.github.io')
    .split(',').map(value => value.trim()).filter(Boolean);
  return origins.includes(origin) ? origin : '';
}

function jsonResponse(request, env, body, status = 200) {
  const origin = allowedOrigin(request, env);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
      ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    },
  });
}

async function readJson(request) {
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY_BYTES) throw new Error('payload_too_large');
  const text = await request.text();
  if (encoder.encode(text).byteLength > MAX_BODY_BYTES) throw new Error('payload_too_large');
  return JSON.parse(text);
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return toBase64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function issueToken(installationId, env) {
  const payload = `${installationId}.${Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS}`;
  return `${payload}.${await sign(payload, env.INSTALL_TOKEN_SECRET)}`;
}

async function authenticate(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const [installationId, expiry, signature, extra] = token.split('.');
  if (extra !== undefined || !/^[a-f0-9-]{20,64}$/i.test(installationId || '') || Number(expiry) < Date.now() / 1000) return null;
  const expected = await sign(`${installationId}.${expiry}`, env.INSTALL_TOKEN_SECRET);
  if ((signature || '').length !== expected.length) return null;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0 ? installationId : null;
}

function validSubscription(body) {
  const subscription = body?.subscription;
  return subscription && typeof subscription.endpoint === 'string'
    && subscription.endpoint.startsWith('https://') && subscription.endpoint.length <= 2_048
    && typeof subscription.keys?.p256dh === 'string' && subscription.keys.p256dh.length <= 256
    && typeof subscription.keys?.auth === 'string' && subscription.keys.auth.length <= 128
    && [30, 60, 120].includes(body.interval)
    && /^\d{2}:\d{2}$/.test(body.startTime) && /^\d{2}:\d{2}$/.test(body.endTime)
    && Number.isInteger(body.tzOffsetMin) && Math.abs(body.tzOffsetMin) <= 840;
}

async function rateAllowed(env, key) {
  if (!env.PUSH_RATE_LIMITER) return true;
  return (await env.PUSH_RATE_LIMITER.limit({ key })).success;
}

function endpointHostAllowed(endpoint, env) {
  try {
    const host = new URL(endpoint).hostname.toLowerCase();
    const configured = (env.PUSH_ENDPOINT_HOSTS || 'fcm.googleapis.com,updates.push.services.mozilla.com,web.push.apple.com')
      .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    return configured.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);
    if (request.method === 'OPTIONS') {
      if (!origin) return jsonResponse(request, env, { error: 'origin_not_allowed' }, 403);
      return new Response(null, { headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      } });
    }
    if (url.pathname === '/health' && request.method === 'GET') return jsonResponse(request, env, { ok: true });
    if (!origin) return jsonResponse(request, env, { error: 'origin_not_allowed' }, 403);
    if (request.method !== 'POST') return jsonResponse(request, env, { error: 'method_not_allowed' }, 405);

    try {
      if (url.pathname === '/v1/install') {
        const body = await readJson(request);
        if (!/^[a-f0-9-]{20,64}$/i.test(body?.installationId || '')) {
          return jsonResponse(request, env, { error: 'invalid_installation' }, 400);
        }
        const clientKey = request.headers.get('CF-Connecting-IP') || body.installationId;
        if (!await rateAllowed(env, `install:${clientKey}`)) {
          return jsonResponse(request, env, { error: 'rate_limit_exceeded' }, 429);
        }
        return jsonResponse(request, env, { token: await issueToken(body.installationId, env) });
      }

      const owner = await authenticate(request, env);
      if (!owner) return jsonResponse(request, env, { error: 'unauthorized' }, 401);
      if (!await rateAllowed(env, `${url.pathname}:${owner}`)) {
        return jsonResponse(request, env, { error: 'rate_limit_exceeded' }, 429);
      }

      if (url.pathname === '/v1/subscriptions') {
        const body = await readJson(request);
        if (!validSubscription(body) || !endpointHostAllowed(body.subscription?.endpoint, env)) {
          return jsonResponse(request, env, { error: 'invalid_subscription' }, 400);
        }
        await env.SUBS.put(await subscriptionKey(body.subscription.endpoint), JSON.stringify({
          owner,
          sub: body.subscription,
          interval: body.interval,
          start: parseTime(body.startTime),
          end: parseTime(body.endTime),
          tz: body.tzOffsetMin,
          lastDeliverySlot: '',
        }));
        return jsonResponse(request, env, { ok: true });
      }

      if (url.pathname === '/v1/subscriptions/delete') {
        const body = await readJson(request);
        if (typeof body?.endpoint !== 'string') return jsonResponse(request, env, { error: 'invalid_endpoint' }, 400);
        const key = await subscriptionKey(body.endpoint);
        const raw = await env.SUBS.get(key);
        if (raw && JSON.parse(raw).owner !== owner) return jsonResponse(request, env, { error: 'forbidden' }, 403);
        await env.SUBS.delete(key);
        return jsonResponse(request, env, { ok: true });
      }
      return jsonResponse(request, env, { error: 'not_found' }, 404);
    } catch (error) {
      if (error instanceof SyntaxError) return jsonResponse(request, env, { error: 'invalid_json' }, 400);
      if (error?.message === 'payload_too_large') return jsonResponse(request, env, { error: 'payload_too_large' }, 413);
      return jsonResponse(request, env, { error: 'internal_error' }, 500);
    }
  },

  async scheduled(_event, env, context) {
    context.waitUntil((async () => {
      const now = new Date();
      const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      let cursor;
      do {
        const page = await env.SUBS.list({ cursor });
        cursor = page.list_complete ? undefined : page.cursor;
        for (const { name } of page.keys) {
          const raw = await env.SUBS.get(name);
          if (!raw) continue;
          const record = JSON.parse(raw);
          const localMinutes = ((utcMinutes - record.tz) % 1440 + 1440) % 1440;
          const elapsed = localMinutes - record.start;
          if (elapsed < 0 || localMinutes > record.end || elapsed % record.interval >= 30) continue;
          const localDate = new Date(now.getTime() - record.tz * 60_000).toISOString().slice(0, 10);
          const deliverySlot = `${localDate}:${Math.floor(elapsed / record.interval)}`;
          if (record.lastDeliverySlot === deliverySlot) continue;
          record.lastDeliverySlot = deliverySlot;
          await env.SUBS.put(name, JSON.stringify(record));
          const status = await sendPush(record.sub, JSON.stringify({
            title: '하꾸', body: '지금 한 시간을 기록해볼까요? 📸',
          }), env);
          if (status === 404 || status === 410) await env.SUBS.delete(name);
        }
      } while (cursor);
    })());
  },
};
