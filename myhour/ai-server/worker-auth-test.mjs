import assert from 'node:assert/strict';
import worker, { normalizeResult, parseSubscriber } from './worker.js';

class MemoryKV {
  values = new Map();
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, value); }
}

const origin = 'https://sage0316.github.io';
const env = { AI_STATE: new MemoryKV(), ALLOWED_ORIGINS: origin, INSTALL_TOKEN_SECRET: 'test-secret' };
const request = (path, body, token, requestOrigin = origin) => new Request(`https://ai.example${path}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': requestOrigin,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(body),
});

const forbidden = await worker.fetch(request('/v1/install', { installationId: crypto.randomUUID() }, '', 'https://evil.example'), env);
assert.equal(forbidden.status, 403);

const installed = await worker.fetch(request('/v1/install', { installationId: crypto.randomUUID() }), env);
assert.equal(installed.status, 200);
const { token } = await installed.json();

const unauthorized = await worker.fetch(request('/v1/direct', {}, 'invalid'), env);
assert.equal(unauthorized.status, 401);

const invalid = await worker.fetch(request('/v1/direct', { date: '', records: [] }, token), env);
assert.equal(invalid.status, 400);

const limited = await worker.fetch(request('/v1/install', {
  installationId: crypto.randomUUID(),
}), {
  ...env,
  AI_RATE_LIMITER: { limit: async () => ({ success: false }) },
});
assert.equal(limited.status, 429);

const directorBase = {
  title: '라면 먹은 날',
  closing: '이 순간들이 모여 나를 만든다',
  mood: '조용한 밤',
  moodChip: '잔잔함',
  emojis: '😌',
  bgMusic: '잔잔한 피아노',
  bgmTrack: 'piano',
  captions: [''],
  recordEmojis: ['🍜'],
};
const records = [{ slotTime: '23:00', type: 'text', content: '라면 먹고 바로 잤다', caption: '' }];
const clicheReplaced = normalizeResult(directorBase, records).closing;
assert.notEqual(
  clicheReplaced,
  '이 순간들이 모여 나를 만든다',
  '감성 클리셰는 교체해야 한다',
);
assert.ok(
  !clicheReplaced.includes('라면 먹고 바로 잤다'),
  '교체된 closing이 사용자의 기록 원문을 그대로 되돌려주면 안 된다',
);
assert.equal(
  normalizeResult({ ...directorBase, closing: '라면 국물까지 다 마셨다.' }, records).closing,
  '라면 국물까지 다 마셨다.',
  '기록에 붙은 구체적인 closing은 유지해야 한다',
);
assert.equal(
  normalizeResult({ ...directorBase, closing: '늦은 밤에야 하루가 조용해졌다.' }, records).closing,
  '늦은 밤에야 하루가 조용해졌다.',
  '기록 키워드가 안 겹쳐도 멀쩡한 요약 문장은 유지해야 한다',
);
assert.equal(
  normalizeResult({ ...directorBase, closing: '' }, records).closing,
  '마지막 문장을 쓰고 하루를 닫았다.',
  '빈 closing은 타입별 중립 문장으로 채운다',
);
console.log('✅ AI AUTH/VALIDATION OK');

// ── 프로바이더 오류 코드 구분 ────────────────────────────────────────────────
// 예전엔 아래 경우가 전부 analysis_unavailable 하나로 뭉개져서, 인증 실패인지
// 한도 초과인지 공급자 거절인지 밖에서 구분할 수 없었다.
const directBody = {
  date: '8월 3일 월요일',
  records: [{ slotTime: '21:00', type: 'text', content: '라면 먹고 잤다', caption: '' }],
};

async function directWith(providerFetch, extraEnv = {}) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = providerFetch;
  try {
    const fresh = await worker.fetch(request('/v1/install', { installationId: crypto.randomUUID() }), env);
    const { token: freshToken } = await fresh.json();
    const res = await worker.fetch(request('/v1/direct', directBody, freshToken), {
      ...env,
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'gpt-5.6-sol',
      OPENAI_REASONING_EFFORT: 'low',
      ...extraEnv,
    });
    return { status: res.status, body: await res.json() };
  } finally {
    globalThis.fetch = realFetch;
  }
}

const providerStatus = status => async () => new Response('nope', { status });

for (const [status, code] of [[401, 'provider_auth_failed'], [403, 'provider_forbidden'], [429, 'provider_rate_limited'], [500, 'provider_unavailable'], [418, 'provider_error']]) {
  const out = await directWith(providerStatus(status));
  assert.equal(out.body.error, code, `프로바이더 ${status}는 ${code}로 구분해야 한다`);
  assert.notEqual(out.body.error, 'analysis_unavailable');
}

const noKey = await directWith(providerStatus(200), { OPENAI_API_KEY: '' });
assert.equal(noKey.body.error, 'provider_not_configured', 'API 키 미설정은 따로 알려야 한다');

const badOutput = await directWith(async () => new Response(JSON.stringify({
  output: [{ type: 'message', content: [{ type: 'output_text', text: '음... JSON은 못 주겠어요' }] }],
}), { status: 200 }));
assert.equal(badOutput.body.error, 'invalid_provider_output', '모델이 JSON을 안 주면 형식 오류로 구분해야 한다');

let capturedProviderRequest;
const goodOutput = await directWith(async (url, init) => {
  capturedProviderRequest = { url, init, body: JSON.parse(init.body) };
  return new Response(JSON.stringify({
    output: [{
      type: 'message',
      content: [{
        type: 'output_text',
        text: JSON.stringify({ ...directorBase, closing: '라면 국물을 다 마시고 불을 껐다.' }),
      }],
    }],
  }), { status: 200 });
});
assert.equal(goodOutput.status, 200);
assert.equal(capturedProviderRequest.url, 'https://api.openai.com/v1/responses');
assert.equal(capturedProviderRequest.init.headers.Authorization, 'Bearer test-key');
assert.equal(capturedProviderRequest.init.headers['x-api-key'], undefined);
assert.equal(capturedProviderRequest.body.model, 'gpt-5.6-sol');
assert.equal(capturedProviderRequest.body.reasoning.effort, 'low');
assert.equal(capturedProviderRequest.body.store, false, '사용자 기록이 OpenAI에 저장되지 않게 요청해야 한다');
assert.equal(capturedProviderRequest.body.text.format.type, 'json_schema');
assert.equal(capturedProviderRequest.body.text.format.strict, true);
assert.equal(capturedProviderRequest.body.text.format.schema.additionalProperties, false);
assert.equal(typeof capturedProviderRequest.body.input, 'string');

console.log('✅ AI ERROR CODES OK');

// ── 감정 강도가 무드를 바꾸면 안 된다 ────────────────────────────────────────
// 강도를 올렸더니 '잔잔함'이 '분노'로 바뀌던 문제. 프롬프트로 부탁만 하면 모델이
// 어길 수 있어서, 사용자가 무드를 고정해 보내면 서버가 응답을 덮어쓴다.
{
  const angry = { ...directorBase, moodChip: '짜증' };

  assert.equal(
    normalizeResult(angry, records, '잔잔함').moodChip,
    '잔잔함',
    '고정한 무드가 모델 응답을 이겨야 한다',
  );

  assert.equal(
    normalizeResult(angry, records, undefined).moodChip,
    '짜증',
    '고정이 없으면 모델이 정한 무드를 그대로 쓴다',
  );

  assert.equal(
    normalizeResult(angry, records, '없는무드').moodChip,
    '짜증',
    '목록에 없는 무드로 고정 시도하면 무시한다',
  );

  console.log('✅ MOOD LOCK OK (강도가 무드를 바꾸지 못한다)');
}

// 연출 횟수: 한 날짜에 첫 연출 1번 + 다시 연출 3번. 실패한 시도는 세지 않는다.
{
  const okProvider = async () => new Response(JSON.stringify({
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ ...directorBase, closing: '라면 국물을 다 마시고 불을 껐다.' }) }] }],
  }), { status: 200 });
  const quotaEnv = { ...env, AI_STATE: new MemoryKV(), OPENAI_API_KEY: 'test-key' };
  const fresh = await worker.fetch(request('/v1/install', { installationId: crypto.randomUUID() }), quotaEnv);
  const { token: quotaToken } = await fresh.json();
  const realFetch = globalThis.fetch;
  const direct = async (date, provider = okProvider) => {
    globalThis.fetch = provider;
    try {
      const res = await worker.fetch(request('/v1/direct', { ...directBody, date }, quotaToken), quotaEnv);
      return { status: res.status, body: await res.json() };
    } finally {
      globalThis.fetch = realFetch;
    }
  };

  const failed = await direct('10월 28일 수요일', providerStatus(500));
  assert.equal(failed.body.error, 'provider_unavailable');
  for (let i = 0; i < 4; i++) {
    assert.equal((await direct('10월 28일 수요일')).status, 200, `${i + 1}번째 연출은 허용돼야 한다 (실패한 시도는 세지 않는다)`);
  }
  const fifth = await direct('10월 28일 수요일');
  assert.equal(fifth.status, 429);
  assert.equal(fifth.body.error, 'redo_limit_exceeded', '같은 날짜의 다섯 번째 연출은 막아야 한다');

  for (let i = 0; i < 4; i++) {
    assert.equal((await direct('10월 27일 화요일')).status, 200, '다른 날짜는 따로 센다');
  }
  const overDaily = await direct('10월 26일 월요일');
  assert.equal(overDaily.body.error, 'daily_quota_exceeded', '날짜를 바꿔 가며 보내도 하루 전체 상한에 걸린다');

  console.log('✅ AI QUOTA OK (날짜당 연출 1번 + 다시 3번)');
}

// 구독 확인 (U13): REQUIRE_SUBSCRIPTION이 켜졌을 때만. Standard는 결제 기간에 15개 날짜까지.
{
  const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const subscriber = (plan, expires = future, start = '2026-10-28T09:00:00Z') => ({
    subscriber: {
      entitlements: { [plan]: { expires_date: expires, product_identifier: `com.hakku.app.${plan}.monthly`, purchase_date: start } },
      subscriptions: { [`com.hakku.app.${plan}.monthly`]: { purchase_date: start, expires_date: expires } },
    },
  });

  assert.deepEqual(parseSubscriber(subscriber('premium')), { plan: 'premium', periodStart: '2026-10-28T09:00:00Z' });
  assert.equal(parseSubscriber(subscriber('standard', past)), null, '만료된 구독은 없는 것으로 본다');
  assert.equal(parseSubscriber({ subscriber: { entitlements: {}, subscriptions: {} } }), null);
  const both = subscriber('standard');
  Object.assign(both.subscriber.entitlements, subscriber('premium').subscriber.entitlements);
  Object.assign(both.subscriber.subscriptions, subscriber('premium').subscriber.subscriptions);
  assert.equal(parseSubscriber(both).plan, 'premium', 'Premium이 Standard보다 우선');

  const okProvider = new Response(JSON.stringify({
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ ...directorBase, closing: '라면 국물을 다 마시고 불을 껐다.' }) }] }],
  }), { status: 200 });

  async function directAs(plan, dates, extraEnv = {}, usedStandardDates = []) {
    const subEnv = { ...env, AI_STATE: new MemoryKV(), OPENAI_API_KEY: 'test-key', REVENUECAT_SECRET_KEY: 'rc-secret', REQUIRE_SUBSCRIPTION: 'true', ...extraEnv };
    const installationId = crypto.randomUUID();
    // 하루 전체 상한(8번) 때문에 15일치를 한 번에 부를 수 없어서, 지난 날짜들은 미리 채워 둔다
    if (usedStandardDates.length) await subEnv.AI_STATE.put(`std:${installationId}:2026-10-28T09:00:00Z`, JSON.stringify(usedStandardDates));
    const fresh = await worker.fetch(request('/v1/install', { installationId }), subEnv);
    const { token: subToken } = await fresh.json();
    const realFetch = globalThis.fetch;
    let revenueCatCalls = 0;
    globalThis.fetch = async url => {
      if (String(url).startsWith('https://api.revenuecat.com/')) {
        revenueCatCalls++;
        return new Response(JSON.stringify(plan ? subscriber(plan) : { subscriber: { entitlements: {}, subscriptions: {} } }), { status: 200 });
      }
      return okProvider.clone();
    };
    try {
      const statuses = [];
      for (const date of dates) {
        const res = await worker.fetch(request('/v1/direct', { ...directBody, date }, subToken), subEnv);
        statuses.push({ status: res.status, error: (await res.json()).error });
      }
      return { statuses, revenueCatCalls };
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  const none = await directAs(null, ['10월 28일 수요일', '10월 28일 수요일']);
  assert.deepEqual(none.statuses.map(s => s.error), ['subscription_required', 'subscription_required']);
  assert.equal(none.revenueCatCalls, 2, '구독 없음은 저장하지 않고 매번 다시 확인한다 (방금 결제한 사람이 막히지 않게)');

  const days = Array.from({ length: 16 }, (_, i) => `11월 ${i + 1}일`);
  const standard = await directAs('standard', [days[14], days[0], days[15]], {}, days.slice(0, 14));
  assert.equal(standard.statuses[0].status, 200, 'Standard는 15번째 날짜까지 연출');
  assert.equal(standard.statuses[1].status, 200, '이미 쓴 날짜를 다시 연출하는 건 새 날짜가 아니다');
  assert.deepEqual(standard.statuses[2], { status: 402, error: 'standard_limit_reached' });
  assert.equal(standard.revenueCatCalls, 1, '구독 있음은 5분 동안 저장해 매번 묻지 않는다');

  const fresh = await directAs('standard', days.slice(0, 2));
  assert.ok(fresh.statuses.every(s => s.status === 200), '새 Standard 구독은 바로 연출');

  const premium = await directAs('premium', days.slice(0, 2), {}, days.slice(0, 14));
  assert.ok(premium.statuses.every(s => s.status === 200), 'Premium은 날짜 수 제한 없음');

  const off = await directAs(null, ['10월 28일 수요일'], { REQUIRE_SUBSCRIPTION: 'false' });
  assert.equal(off.statuses[0].status, 200, '스위치가 꺼져 있으면 지금처럼 동작');
  assert.equal(off.revenueCatCalls, 0);

  const noKey = await directAs('premium', ['10월 28일 수요일'], { REVENUECAT_SECRET_KEY: '' });
  assert.deepEqual(noKey.statuses[0], { status: 503, error: 'subscription_check_unavailable' });

  console.log('✅ AI SUBSCRIPTION OK (구독 없음 차단 · Standard 15일 · Premium · 스위치)');
}
