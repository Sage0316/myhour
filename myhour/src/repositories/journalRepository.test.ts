import { beforeEach, describe, expect, it } from 'vitest';
import { journalRepository } from './journalRepository';

const ARCHIVE_KEY = 'hakku_archive_v2_active';

beforeEach(() => {
  localStorage.clear();
});

describe('journal archive repository', () => {
  // 제목은 영상에 실제로 들어간 문장 — 읽기 경로에서 떨어지면 아카이브 카드가
  // 사용자가 고친 제목 대신 기록에서 만든 제목으로 조용히 돌아간다
  it('keeps the stored video title through a save/load round trip', () => {
    journalRepository.saveArchive([{
      id: 'archive_1',
      date: '2026-07-25',
      records: [],
      isWrapped: true,
      trimmed: false,
      title: '반지와 떡볶이',
    }]);
    expect(journalRepository.loadArchive('2026-07-25')[0].title).toBe('반지와 떡볶이');
  });

  it('leaves the title undefined for entries saved before it existed', () => {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify([{
      id: 'archive_legacy',
      date: '2026-07-20',
      records: [],
      isWrapped: true,
    }]));
    expect(journalRepository.loadArchive('2026-07-25')[0].title).toBeUndefined();
  });

  it('keeps meme records instead of dropping them at the schema boundary', () => {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify([{
      id: 'archive_meme',
      date: '2026-07-25',
      isWrapped: true,
      records: [{
        id: 'record_1',
        slotTime: '09:00',
        type: 'meme',
        content: '',
        caption: '딱 이 기분',
        mediaKey: 'media_1',
        createdAt: 1_784_000_000_000,
      }],
    }]));
    const [entry] = journalRepository.loadArchive('2026-07-25');
    expect(entry.records).toHaveLength(1);
    expect(entry.records[0].type).toBe('meme');
    // mediaKey는 2026-07 배포판의 필드명 — mediaId로 이어져야 원본을 되찾을 수 있다
    expect(entry.records[0].mediaId).toBe('media_1');
  });
});
