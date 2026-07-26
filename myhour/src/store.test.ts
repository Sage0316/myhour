import { describe, expect, it } from 'vitest';
import { generateClosing, type MyRecord } from './store';

function record(overrides: Partial<MyRecord> = {}): MyRecord {
  return {
    id: 'record-1',
    slotId: '21:00',
    slotTime: '21:00',
    capturedAt: '2026-07-26T12:00:00.000Z',
    createdAt: 1,
    type: 'text',
    content: '라면 먹고 바로 잤다.',
    ...overrides,
  };
}

describe('generateClosing', () => {
  it('uses the actual last text record instead of a generic phrase', () => {
    expect(generateClosing([record()])).toBe('마지막 기록: 라면 먹고 바로 잤다');
  });

  it('uses a media caption when one exists', () => {
    expect(generateClosing([
      record({ type: 'photo', content: '', caption: '한강 야경.' }),
    ])).toBe('마지막 기록: 한강 야경');
  });

  it('never emits the removed cliché', () => {
    const closing = generateClosing([
      record({ type: 'photo', content: '', caption: undefined }),
      record({ id: 'record-2', content: '산책했다.' }),
    ]);
    expect(closing).not.toContain('이 순간들이 모여');
    expect(closing).not.toContain('나를 만든다');
  });
});

