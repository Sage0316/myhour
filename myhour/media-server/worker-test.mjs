// BGM 서빙 워커 검증. 실제 R2 대신 가짜 버킷을 물려서 라우팅·CORS·Range·화이트리스트를 본다.
import assert from 'node:assert/strict';
import worker from './worker.js';

const BODY = 'FAKE-MP3-BYTES';

function fakeObject(size = BODY.length, range) {
  return {
    body: BODY,
    size,
    httpEtag: '"abc123"',
    httpMetadata: { contentType: 'audio/mpeg' },
    writeHttpMetadata(headers) { headers.set('Content-Type', 'audio/mpeg'); },
    range,
  };
}

const requested = [];
const env = {
  ALLOWED_ORIGINS: 'https://sage0316.github.io',
  MEDIA: {
    async get(key, options) {
      requested.push(key);
      if (key !== 'piano.mp3') return null;
      return options ? fakeObject(BODY.length, { offset: 2, length: 5 }) : fakeObject();
    },
  },
};

const ORIGIN = 'https://sage0316.github.io';
const req = (path, init = {}) => new Request(`https://hakku-media.example${path}`, {
  headers: { Origin: ORIGIN, ...(init.headers ?? {}) },
  ...init,
});

// health
let res = await worker.fetch(req('/health'), env);
assert.equal(res.status, 200);
assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);

// preflight — Range 헤더를 허용해야 iOS 오디오가 동작한다
res = await worker.fetch(req('/bgm/piano.mp3', { method: 'OPTIONS' }), env);
assert.match(res.headers.get('Access-Control-Allow-Methods'), /GET/);
assert.match(res.headers.get('Access-Control-Allow-Headers'), /Range/);

// 정상 파일 — 영상 생성이 바이트를 읽을 수 있어야 하므로 CORS 헤더가 필수다
res = await worker.fetch(req('/bgm/piano.mp3'), env);
assert.equal(res.status, 200);
assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
assert.equal(res.headers.get('Content-Type'), 'audio/mpeg');
assert.match(res.headers.get('Cache-Control'), /immutable/);
assert.equal(res.headers.get('Accept-Ranges'), 'bytes');
assert.equal(await res.text(), BODY);

// Range 요청 → 206 + Content-Range
res = await worker.fetch(req('/bgm/piano.mp3', { headers: { Range: 'bytes=2-6' } }), env);
assert.equal(res.status, 206);
assert.equal(res.headers.get('Content-Range'), `bytes 2-6/${BODY.length}`);

// 허용되지 않은 Origin은 CORS 헤더를 받지 못한다 (응답 자체는 준다 — 공개 오디오라서)
res = await worker.fetch(req('/bgm/piano.mp3', { headers: { Origin: 'https://evil.example' } }), env);
assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
assert.equal(res.headers.get('Vary'), 'Origin');

// 없는 곡
res = await worker.fetch(req('/bgm/nope.mp3'), env);
assert.equal(res.status, 404);

// 경로 탐색·형식 위반은 버킷에 닿기 전에 막는다
const before = requested.length;
for (const bad of ['/bgm/%2e%2e%2fsecret', '/bgm/PIANO.MP3', '/bgm/piano.wav', '/bgm/a/b.mp3', '/secret.mp3', '/']) {
  res = await worker.fetch(req(bad), env);
  assert.equal(res.status, 404, `${bad} 는 404여야 한다`);
}
assert.equal(requested.length, before, '거부된 경로는 R2를 조회하지 않아야 한다');

// 쓰기 메서드 차단
res = await worker.fetch(req('/bgm/piano.mp3', { method: 'POST' }), env);
assert.equal(res.status, 405);

console.log('✅ MEDIA WORKER OK (CORS · Range · 화이트리스트)');
