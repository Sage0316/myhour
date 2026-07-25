import { describe, expect, it } from 'vitest';
import { migrateLegacyAppData } from './legacy';

const legacyFixture = {
  records: [{
    id: '1700000000000',
    slotTime: '13:00',
    type: 'text',
    content: '점심',
    createdAt: 1_700_000_000_000,
  }],
  isWrapped: false,
  date: '2026-07-25',
};

describe('legacy migration', () => {
  it('is deterministic and idempotent', () => {
    const first = migrateLegacyAppData(legacyFixture, '2026-07-25');
    const second = migrateLegacyAppData(first.data, '2026-07-25');
    expect(second.data).toEqual(first.data);
    expect(first.report.convertedRecords).toBe(1);
    expect(first.report.skippedRecords).toBe(0);
  });

  it('reports invalid records without mutating the input', () => {
    const source = { ...legacyFixture, records: [...legacyFixture.records, { type: 'bad' }] };
    const snapshot = JSON.stringify(source);
    const result = migrateLegacyAppData(source, '2026-07-25');
    expect(result.report.skippedRecords).toBe(1);
    expect(JSON.stringify(source)).toBe(snapshot);
  });
});
