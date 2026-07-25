import assert from 'node:assert/strict';
import worker from './worker.js';

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
console.log('✅ AI AUTH/VALIDATION OK');
