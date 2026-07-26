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
  it('combines the actual last text record with a mood-specific phrase', () => {
    expect(generateClosing([record()], '짜증')).toBe('라면 먹고 바로 잤다. 짜증 나는 순간이 많았던 하루.');
  });

  it('uses a media caption when one exists', () => {
    expect(generateClosing([
      record({ type: 'photo', content: '', caption: '한강 야경.' }),
    ], '뿌듯함')).toBe('한강 야경. 오늘 하루도 잘 해냈다.');
  });

  it('falls back to a mood-only line when there is no detail to quote', () => {
    const closing = generateClosing([
      record({ type: 'photo', content: '', caption: undefined }),
    ], '지침');
    expect(closing).toBe('유독 지치는 하루를 마쳤다.');
  });

  it('never emits the removed cliché', () => {
    const closing = generateClosing([
      record({ type: 'photo', content: '', caption: undefined }),
      record({ id: 'record-2', content: '산책했다.' }),
    ]);
    expect(closing).not.toContain('이 순간들이 모여');
    expect(closing).not.toContain('나를 만든다');
    expect(closing).not.toContain('마지막 기록:');
  });
});

