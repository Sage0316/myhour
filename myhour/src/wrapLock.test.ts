import { beforeEach, describe, expect, it } from 'vitest';
import { consumeVideoForDate, hasVideoForDate, releaseVideoForDate } from './videoEntitlement';

// context.tsx의 isDayWrapped와 같은 규칙. 잠금 근거가 두 개라는 것을 고정한다.
function isDayWrapped(data: { isWrapped: boolean; date: string }): boolean {
  return data.isWrapped || hasVideoForDate(data.date);
}

beforeEach(() => localStorage.clear());

describe('마감 잠금 판정', () => {
  it('마감 플래그가 서 있으면 잠긴다', () => {
    expect(isDayWrapped({ isWrapped: true, date: '2026-08-04' })).toBe(true);
  });

  // 플래그를 false로 되돌리던 예전 버전에서 마감한 하루. 새 빌드를 깔자마자 잠겨야 한다.
  it('플래그가 없어도 그 날짜로 영상을 만들었으면 잠긴다', () => {
    consumeVideoForDate('2026-08-04');
    expect(isDayWrapped({ isWrapped: false, date: '2026-08-04' })).toBe(true);
  });

  it('영상도 없고 마감도 안 했으면 열려 있다', () => {
    expect(isDayWrapped({ isWrapped: false, date: '2026-08-04' })).toBe(false);
  });

  it('다른 날짜의 영상은 오늘을 잠그지 않는다', () => {
    consumeVideoForDate('2026-08-03');
    expect(isDayWrapped({ isWrapped: false, date: '2026-08-04' })).toBe(false);
  });
});

describe('테스트 도구: 마감 잠금 풀기', () => {
  // 잠금 근거가 둘이라 이용권만 지우거나 플래그만 지우면 여전히 잠겨 있다.
  it('이용권만 되돌리면 플래그 때문에 아직 잠겨 있다', () => {
    consumeVideoForDate('2026-08-05');
    releaseVideoForDate('2026-08-05');
    expect(isDayWrapped({ isWrapped: true, date: '2026-08-05' })).toBe(true);
  });

  it('둘 다 풀어야 열린다', () => {
    consumeVideoForDate('2026-08-05');
    releaseVideoForDate('2026-08-05');
    expect(isDayWrapped({ isWrapped: false, date: '2026-08-05' })).toBe(false);
  });

  it('되돌린 적 없는 날짜엔 아무 일도 없다', () => {
    expect(releaseVideoForDate('2026-08-05')).toBe(false);
  });

  it('다른 날짜의 이용권은 건드리지 않는다', () => {
    consumeVideoForDate('2026-08-04');
    consumeVideoForDate('2026-08-05');
    releaseVideoForDate('2026-08-05');
    expect(hasVideoForDate('2026-08-04')).toBe(true);
  });
});
