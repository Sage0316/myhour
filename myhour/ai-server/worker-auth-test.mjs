import assert from 'node:assert/strict';
import worker, { normalizeResult } from './worker.js';

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
// 한도 초과인지 게이트웨이 차단인지 밖에서 구분할 수 없었다.
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
      ANTHROPIC_API_KEY: 'test-key',
      PROVIDER_URL: 'https://provider.example/v1/messages',
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

const noKey = await directWith(providerStatus(200), { ANTHROPIC_API_KEY: '' });
assert.equal(noKey.body.error, 'provider_not_configured', 'API 키 미설정은 따로 알려야 한다');

const badOutput = await directWith(async () => new Response(JSON.stringify({
  content: [{ type: 'text', text: '음... JSON은 못 주겠어요' }],
}), { status: 200 }));
assert.equal(badOutput.body.error, 'invalid_provider_output', '모델이 JSON을 안 주면 형식 오류로 구분해야 한다');

console.log('✅ AI ERROR CODES OK');
