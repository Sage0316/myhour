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

// 'meme'은 앨범에서 고른 짤·사진 — 빠지면 짤이 든 하루가 invalid_request로 전부 거절된다
const RECORD_TYPES = ['text', 'photo', 'video', 'audio', 'meme'];
const BGM_TRACKS = ['calm', 'bright', 'emotional', 'piano', 'ukulele', 'nostalgic', 'sad'];
const MOOD_CHIPS = ['잔잔함', '뿌듯함', '감성', '웃김', '정신없음', '슬픔', '짜증', '지침'];

function validRequest(body) {
  if (!body || typeof body !== 'object' || typeof body.date !== 'string' || body.date.length > 40) return false;
  if (!Array.isArray(body.records) || body.records.length < 1 || body.records.length > 96) return false;
  return body.records.every(record =>
    record && typeof record === 'object'
    && /^\d{2}:\d{2}$/.test(record.slotTime)
    && RECORD_TYPES.includes(record.type)
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
    && BGM_TRACKS.includes(value.bgmTrack)
    && (value.moodChip === undefined || MOOD_CHIPS.includes(value.moodChip))
    && Array.isArray(value.captions) && value.captions.length <= recordCount
    && Array.isArray(value.recordEmojis) && value.recordEmojis.length <= recordCount;
}

// 모델이 규격을 살짝 어겨도(길이 초과, moodChip 오타, 구버전 필드명) 버리지 않고 다듬는다
const CLICHE_CLOSING_PATTERNS = [
  /이\s*순간들이?\s*모여/,
  /순간들이?\s*쌓여/,
  /나를\s*만든/,
  /소중한\s*순간/,
  /빛나는\s*하루/,
  /기억될\s*하루/,
  /오늘도\s*나답게/,
  /하루가\s*완성/,
  /충분했던?\s*하루/,
];

function fallbackClosing(records) {
  const last = records.at(-1);
  const detail = (
    last?.caption?.trim()
    || (last?.type === 'text' ? last.content.trim() : '')
  ).replace(/\s+/g, ' ').replace(/[.!?。]+$/, '').slice(0, 48);
  if (detail) return `마지막 기록: ${detail}`.slice(0, 80);
  return {
    photo: '마지막으로 사진 한 장을 남겼다.',
    video: '마지막으로 영상 하나를 남겼다.',
    audio: '마지막으로 음성 하나를 남겼다.',
    meme: '마지막으로 저장한 이미지를 남겼다.',
  }[last?.type] ?? '마지막 기록에서 하루를 닫았다.';
}

export function normalizeResult(value, records) {
  const recordCount = records.length;
  if (!value || typeof value !== 'object') return value;
  const trimAll = (list, max) => (Array.isArray(list) ? list : [])
    .slice(0, recordCount)
    .map(item => String(item ?? '').trim().slice(0, max));
  const rawClosing = String(value.closing ?? '').trim().slice(0, 80);
  const closing = CLICHE_CLOSING_PATTERNS.some(pattern => pattern.test(rawClosing))
    ? fallbackClosing(records)
    : rawClosing;
  return {
    ...value,
    title: String(value.title ?? '').trim().slice(0, 30),
    closing,
    mood: String(value.mood ?? '').trim().slice(0, 40),
    moodChip: MOOD_CHIPS.includes(value.moodChip) ? value.moodChip : undefined,
    emojis: String(value.emojis ?? '').trim().slice(0, 20),
    bgMusic: String(value.bgMusic ?? '').trim().slice(0, 60),
    bgmTrack: BGM_TRACKS.includes(value.bgmTrack) ? value.bgmTrack : 'calm',
    captions: trimAll(value.captions, 30),
    // recordEmojis가 현재 필드명 — 구버전 프롬프트 응답(diaryEmojis)도 받아준다
    recordEmojis: trimAll(value.recordEmojis ?? value.diaryEmojis, 12),
  };
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

function buildPrompt(body) {
  const lines = body.records.map((record, index) => {
    const parts = [`[${index + 1}] ${record.slotTime} · ${record.type}`];
    if (record.content) parts.push(`내용: ${record.content}`);
    if (record.caption) parts.push(`캡션: ${record.caption}`);
    return parts.join(' / ');
  }).join('\n');

  return `당신은 일상 브이로그 영상의 편집자입니다. 오늘(${body.date})의 기록으로 짧은 회고 영상을 편집합니다.

아래 기록은 시간순입니다 (번호가 빠를수록 먼저 일어난 일).
타입 안내: meme는 사용자가 앨범에서 고른 이미지(짤·밈이나 저장해둔 사진)로 그 순간의 기분이나 장면을 표현한 것이고, 캡션이 그 설명입니다.

${lines}

서사 규칙 (중요):
- 하루의 흐름은 기록 순서 그대로다. 제목·closing·mood를 쓸 때 앞뒤 순서나 인과를 절대 뒤집지 말 것. (예: "몸이 안 좋았다 → 영화를 봤다" 순서라면, 영화를 본 뒤 몸이 안 좋아진 것처럼 쓰면 안 됨)
- closing은 하루의 마지막 기록 이후의 상태에서 돌아보는 문장일 것.
- captions와 recordEmojis는 반드시 기록 번호 순서와 1:1로 대응시킬 것.
- 기록에 없는 사실을 만들지 말 것.

문체 규칙 (중요):
- 담백하고 건조하게. 일기 쓰듯이.
- 오글거리는 표현, 감탄사, 클리셰 금지: "이 순간들이 모여 나를 만든다", "소소한 행복", "충분했다", "빛나는 하루", "잘 살았다", "마무리합니다", "오늘도 나답게" 같은 말 절대 쓰지 말 것.
- 기록에 실제로 나온 단어와 장면을 재료로 쓸 것. 일반론 금지.
- 제목은 명사구로 짧게 끊어도 좋음 (예: "커피 두 잔의 날", "결국 또 떡볶이").
- 자막은 툭 던지는 반말 (예: "오늘의 첫 커피", "이 맛에 퇴근하지").

아래 JSON만 응답하세요 (설명 없이):
{
  "title": "오늘의 제목 (12자 이내, 명사구 선호)",
  "closing": "기록 속 한 장면을 집어서 담담하게 끝내는 한 문장 (35자 이내)",
  "mood": "오늘의 분위기 한 줄 (20자 이내)",
  "moodChip": "오늘 전체 무드. 반드시 다음 중 하나: ${MOOD_CHIPS.join(' | ')}",
  "emojis": "오늘의 기분·분위기를 나타내는 이모지 3-4개. 사물이 아니라 감정/분위기 계열로 (예: ✨🌙😮‍💨). 구체적 사물(💍📚)은 여기 쓰지 말 것 — 그건 recordEmojis용",
  "bgMusic": "어울리는 배경음악 분위기 (예: 잔잔한 피아노, lo-fi 힙합)",
  "bgmTrack": "실제 사용할 BGM. 반드시 다음 중 하나: ${BGM_TRACKS.join(' | ')}",
  "captions": ["기록 순서대로 각 기록에 달 자막 ${body.records.length}개, 각 15자 이내. 글(text) 기록은 본문이 이미 화면에 크게 보이므로 본문을 반복하는 자막 금지 — 덧붙일 말이 없으면 빈 문자열 \\"\\""],
  "recordEmojis": ["기록 순서대로 ${body.records.length}개 — 타입 상관없이 모든 기록에 대해. 그 기록 하나의 내용을 그림처럼 나타내는 이모지 딱 1개 (글은 본문 기준, 사진·짤·음성은 캡션 기준. 예: '떡볶이 먹음'→🍢, '야근함'→💼, '금반지 찾으러'→💍). 내용만으로 뭘 넣을지 애매하면 아무거나 넣지 말고 빈 문자열 \\"\\" — 관계없는 이모지가 붙는 것보다 없는 게 낫다"]
}`;
}

async function callProvider(body, env) {
  // Workers에서 api.anthropic.com을 직접 부르면 Cloudflare→Cloudflare 봇 방어로 403
  // "Request not allowed"가 난다. PROVIDER_URL에 AI Gateway 엔드포인트를 넣어 우회한다
  // (게이트웨이 인증을 켰다면 CF_AIG_TOKEN도 함께). README 참고.
  const providerUrl = env.PROVIDER_URL || 'https://api.anthropic.com/v1/messages';
  const providerResponse = await fetch(providerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      ...(env.CF_AIG_TOKEN ? { 'cf-aig-authorization': `Bearer ${env.CF_AIG_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 700,
      // JSON만 받으면 되니 thinking은 명시적으로 꺼서 파싱 실패와 토큰 낭비를 막는다
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: buildPrompt(body) }],
    }),
  });
  if (!providerResponse.ok) throw new Error('provider_error');
  const providerBody = await providerResponse.json();
  const text = providerBody.content?.find(part => part.type === 'text')?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('invalid_provider_output');
  const result = normalizeResult(JSON.parse(match[0]), body.records);
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
