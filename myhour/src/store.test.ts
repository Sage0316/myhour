import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addToArchive, daysUntilTrim, generateClosing, guessMood, loadAppData, loadArchive,
  needsTrimNotice, sweepArchive, type ArchiveEntry, type MyRecord,
} from './store';
import { journalRepository } from './repositories/journalRepository';

afterEach(() => {
  vi.useRealTimers();
});

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


describe('날짜 넘어감 (rollover)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  // 사용자가 사진만 찍고 마감하지 않은 하루가 통째로 사라졌던 버그.
  // 빈 하루를 돌려주기만 하면 cleanupOrphanMedia가 그 사진들을 참조 없는 blob으로 보고 지운다.
  it('마감하지 않은 어제 기록을 버리지 않고 아카이브로 옮긴다', () => {
    const yesterday = record({ id: 'record-photo', type: 'photo', content: '', mediaId: 'media_1' });
    journalRepository.saveCurrent({
      schemaVersion: 2,
      records: [yesterday],
      isWrapped: false,
      date: '2026-08-03',
    });

    // 8/4 오전 9시 이후에 앱을 연 상황 (시작 시간 09:00)
    vi.setSystemTime(new Date('2026-08-04T10:00:00'));
    const fresh = loadAppData('09:00');

    expect(fresh.date).toBe('2026-08-04');
    expect(fresh.records).toHaveLength(0);

    const archived = loadArchive();
    expect(archived).toHaveLength(1);
    expect(archived[0].date).toBe('2026-08-03');
    expect(archived[0].isWrapped).toBe(false);
    expect(archived[0].records[0].mediaId).toBe('media_1');
  });

  it('같은 하루를 두 번 아카이브하지 않는다', () => {
    journalRepository.saveCurrent({
      schemaVersion: 2,
      records: [record()],
      isWrapped: false,
      date: '2026-08-03',
    });
    vi.setSystemTime(new Date('2026-08-04T10:00:00'));

    loadAppData('09:00');
    // saveCurrent가 실패해 어제 데이터가 그대로 남은 상황을 흉내낸다
    journalRepository.saveCurrent({
      schemaVersion: 2,
      records: [record()],
      isWrapped: false,
      date: '2026-08-03',
    });
    loadAppData('09:00');

    expect(loadArchive()).toHaveLength(1);
  });

  it('기록이 없는 하루는 아카이브에 넣지 않는다', () => {
    journalRepository.saveCurrent({
      schemaVersion: 2,
      records: [],
      isWrapped: false,
      date: '2026-08-03',
    });
    vi.setSystemTime(new Date('2026-08-04T10:00:00'));

    loadAppData('09:00');
    expect(loadArchive()).toHaveLength(0);
  });
});

describe('3일 뒤 원본 정리 (sweepArchive)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T10:00:00'));
  });

  function archived(date: string, overrides: Partial<ArchiveEntry> = {}): ArchiveEntry {
    return {
      id: `archive-${date}`,
      date,
      records: [
        record({ id: 'r-photo', type: 'photo', content: '', mediaId: 'media_1' }),
        record({ id: 'r-text', type: 'text', content: '오늘은 라면' }),
      ],
      isWrapped: false,
      trimmed: false,
      ...overrides,
    };
  }

  it('3일이 지난 미마감 항목의 사진을 비우고 글은 남긴다', () => {
    addToArchive(archived('2026-08-01'));
    sweepArchive();

    const [entry] = loadArchive();
    expect(entry.trimmed).toBe(true);
    expect(entry.records.find(r => r.id === 'r-photo')?.mediaId).toBeUndefined();
    expect(entry.records.find(r => r.id === 'r-text')?.content).toBe('오늘은 라면');
  });

  it('아직 3일이 안 된 항목은 그대로 둔다', () => {
    addToArchive(archived('2026-08-02'));
    sweepArchive();

    const [entry] = loadArchive();
    expect(entry.trimmed).toBe(false);
    expect(entry.records.find(r => r.id === 'r-photo')?.mediaId).toBe('media_1');
  });

  // 영상이 있는 항목은 이미 완성품이 있으므로 이 정책의 대상이 아니다
  it('영상까지 만든 항목은 며칠이 지나도 건드리지 않는다', () => {
    addToArchive(archived('2026-07-01', { isWrapped: true }));
    sweepArchive();
    expect(loadArchive()[0].trimmed).toBe(false);
  });

  it('남은 날짜를 세어 배지에 쓸 수 있다', () => {
    expect(daysUntilTrim(archived('2026-08-03'), '2026-08-04')).toBe(2);
    expect(daysUntilTrim(archived('2026-08-02'), '2026-08-04')).toBe(1);
    expect(daysUntilTrim(archived('2026-08-01'), '2026-08-04')).toBe(0);
  });

  it('정리된 항목과 영상이 있는 항목엔 예고를 띄우지 않는다', () => {
    expect(needsTrimNotice(archived('2026-08-03'))).toBe(true);
    expect(needsTrimNotice(archived('2026-08-03', { trimmed: true }))).toBe(false);
    expect(needsTrimNotice(archived('2026-08-03', { isWrapped: true }))).toBe(false);
    // 글만 있는 하루는 지울 원본이 없다
    expect(needsTrimNotice(archived('2026-08-03', { records: [record()] }))).toBe(false);
  });
});
