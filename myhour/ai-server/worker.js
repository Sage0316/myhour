const MAX_BODY_BYTES = 220_000;
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
// 한 날짜의 연출은 첫 연출 1번 + 다시 연출 3번까지다. 매번 OpenAI 비용이 나간다.
const DIRECTIONS_PER_DATE = 4;
// date는 클라이언트가 보내는 값이라 바꿔 가며 보내면 날짜별 한도를 피할 수 있다 — 하루 전체에도 상한을 둔다
const DAILY_QUOTA = 8;
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

const INTENSITY_LABELS = ['약하게', '보통', '강하게'];

function validRequest(body) {
  if (!body || typeof body !== 'object' || typeof body.date !== 'string' || body.date.length > 40) return false;
  // 구버전 앱은 intensity를 안 보낸다 — 없으면 '보통'으로 본다
  if (body.intensity !== undefined && !INTENSITY_LABELS.includes(body.intensity)) return false;
  // mood는 선택값. 강도만 바꿔 다시 부를 때 무드가 튀지 않도록 화면에 보이는 값을 고정한다
  if (body.mood !== undefined && !MOOD_CHIPS.includes(body.mood)) return false;
  // lang은 선택값. 영어판(MyHour)은 'en'을 보내 제목·마무리·자막을 영어로 받는다. 구버전 앱은 안 보낸다(=한국어)
  if (body.lang !== undefined && body.lang !== 'ko' && body.lang !== 'en') return false;
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

// 사용자가 쓴 문장을 그대로 되돌려주지 않는다 — 마지막 기록을 복붙한 마무리는
// "하루 요약"이 아니라 메아리라서, 타입별 중립 문장만 쓴다
function fallbackClosing(records, lang) {
  const last = records.at(-1);
  if (lang === 'en') {
    return {
      text: 'Wrote one last line and closed the day.',
      photo: 'Left one last photo for the day.',
      video: 'Left one last clip for the day.',
      audio: 'Left one last voice note for the day.',
      meme: 'Saved one last picture for the day.',
    }[last?.type] ?? 'Closed the day with one last moment.';
  }
  return {
    text: '마지막 문장을 쓰고 하루를 닫았다.',
    photo: '마지막으로 사진 한 장을 남겼다.',
    video: '마지막으로 영상 하나를 남겼다.',
    audio: '마지막으로 음성 하나를 남겼다.',
    meme: '마지막으로 저장한 이미지를 남겼다.',
  }[last?.type] ?? '마지막 기록에서 하루를 닫았다.';
}

// 클리셰 문구만 걸러낸다. 예전엔 기록의 키워드를 문자 그대로 포함해야 통과시켰는데,
// 멀쩡한 요약 문장이 키워드가 안 겹친다는 이유로 전부 fallback으로 교체되는 부작용이 컸다
function isGenericClosing(closing) {
  return CLICHE_CLOSING_PATTERNS.some(pattern => pattern.test(closing));
}

export function normalizeResult(value, records, lockedMood, lang) {
  const recordCount = records.length;
  if (!value || typeof value !== 'object') return value;
  const trimAll = (list, max) => (Array.isArray(list) ? list : [])
    .slice(0, recordCount)
    .map(item => String(item ?? '').trim().slice(0, max));
  const rawClosing = String(value.closing ?? '').trim().slice(0, 80);
  const closing = rawClosing && !isGenericClosing(rawClosing)
    ? rawClosing
    : fallbackClosing(records, lang);
  return {
    ...value,
    title: String(value.title ?? '').trim().slice(0, 30),
    closing,
    mood: String(value.mood ?? '').trim().slice(0, 40),
    // 사용자가 무드를 고정해 보냈으면 모델 응답보다 그쪽이 우선이다.
    // 프롬프트로만 부탁하면 모델이 어길 수 있고, 그러면 강도만 올렸는데 무드가 튄다.
    moodChip: MOOD_CHIPS.includes(lockedMood) ? lockedMood
      : MOOD_CHIPS.includes(value.moodChip) ? value.moodChip : undefined,
    emojis: String(value.emojis ?? '').trim().slice(0, 20),
    bgMusic: String(value.bgMusic ?? '').trim().slice(0, 60),
    bgmTrack: BGM_TRACKS.includes(value.bgmTrack) ? value.bgmTrack : 'calm',
    captions: trimAll(value.captions, 30),
    // recordEmojis가 현재 필드명 — 구버전 프롬프트 응답(diaryEmojis)도 받아준다
    recordEmojis: trimAll(value.recordEmojis ?? value.diaryEmojis, 12),
  };
}

function quotaKeys(installationId, date) {
  const day = new Date().toISOString().slice(0, 10);
  return {
    daily: `quota:${day}:${installationId}`,
    perDate: `quota-date:${day}:${installationId}:${encodeURIComponent(date)}`,
  };
}

/** 한도를 넘었으면 오류 코드를, 아니면 null을 돌려준다. 횟수는 연출이 성공한 뒤에만 센다. */
async function quotaError(installationId, date, env) {
  const keys = quotaKeys(installationId, date);
  if (Number(await env.AI_STATE.get(keys.perDate) ?? 0) >= DIRECTIONS_PER_DATE) return 'redo_limit_exceeded';
  if (Number(await env.AI_STATE.get(keys.daily) ?? 0) >= DAILY_QUOTA) return 'daily_quota_exceeded';
  return null;
}

async function consumeQuota(installationId, date, env) {
  const keys = quotaKeys(installationId, date);
  for (const key of [keys.perDate, keys.daily]) {
    const used = Number(await env.AI_STATE.get(key) ?? 0);
    await env.AI_STATE.put(key, String(used + 1), { expirationTtl: 2 * 24 * 60 * 60 });
  }
}

async function rateAllowed(env, key) {
  if (!env.AI_RATE_LIMITER) return true;
  return (await env.AI_RATE_LIMITER.limit({ key })).success;
}

export function buildPrompt(body) {
  const lines = body.records.map((record, index) => {
    const parts = [`[${index + 1}] ${record.slotTime} · ${record.type}`];
    if (record.content) parts.push(`내용: ${record.content}`);
    if (record.caption) parts.push(`캡션: ${record.caption}`);
    return parts.join(' / ');
  }).join('\n');

  // 사용자가 화면에서 보고 있는 무드. 강도만 바꿔 다시 부를 때 무드가 튀지 않도록 고정한다.
  const moodLock = body.mood
    ? `\n- **이번 요청은 moodChip을 반드시 "${body.mood}"로 유지하세요.** 사용자가 이미 그 무드로 보고 있습니다`
    : '';

  // 영어판: 규칙은 그대로 두고 사람에게 보이는 글만 영어로 쓰게 한다. moodChip·bgmTrack은 키라서 그대로다.
  const english = body.lang === 'en'
    ? `\n\n출력 언어 (가장 중요):
- 이 사용자는 영어 사용자입니다. title, closing, mood, bgMusic, captions는 **모두 자연스러운 영어**로 쓰세요. 기록이 한국어여도 영어로 씁니다
- 영어 길이: title 24자 이내, closing 70자 이내, mood 36자 이내, 각 caption 26자 이내
- 영어 문체도 담백하고 건조하게, 일기처럼. 자막은 짧고 캐주얼하게 (예: "first coffee of the day", "this is why I clock out")
- 클리셰 금지: "little moments make me who I am", "small joys", "a day well lived", "another day, another blessing" 같은 말 쓰지 말 것
- moodChip과 bgmTrack은 아래에 적힌 한국어/영문 값 그대로 (번역하지 말 것)`
    : '';

  return `당신은 일상 브이로그 영상의 편집자입니다. 오늘(${body.date})의 기록으로 짧은 회고 영상을 편집합니다.

오늘의 감정 강도: **${INTENSITY_LABELS.includes(body.intensity) ? body.intensity : '보통'}**
이 강도는 사용자가 직접 고른 값이며, **감정의 세기만 뜻합니다. 감정의 종류를 바꾸라는 뜻이 아닙니다.**
- 강도가 반영되는 곳: 제목·closing의 문체 온도, bgmTrack의 무게
- 강도가 **절대 바꾸지 못하는 것: mood와 moodChip**. 이 둘은 기록 내용만으로 정합니다
- 약하게면 담백하고 절제된 쪽으로, 강하게면 **같은 감정 안에서** 더 깊이 잠긴 쪽으로 씁니다
- 예: '잔잔함'에서 강도를 올려도 '분노'가 되지 않습니다. 잔잔함을 더 짙게 쓸 뿐입니다${moodLock}

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
- closing에는 반드시 실제 기록에 나온 구체적인 단어나 사물 이름을 하나 이상 그대로 넣을 것. "그 시간", "그 한 줄", "이 순간"처럼 기록 내용 없이도 쓸 수 있는 문장 금지.
- 기록에 실제로 나온 단어와 장면을 재료로 쓸 것. 일반론 금지.
- 제목은 명사구로 짧게 끊어도 좋음 (예: "커피 두 잔의 날", "결국 또 떡볶이").
- 자막은 툭 던지는 반말 (예: "오늘의 첫 커피", "이 맛에 퇴근하지").${english}

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

function directorResponseSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'title', 'closing', 'mood', 'moodChip', 'emojis',
      'bgMusic', 'bgmTrack', 'captions', 'recordEmojis',
    ],
    properties: {
      title: { type: 'string' },
      closing: { type: 'string' },
      mood: { type: 'string' },
      moodChip: { type: 'string', enum: MOOD_CHIPS },
      emojis: { type: 'string' },
      bgMusic: { type: 'string' },
      bgmTrack: { type: 'string', enum: BGM_TRACKS },
      captions: {
        type: 'array',
        items: { type: 'string' },
      },
      recordEmojis: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  };
}

// max_output_tokens에는 생각(reasoning) 토큰도 들어간다. 강도를 올리면 생각만으로 수천 토큰을 쓰므로
// low 시절 상한(4천)을 그대로 두면 답이 중간에 잘려 invalid_provider_output이 난다.
const OUTPUT_BUDGET = {
  low: { base: 1_000, cap: 4_000 },
  medium: { base: 8_000, cap: 12_000 },
  high: { base: 14_000, cap: 20_000 },
  xhigh: { base: 20_000, cap: 32_000 },
};

async function callProvider(body, env) {
  if (!env.OPENAI_API_KEY) throw new Error('provider_not_configured');
  const reasoningEffort = OUTPUT_BUDGET[env.OPENAI_REASONING_EFFORT] ? env.OPENAI_REASONING_EFFORT : 'medium';
  const budget = OUTPUT_BUDGET[reasoningEffort];
  const providerResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-6.1-sol',
      input: buildPrompt(body),
      reasoning: { effort: reasoningEffort },
      max_output_tokens: Math.min(budget.cap, budget.base + body.records.length * 30),
      // 일기 원문은 응답 생성에만 쓰고 OpenAI 측 저장 대상에서 제외한다.
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'hakku_direction',
          strict: true,
          schema: directorResponseSchema(),
        },
      },
    }),
  });
  if (!providerResponse.ok) {
    // 거절 이유를 코드로 구분해 둔다. 전부 analysis_unavailable로 뭉개면 "키가 죽었나,
    // 한도인가, 권한이 막혔나"를 밖에서 구분할 수 없어 오진이 나온다 (README 참고).
    // 응답 본문은 사용자 입력을 포함할 수 있으므로 로그에 남기지 않는다.
    console.error(
      'provider_rejected',
      providerResponse.status,
      providerResponse.headers.get('x-request-id') ?? '',
    );
    if (providerResponse.status === 401) throw new Error('provider_auth_failed');
    if (providerResponse.status === 403) throw new Error('provider_forbidden');
    if (providerResponse.status === 429) throw new Error('provider_rate_limited');
    if (providerResponse.status >= 500) throw new Error('provider_unavailable');
    throw new Error('provider_error');
  }
  const providerBody = await providerResponse.json().catch(() => {
    throw new Error('invalid_provider_output');
  });
  const text = providerBody.output
    ?.filter(item => item.type === 'message')
    .flatMap(item => item.content ?? [])
    .find(part => part.type === 'output_text')?.text ?? '';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('provider_output_not_json');
    throw new Error('invalid_provider_output');
  }
  const result = normalizeResult(parsed, body.records, body.mood, body.lang);
  if (!validResult(result, body.records.length)) {
    console.error('provider_output_invalid');
    throw new Error('invalid_provider_output');
  }
  return result;
}

// 코드 → HTTP 상태. 여기 없는 오류만 analysis_unavailable로 떨어진다.
// ── 구독 확인 (U13) ───────────────────────────────────────────────────────────
// 앱의 RevenueCat 사용자 ID = 설치 ID. REQUIRE_SUBSCRIPTION이 'true'일 때만 확인한다 —
// 웹 버전을 닫는 날(U16)까지는 꺼 둔다.
// Standard: 한 결제 기간에 연출한 날짜 15개까지 / Premium: 날짜 수 제한 없음 (날짜당 횟수 한도는 그대로)
const STANDARD_DAYS_PER_PERIOD = 15;
const SUBSCRIPTION_CACHE_SECONDS = 300;

/** RevenueCat /v1/subscribers 응답 → { plan, periodStart } 또는 null. Premium이 우선이다 */
export function parseSubscriber(body, now = Date.now()) {
  const entitlements = body?.subscriber?.entitlements ?? {};
  const subscriptions = body?.subscriber?.subscriptions ?? {};
  for (const plan of ['premium', 'standard']) {
    const entitlement = entitlements[plan];
    if (!entitlement) continue;
    const expires = entitlement.expires_date ? Date.parse(entitlement.expires_date) : Infinity;
    if (!(expires > now)) continue;
    const subscription = subscriptions[entitlement.product_identifier] ?? {};
    return { plan, periodStart: subscription.purchase_date ?? entitlement.purchase_date ?? 'unknown' };
  }
  return null;
}

async function subscriptionFor(installationId, env) {
  const cacheKey = `sub:${installationId}`;
  const cached = await env.AI_STATE.get(cacheKey);
  if (cached) return JSON.parse(cached);
  if (!env.REVENUECAT_SECRET_KEY) throw new Error('subscription_check_unavailable');
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(installationId)}`, {
    headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error('subscription_check_unavailable');
  const subscription = parseSubscriber(await res.json());
  // 구독 없음은 저장하지 않는다 — 방금 결제한 사람이 5분 동안 막히면 안 된다
  if (subscription) await env.AI_STATE.put(cacheKey, JSON.stringify(subscription), { expirationTtl: SUBSCRIPTION_CACHE_SECONDS });
  return subscription;
}

function standardKey(installationId, subscription) {
  return `std:${installationId}:${subscription.periodStart}`;
}

async function standardDates(installationId, subscription, env) {
  return JSON.parse(await env.AI_STATE.get(standardKey(installationId, subscription)) ?? '[]');
}

/** 구독 확인. 막아야 하면 오류 코드, 통과면 null */
async function subscriptionError(installationId, subscription, date, env) {
  if (!subscription) return 'subscription_required';
  if (subscription.plan !== 'standard') return null;
  const dates = await standardDates(installationId, subscription, env);
  return !dates.includes(date) && dates.length >= STANDARD_DAYS_PER_PERIOD ? 'standard_limit_reached' : null;
}

async function recordStandardDate(installationId, subscription, date, env) {
  if (subscription?.plan !== 'standard') return;
  const dates = await standardDates(installationId, subscription, env);
  if (dates.includes(date)) return;
  await env.AI_STATE.put(standardKey(installationId, subscription), JSON.stringify([...dates, date]), { expirationTtl: 40 * 24 * 60 * 60 });
}

const ERROR_STATUS = {
  subscription_check_unavailable: 503,
  provider_not_configured: 503,
  provider_auth_failed: 502,
  provider_forbidden: 502,
  provider_rate_limited: 503,
  provider_unavailable: 503,
  provider_error: 502,
  invalid_provider_output: 502,
};

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
        const subscription = env.REQUIRE_SUBSCRIPTION === 'true' ? await subscriptionFor(installationId, env) : null;
        if (env.REQUIRE_SUBSCRIPTION === 'true') {
          const denied = await subscriptionError(installationId, subscription, body.date, env);
          if (denied) return response(request, env, { error: denied }, 402);
        }
        const limited = await quotaError(installationId, body.date, env);
        if (limited) return response(request, env, { error: limited }, 429);
        // 공급자 오류로 실패한 시도는 다시 연출 횟수를 쓰지 않는다
        const result = await callProvider(body, env);
        await consumeQuota(installationId, body.date, env);
        await recordStandardDate(installationId, subscription, body.date, env);
        return response(request, env, { result });
      }
      return response(request, env, { error: 'not_found' }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'internal_error';
      if (message === 'payload_too_large') return response(request, env, { error: message }, 413);
      if (error instanceof SyntaxError) return response(request, env, { error: 'invalid_json' }, 400);
      if (ERROR_STATUS[message]) return response(request, env, { error: message }, ERROR_STATUS[message]);
      console.error('unhandled_error', message, error instanceof Error ? error.stack : '');
      return response(request, env, { error: 'analysis_unavailable' }, 502);
    }
  },
};
