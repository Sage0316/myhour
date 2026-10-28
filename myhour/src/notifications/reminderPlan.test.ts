import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { DEFAULT_SETTINGS } from '../store';
import type { AppSettings } from '../store';
import { MAX_REMINDERS, planReminders } from './reminderPlan';

const settings = (overrides: Partial<AppSettings> = {}): AppSettings => ({ ...DEFAULT_SETTINGS, ...overrides });
const at = (y: number, mo: number, d: number, h: number, m = 0) => new Date(y, mo - 1, d, h, m);
const hm = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

describe('planReminders', () => {
  it('rings exactly on each slot for "exact" and skips slots already past', () => {
    const plan = planReminders(settings({ startTime: '09:00', interval: 120, endMode: 'fixed', endTime: '21:00', notifyTiming: 'exact' }),
      at(2026, 10, 28, 12, 30), '2026-10-28', null, 1);
    expect(plan.map(r => hm(r.at))).toEqual(['13:00', '15:00', '17:00', '19:00', '21:00']);
    expect(plan.every(r => r.body.includes('기록해볼까요'))).toBe(true);
  });

  it('rings one minute early for "before" and twice for "both"', () => {
    const base = { startTime: '09:00', interval: 120 as const, endMode: 'fixed' as const, endTime: '13:00' };
    const before = planReminders(settings({ ...base, notifyTiming: 'before' }), at(2026, 10, 28, 8), '2026-10-28', null, 1);
    expect(before.map(r => hm(r.at))).toEqual(['08:59', '10:59', '12:59']);
    const both = planReminders(settings({ ...base, notifyTiming: 'both' }), at(2026, 10, 28, 8), '2026-10-28', null, 1);
    expect(both.map(r => hm(r.at))).toEqual(['08:59', '09:00', '10:59', '11:00', '12:59', '13:00']);
  });

  it('puts slots earlier than the start time on the next calendar day', () => {
    const plan = planReminders(settings({ startTime: '09:00', interval: 120, endMode: 'open', notifyTiming: 'exact' }),
      at(2026, 10, 28, 23, 30), '2026-10-28', null, 1);
    expect(plan[0].at).toEqual(at(2026, 10, 29, 1));
    expect(plan.at(-1)!.at).toEqual(at(2026, 10, 29, 7));
  });

  it('skips the rest of a day that is already wrapped up', () => {
    const plan = planReminders(settings({ startTime: '09:00', interval: 120, endMode: 'fixed', endTime: '21:00', notifyTiming: 'exact' }),
      at(2026, 10, 28, 12), '2026-10-28', '2026-10-28', 2);
    expect(plan[0].at).toEqual(at(2026, 10, 29, 9));
  });

  it('stays under the iOS limit, in the future, sorted, with unique ids', () => {
    fc.assert(fc.property(
      fc.constantFrom(30 as const, 60 as const, 120 as const),
      fc.constantFrom('before' as const, 'exact' as const, 'both' as const),
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 23 * 60 + 59 }),
      (interval, notifyTiming, startHour, nowMinutes) => {
        const startTime = `${String(startHour).padStart(2, '0')}:00`;
        const now = at(2026, 10, 28, 0, nowMinutes);
        const plan = planReminders(settings({ interval, notifyTiming, startTime, endMode: 'open' }), now, '2026-10-28');
        expect(plan.length).toBeLessThanOrEqual(MAX_REMINDERS);
        expect(plan.every(r => r.at.getTime() > now.getTime())).toBe(true);
        for (let i = 1; i < plan.length; i++) expect(plan[i].at.getTime()).toBeGreaterThanOrEqual(plan[i - 1].at.getTime());
        expect(new Set(plan.map(r => r.id)).size).toBe(plan.length);
      },
    ));
  });
});
