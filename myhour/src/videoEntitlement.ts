// 영상 이용권 차감 원장.
//
// 규칙은 하나다: **영상 생성이 성공한 순간에만, 날짜당 한 번** 차감한다.
// - AI 연출 결과를 만든 시점에는 차감하지 않는다 (연출은 여러 번 다시 뽑을 수 있다)
// - "영상 없이 마감"은 차감하지 않는다
// - 영상 생성이 실패하면 차감하지 않는다 (성공 뒤에만 기록하므로 되돌릴 것도 없다)
// - 같은 날짜로 다시 불러도 아무 일도 일어나지 않는다 (멱등)
//
// 주의: 이건 폰 안의 기록이라 사용자가 지우면 초기화된다. 실제 과금을 붙일 땐
// 서버가 최종 판정을 해야 하고, 이 원장은 화면을 빠르게 막는 용도로만 쓴다.
const LEDGER_KEY = 'hakku_video_entitlement_v1';

interface Ledger {
  /** 영상이 완성된 날짜(YYYY-MM-DD) → 차감 시각(ISO) */
  consumed: Record<string, string>;
}

function readLedger(): Ledger {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return { consumed: {} };
    const parsed: unknown = JSON.parse(raw);
    const consumed = (parsed as Ledger | null)?.consumed;
    return consumed && typeof consumed === 'object' ? { consumed } : { consumed: {} };
  } catch {
    return { consumed: {} };
  }
}

function writeLedger(ledger: Ledger): void {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
}

/** 이 날짜로 이미 영상을 만들었는가 */
export function hasVideoForDate(date: string): boolean {
  return Boolean(readLedger().consumed[date]);
}

/**
 * 영상 생성 성공 직후에 호출한다. 새로 차감했으면 true, 이미 차감된 날짜면 false.
 * 저장에 실패해도 영상 자체는 이미 만들어졌으므로 예외를 밖으로 던지지 않는다.
 */
export function consumeVideoForDate(date: string): boolean {
  const ledger = readLedger();
  if (ledger.consumed[date]) return false;
  ledger.consumed[date] = new Date().toISOString();
  try {
    writeLedger(ledger);
  } catch {
    return false;
  }
  return true;
}

/** 차감된 날짜 목록 — 사용량 표시나 디버깅용 */
export function consumedDates(): string[] {
  return Object.keys(readLedger().consumed).sort();
}

/**
 * 차감을 되돌린다. **테스트 도구 전용** — 정상 흐름에서는 절대 호출하지 않는다.
 * 실제 과금이 붙으면 이 함수는 서버 판정으로 대체되거나 사라져야 한다.
 */
export function releaseVideoForDate(date: string): boolean {
  const ledger = readLedger();
  if (!ledger.consumed[date]) return false;
  delete ledger.consumed[date];
  try {
    writeLedger(ledger);
  } catch {
    return false;
  }
  return true;
}
