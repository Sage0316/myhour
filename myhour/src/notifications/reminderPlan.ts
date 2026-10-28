import { generateSlots } from '../store';
import type { AppSettings } from '../store';

/**
 * iOS 앱의 기록 시간 알림 계획. 폰 자체 예약 알림으로 걸기 때문에 서버가 필요 없다.
 *
 * - iOS는 앱 하나가 예약할 수 있는 알림을 64개로 제한한다 → 앞으로 며칠분만, 최대 MAX_REMINDERS개 건다.
 *   앱을 열 때마다 다시 계산해 채우므로 매일 쓰는 사람에게는 끊기지 않는다.
 * - 하루(세션)는 설정의 시작 시간부터 다음 날 시작 시간 전까지다. 시작 시간보다 이른 슬롯은
 *   다음 날짜의 그 시각이다 (예: 09:00 시작, 01:00 슬롯 → 다음 날 01:00).
 * - 이미 마감한 하루의 남은 알림은 걸지 않는다.
 */
export const MAX_REMINDERS = 60;
export const PLAN_DAYS = 3;

export interface Reminder {
  id: number;
  at: Date;
  title: string;
  body: string;
}

const TITLE = '하꾸';
const BODY_EXACT = '지금 이 순간을 기록해볼까요? 📸';
const BODY_BEFORE = '1분 뒤 기록 시간이에요 ✏️';

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 'YYYY-MM-DD' 날짜의 자정(기기 시간대) */
function localMidnight(isoDate: string): Date {
  const [y, mo, d] = isoDate.split('-').map(Number);
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * @param sessionDate 지금 진행 중인 하루의 날짜 (getSessionDate 결과)
 * @param wrappedSessionDate 이미 마감한 하루의 날짜. 그날 남은 알림은 건너뛴다.
 */
export function planReminders(
  settings: AppSettings,
  now: Date,
  sessionDate: string,
  wrappedSessionDate: string | null = null,
  days: number = PLAN_DAYS,
): Reminder[] {
  const slots = generateSlots(settings);
  const startM = minutesOf(settings.startTime);
  const offsets = settings.notifyTiming === 'both' ? [-1, 0] : settings.notifyTiming === 'before' ? [-1] : [0];
  const first = localMidnight(sessionDate);
  const planned: Omit<Reminder, 'id'>[] = [];

  for (let day = 0; day < days; day++) {
    const sessionMidnight = addDays(first, day);
    if (wrappedSessionDate && isoDate(sessionMidnight) === wrappedSessionDate) continue;
    for (const slot of slots) {
      const slotM = minutesOf(slot);
      // 시작 시간보다 이른 슬롯은 자정을 넘긴 다음 날 시각
      const base = slotM < startM ? addDays(sessionMidnight, 1) : sessionMidnight;
      for (const offset of offsets) {
        const at = new Date(base);
        at.setHours(0, slotM + offset, 0, 0);
        if (at.getTime() <= now.getTime()) continue;
        planned.push({ at, title: TITLE, body: offset < 0 ? BODY_BEFORE : BODY_EXACT });
      }
    }
  }

  return planned
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_REMINDERS)
    .map((reminder, index) => ({ ...reminder, id: index + 1 }));
}
