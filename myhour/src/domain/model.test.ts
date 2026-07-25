import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { normalizeRecord, recordSchema } from './model';

describe('record model', () => {
  it('migrates legacy records and is idempotent', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 40 }),
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
      fc.integer({ min: 1, max: 2_000_000_000_000 }),
      (id, hour, minute, createdAt) => {
        const slotTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const migrated = normalizeRecord({ id, slotTime, type: 'text', content: '기록', createdAt });
        expect(migrated).not.toBeNull();
        expect(recordSchema.safeParse(migrated).success).toBe(true);
        expect(normalizeRecord(migrated)).toEqual(migrated);
      },
    ));
  });

  it('rejects unsupported record types', () => {
    expect(normalizeRecord({
      id: 'bad',
      slotTime: '09:00',
      type: 'binary',
      content: '',
      createdAt: Date.now(),
    })).toBeNull();
  });
});
