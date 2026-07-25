const MAX_BODY_BYTES = 220_000;
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const DAILY_QUOTA = 20;
const encoder = new TextEncoder();

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') ?? '';
  const allowlist = (env.ALLOWED_ORIGINS ?? 'https://sage0316.github.io')
    .split(',').map(value => value.trim()).filter(Boolean);
  return allowlist.includes(origin) ? origin : '';
}

function response(request, env, body, status = 200) {
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
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BODY_BYTES) throw new Error('payload_too_large');
  const text = await request.text();
  if (encoder.encode(text).byteLength > MAX_BODY_BYTES) throw new Error('payload_too_large');
  return JSON.parse(text);
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function issueToken(installationId, env) {
  const payload = `${installationId}.${Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS}`;
  return `${payload}.${await sign(payload, env.INSTALL_TOKEN_SECRET)}`;
}

async function authenticate(request, env) {
  const raw = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [installationId, expiry, signature] = parts;
  if (!/^[a-f0-9-]{20,64}$/i.test(installationId) || Number(expiry) < Date.now() / 1000) return null;
  const expected = await sign(`${installationId}.${expiry}`, env.INSTALL_TOKEN_SECRET);
  if (signature.length !== expected.length) return null;
  let mismatch = 0;
  for (let index = 0; index < signature.length; index += 1) mismatch |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0 ? installationId : null;
}

function validRequest(body) {
  if (!body || typeof body !== 'object' || typeof body.date !== 'string' || body.date.length > 40) return false;
  if (!Array.isArray(body.records) || body.records.length < 1 || body.records.length > 96) return false;
  return body.records.every(record =>
    record && typeof record === 'object'
    && /^\d{2}:\d{2}$/.test(record.slotTime)
    && ['text', 'photo', 'video', 'audio'].includes(record.type)
    && typeof record.content === 'string' && record.content.length <= 2_000
    && typeof record.caption === 'string' && record.caption.length <= 500);
}

function validResult(value, recordCount) {
  return value && typeof value === 'object'
    && typeof value.title === 'string' && value.title.length <= 30
    && typeof value.closing === 'string' && value.closing.length <= 80
    && typeof value.mood === 'string' && value.mood.length <= 40
    && typeof value.emojis === 'string' && value.emojis.length <= 20
    && typeof value.bgMusic === 'string' && value.bgMusic.length <= 60
    && ['calm', 'bright', 'emotional', 'piano', 'ukulele', 'nostalgic'].includes(value.bgmTrack)
    && Array.isArray(value.captions) && value.captions.length <= recordCount
    && Array.isArray(value.diaryEmojis) && value.diaryEmojis.length <= recordCount;
}

async function enforceQuota(installationId, env) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `quota:${day}:${installationId}`;
  const used = Number(await env.AI_STATE.get(key) ?? 0);
  if (used >= DAILY_QUOTA) return false;
  await env.AI_STATE.put(key, String(used + 1), { expirationTtl: 2 * 24 * 60 * 60 });
  return true;
}

async function rateAllowed(env, key) {
  if (!env.AI_RATE_LIMITER) return true;
  return (await env.AI_RATE_LIMITER.limit({ key })).success;
}

async function callProvider(body, env) {
  const prompt = `하루 기록을 한국어로 간결하게 연출하라. 사실을 만들지 말고 기록 순서를 유지하라.
JSON만 반환: {"title":"30자 이하","closing":"80자 이하","mood":"40자 이하","emojis":"이모지","bgMusic":"설명","bgmTrack":"calm|bright|emotional|piano|ukulele|nostalgic","captions":["기록별 30자 이하"],"diaryEmojis":["기록별 이모지 또는 빈 문자열"]}
날짜: ${body.date}
기록: ${JSON.stringify(body.records)}`;
  const providerResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!providerResponse.ok) throw new Error('provider_error');
  const providerBody = await providerResponse.json();
  const text = providerBody.content?.find(part => part.type === 'text')?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('invalid_provider_output');
  const result = JSON.parse(match[0]);
  if (!validResult(result, body.records.length)) throw new Error('invalid_provider_output');
  return result;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);
    if (request.method === 'OPTIONS') {
      if (!origin) return response(request, env, { error: 'origin_not_allowed' }, 403);
      return new Response(null, { headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      } });
    }
    if (url.pathname === '/health' && request.method === 'GET') return response(request, env, { ok: true });
    if (!origin) return response(request, env, { error: 'origin_not_allowed' }, 403);
    if (request.method !== 'POST') return response(request, env, { error: 'method_not_allowed' }, 405);

    try {
      if (url.pathname === '/v1/install') {
        const body = await readJson(request);
        if (!/^[a-f0-9-]{20,64}$/i.test(body?.installationId ?? '')) {
          return response(request, env, { error: 'invalid_installation' }, 400);
        }
        const clientKey = request.headers.get('CF-Connecting-IP') || body.installationId;
        if (!await rateAllowed(env, `install:${clientKey}`)) {
          return response(request, env, { error: 'rate_limit_exceeded' }, 429);
        }
        return response(request, env, { token: await issueToken(body.installationId, env) });
      }
      if (url.pathname === '/v1/direct') {
        const installationId = await authenticate(request, env);
        if (!installationId) return response(request, env, { error: 'unauthorized' }, 401);
        if (!await rateAllowed(env, `direct:${installationId}`)) {
          return response(request, env, { error: 'rate_limit_exceeded' }, 429);
        }
        const body = await readJson(request);
        if (!validRequest(body)) return response(request, env, { error: 'invalid_request' }, 400);
        if (!await enforceQuota(installationId, env)) return response(request, env, { error: 'daily_quota_exceeded' }, 429);
        return response(request, env, { result: await callProvider(body, env) });
      }
      return response(request, env, { error: 'not_found' }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'internal_error';
      if (message === 'payload_too_large') return response(request, env, { error: message }, 413);
      if (error instanceof SyntaxError) return response(request, env, { error: 'invalid_json' }, 400);
      return response(request, env, { error: 'analysis_unavailable' }, 502);
    }
  },
};
