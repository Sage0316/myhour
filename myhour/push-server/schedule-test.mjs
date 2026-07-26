// 알림 발송 시각이 시계 정각에 맞는지 검증한다.
// 예전 로직은 허용 시작 시각을 기준으로 세서, 시작 09:00 + 120분이면 09·11·13시에 울렸다.
import assert from 'node:assert/strict';
import { deliverySlotIndex, shouldDeliverAt } from './worker.js';

const at = (hour, minute = 0) => hour * 60 + minute;

// 09:00~22:00 허용, 간격별로 하루 중 실제 발송 시각을 뽑는다 (크론은 30분 단위)
function deliveryTimes(interval, start = at(9), end = at(22)) {
  const times = [];
  for (let m = 0; m < 1440; m += 30) {
    if (shouldDeliverAt(m, { start, end, interval })) {
      times.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
  }
  return times;
}

// 30분 간격 — 매시 :00과 :30
const half = deliveryTimes(30);
assert.equal(half[0], '09:00');
assert.equal(half[1], '09:30');
assert.ok(half.every(t => t.endsWith(':00') || t.endsWith(':30')));
assert.equal(half.at(-1), '22:00');

// 60분 간격 — 매시 정각만
const hourly = deliveryTimes(60);
assert.deepEqual(hourly.slice(0, 3), ['09:00', '10:00', '11:00']);
assert.ok(hourly.every(t => t.endsWith(':00')));

// 120분 간격 — 자정 기준 짝수시. 시작이 09:00이어도 09시에는 울리지 않는다
const every2h = deliveryTimes(120);
assert.deepEqual(every2h, ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']);
assert.ok(!every2h.includes('09:00'), '홀수시는 정각 기준이 아니다');

// 허용 창 밖에서는 울리지 않는다
assert.equal(shouldDeliverAt(at(8, 30), { start: at(9), end: at(22), interval: 30 }), false);
assert.equal(shouldDeliverAt(at(22, 30), { start: at(9), end: at(22), interval: 30 }), false);

// 슬롯 번호는 자정 기준이라 시작 시각을 바꿔도 같은 시각이면 같은 번호다 (중복 발송 방지)
assert.equal(deliverySlotIndex(at(10), 60), deliverySlotIndex(at(10), 60));
assert.equal(deliverySlotIndex(at(9, 30), 30), 19);
assert.notEqual(deliverySlotIndex(at(9), 30), deliverySlotIndex(at(9, 30), 30));

console.log('✅ PUSH SCHEDULE OK (정각 기준 발송)');
