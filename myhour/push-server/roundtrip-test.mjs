import { encryptPayload } from './worker.js';
import { webcrypto as wc } from 'crypto';

const te = new TextEncoder(); const td = new TextDecoder();
const b64u = b => Buffer.from(b).toString('base64url');

// 1. 가짜 브라우저 구독자 생성 (ua 키쌍 + auth secret)
const ua = await wc.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const uaPubRaw = new Uint8Array(await wc.subtle.exportKey('raw', ua.publicKey));
const auth = wc.getRandomValues(new Uint8Array(16));

// 2. 워커의 encryptPayload로 암호화
const msg = JSON.stringify({ title: 'MYHOUR', body: '지금 이 순간을 기록해볼까요? 📝' });
const packet = await encryptPayload(b64u(uaPubRaw), b64u(auth), msg);

// 3. 수신자(브라우저) 입장에서 RFC 8291대로 복호화
const salt = packet.slice(0, 16);
const rs = new DataView(packet.buffer, 16, 4).getUint32(0);
const idlen = packet[20];
const asPub = packet.slice(21, 21 + idlen);
const ct = packet.slice(21 + idlen);

const asKey = await wc.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
const ecdh = new Uint8Array(await wc.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));

async function hkdf(salt, ikm, info, len) {
  const k = await wc.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await wc.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
const keyInfo = new Uint8Array([...te.encode('WebPush: info\0'), ...uaPubRaw, ...asPub]);
const prk = await hkdf(auth, ecdh, keyInfo, 32);
const cek = await hkdf(salt, prk, te.encode('Content-Encoding: aes128gcm\0'), 16);
const nonce = await hkdf(salt, prk, te.encode('Content-Encoding: nonce\0'), 12);

const aes = await wc.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
const pt = new Uint8Array(await wc.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, ct));
// 마지막 0x02 패딩 구분자 제거
let end = pt.length - 1;
while (end >= 0 && pt[end] === 0) end--;
if (pt[end] !== 2) throw new Error('padding delimiter missing');
const decrypted = td.decode(pt.slice(0, end));

console.log('rs:', rs, '| keyid len:', idlen);
console.log('decrypted:', decrypted);
console.log(decrypted === msg ? '✅ ROUND-TRIP OK' : '❌ MISMATCH');
