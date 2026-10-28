import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { STANDARD_VIDEOS_PER_PERIOD, canMakeVideo, decideVideoAccess, videosInPeriod } from './access';
import type { Subscription } from './access';

const standard: Subscription = {
  plan: 'standard', periodStart: '2026-10-28T09:00:00.000Z', periodEnd: '2026-11-28T09:00:00.000Z', isTrial: false,
};
const premium: Subscription = { ...standard, plan: 'premium' };
const inPeriod = (n: number) => Array.from({ length: n }, (_, i) => new Date(Date.parse(standard.periodStart) + i * 86_400_000).toISOString());

describe('decideVideoAccess', () => {
  it('keeps the web and unconfigured app unrestricted', () => {
    expect(decideVideoAccess(false, null, [])).toEqual({ kind: 'unrestricted' });
  });

  it('asks to subscribe when there is no subscription', () => {
    expect(decideVideoAccess(true, null, [])).toEqual({ kind: 'subscribe' });
  });

  it('lets premium make a video without a monthly count', () => {
    expect(decideVideoAccess(true, premium, inPeriod(30))).toEqual({ kind: 'allowed', plan: 'premium', remaining: null });
  });

  it('counts standard videos only inside the current billing period', () => {
    const before = ['2026-10-27T23:59:59.000Z', '2026-10-01T10:00:00.000Z'];
    const after = ['2026-11-28T09:00:00.000Z'];
    expect(decideVideoAccess(true, standard, [...before, ...inPeriod(3), ...after]))
      .toEqual({ kind: 'allowed', plan: 'standard', remaining: STANDARD_VIDEOS_PER_PERIOD - 3 });
  });

  it('stops standard at 15 and says when it refills', () => {
    const access = decideVideoAccess(true, standard, inPeriod(STANDARD_VIDEOS_PER_PERIOD));
    expect(access).toEqual({ kind: 'standard_used_up', resetsAt: standard.periodEnd });
    expect(canMakeVideo(access)).toBe(false);
  });

  it('never allows more than 15 standard videos in a period', () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: -40, max: 60 }), { maxLength: 60 }), offsets => {
      const consumed = offsets.map(day => new Date(Date.parse(standard.periodStart) + day * 86_400_000).toISOString());
      const access = decideVideoAccess(true, standard, consumed);
      const used = videosInPeriod(standard, consumed);
      expect(canMakeVideo(access)).toBe(used < STANDARD_VIDEOS_PER_PERIOD);
      if (access.kind === 'allowed') expect(access.remaining).toBe(STANDARD_VIDEOS_PER_PERIOD - used);
    }));
  });
});
