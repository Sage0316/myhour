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
assert.equal(
  normalizeResult(directorBase, records).closing,
  '마지막 기록: 라면 먹고 바로 잤다',
  '감성 클리셰는 마지막 기록의 실제 내용으로 교체해야 한다',
);
assert.equal(
  normalizeResult({ ...directorBase, closing: '라면 국물까지 다 마셨다.' }, records).closing,
  '라면 국물까지 다 마셨다.',
  '기록에 붙은 구체적인 closing은 유지해야 한다',
);
console.log('✅ AI AUTH/VALIDATION OK');
