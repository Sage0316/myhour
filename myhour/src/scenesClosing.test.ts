import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { CLOSING_VARIANTS, closingVariantIndex } from './scenesClosing';

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

describe('마지막 장면 고르기', () => {
  it('gives the same page for the same day, so remaking a video does not change it', () => {
    expect(closingVariantIndex('2026-10-28', '10월 28일 수요일')).toBe(closingVariantIndex('2026-10-28', '아무 문구'));
  });

  it('never repeats the page two days in a row, and stays in range', () => {
    fc.assert(fc.property(fc.integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2035, 0, 1) }), ms => {
      const today = closingVariantIndex(iso(ms), '');
      const tomorrow = closingVariantIndex(iso(ms + 86_400_000), '');
      expect(today).not.toBe(tomorrow);
      expect(today).toBeGreaterThanOrEqual(0);
      expect(today).toBeLessThan(CLOSING_VARIANTS.length);
    }));
  });
});

describe('첫 장면(공책 표지) 고르기', () => {
  it('alternates covers day by day', async () => {
    const { COVER_VARIANTS, coverVariantIndex } = await import('./scenesCover');
    expect(COVER_VARIANTS.length).toBe(2);
    expect(coverVariantIndex('2026-10-28', '')).not.toBe(coverVariantIndex('2026-10-29', ''));
    expect(coverVariantIndex('2026-10-28', 'x')).toBe(coverVariantIndex('2026-10-28', 'y'));
  });
});
