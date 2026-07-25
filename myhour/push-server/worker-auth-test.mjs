import assert from 'node:assert/strict';
import worker from './worker.js';

class MemoryKV {
  values = new Map();
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, value); }
  async delete(key) { this.values.delete(key); }
}

const origin = 'https://sage0316.github.io';
const env = {
  SUBS: new MemoryKV(),
  ALLOWED_ORIGINS: origin,
  INSTALL_TOKEN_SECRET: 'test-secret',
  PUSH_ENDPOINT_HOSTS: 'push.example',
};
const request = (path, body, token, requestOrigin = origin) => new Request(`https://push.example${path}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': requestOrigin,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(body),
});

const denied = await worker.fetch(request('/v1/install', { installationId: crypto.randomUUID() }, '', 'https://evil.example'), env);
assert.equal(denied.status, 403);

const installationId = crypto.randomUUID();
const installed = await worker.fetch(request('/v1/install', { installationId }), env);
assert.equal(installed.status, 200);
const { token } = await installed.json();

const unauthorized = await worker.fetch(request('/v1/subscriptions', {}, 'bad'), env);
assert.equal(unauthorized.status, 401);

const rejectedEndpoint = await worker.fetch(request('/v1/subscriptions', {
  subscription: {
    endpoint: 'https://attacker.example/subscription',
    keys: { p256dh: 'a'.repeat(88), auth: 'b'.repeat(22) },
  },
  interval: 60,
  startTime: '09:00',
  endTime: '22:00',
  tzOffsetMin: -540,
}, token), env);
assert.equal(rejectedEndpoint.status, 400);

const subscribed = await worker.fetch(request('/v1/subscriptions', {
  subscription: {
    endpoint: 'https://push.example/subscription',
    keys: { p256dh: 'a'.repeat(88), auth: 'b'.repeat(22) },
  },
  interval: 60,
  startTime: '09:00',
  endTime: '22:00',
  tzOffsetMin: -540,
}, token), env);
assert.equal(subscribed.status, 200);
assert.equal(env.SUBS.values.size, 1);

const limited = await worker.fetch(request('/v1/install', {
  installationId: crypto.randomUUID(),
}), {
  ...env,
  PUSH_RATE_LIMITER: { limit: async () => ({ success: false }) },
});
assert.equal(limited.status, 429);
console.log('✅ PUSH AUTH/VALIDATION OK');
