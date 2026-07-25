import { afterEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { DEFAULT_SETTINGS, generateSlots, getCurrentSlot, getSessionDate } from '../store';

afterEach(() => {
  vi.useRealTimers();
});

describe('schedule invariants', () => {
  it('generates unique slots within the safety bound', () => {
    fc.assert(fc.property(
      fc.constantFrom(30 as const, 60 as const, 120 as const),
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
      (interval, hour, minute) => {
        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const slots = generateSlots({ ...DEFAULT_SETTINGS, interval, startTime, endMode: 'open' });
        expect(slots.length).toBeGreaterThan(0);
        expect(slots.length).toBeLessThanOrEqual(48);
        expect(new Set(slots).size).toBe(slots.length);
        expect(slots[0]).toBe(startTime);
      },
    ));
  });

  it('returns the displayed slot rather than wall-clock minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T13:17:00'));
    expect(getCurrentSlot(['13:00', '14:00'], 60, '09:00')).toBe('13:00');
  });

  it('keeps after-midnight moments in the prior session', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T01:00:00'));
    expect(getSessionDate('09:00')).toBe('2026-07-24');
  });
});
