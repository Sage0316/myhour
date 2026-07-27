import { describe, expect, it } from 'vitest';
import { generateClosing, guessMood, type MyRecord } from './store';

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
  it('never echoes the raw record text back at the user', () => {
    const closing = generateClosing([record({ content: '앱 터짐 시발 존나 짜증나' })], '짜증');
    expect(closing).not.toContain('앱 터짐');
    expect(closing).not.toContain('시발');
  });

  it('matches the tone of the day mood', () => {
    expect(generateClosing([record()], '짜증')).toBe('짜증나는 일이 많았지만, 그래도 오늘을 버텨냈다.');
    expect(generateClosing([record()], '뿌듯함')).toBe('하나씩 해낸 순간이 쌓여서, 꽤 뿌듯한 하루가 됐다.');
  });

  it('falls back to the calm line for unknown moods', () => {
    expect(generateClosing([record()], '없는무드')).toBe('크게 요란하지 않아서 오히려 좋았던, 잔잔한 하루였다.');
  });

  it('never emits the removed clichés', () => {
    const closing = generateClosing([
      record({ type: 'photo', content: '', caption: undefined }),
      record({ id: 'record-2', content: '산책했다.' }),
    ]);
    expect(closing).not.toContain('이 순간들이 모여');
    expect(closing).not.toContain('나를 만든다');
    expect(closing).not.toContain('마지막 기록:');
    expect(closing).not.toContain('산책했다');
  });
});

describe('guessMood', () => {
  it('reads anger from the text instead of counting records', () => {
    const mood = guessMood([
      record({ content: '앱 터짐 시발 존나 짜증나' }),
      record({ id: 'record-2', type: 'photo', content: '', caption: '퇴근길' }),
    ]);
    expect(mood.mood).toBe('짜증');
  });

  it('reads mood from media captions too', () => {
    const mood = guessMood([
      record({ type: 'photo', content: '', caption: '너무 피곤했던 하루' }),
    ]);
    expect(mood.mood).toBe('지침');
  });

  it('defaults to calm when nothing matches', () => {
    expect(guessMood([record()]).mood).toBe('잔잔함');
  });
});

