import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dedupe, directorCacheKey, readDirectorCache, resetInFlight, stableHash, writeDirectorCache,
} from './directorCache';
import { consumeVideoForDate, hasVideoForDate } from './videoEntitlement';
import type { DirectorOutput } from './llmDirector';

const result = { title: 't', closing: 'c', mood: 'm', emojis: '😌', bgMusic: 'b', bgmTrack: 'calm', captions: [], recordEmojis: [] } as unknown as DirectorOutput;

const parts = {
  installationId: 'install-1',
  date: '2026-08-03',
  recordsHash: 'abc',
  intensityLevel: 1,
  promptVersion: 2,
};

beforeEach(() => {
  localStorage.clear();
  resetInFlight();
});

describe('AI 연출 캐시 키', () => {
  // 이 다섯 값 중 하나라도 달라지면 결과를 다시 받아야 한다
  it.each([
    ['설치 ID', { installationId: 'install-2' }],
    ['날짜', { date: '2026-08-04' }],
    ['기록 내용', { recordsHash: 'xyz' }],
    ['감정 강도 단계', { intensityLevel: 2 }],
    ['프롬프트 버전', { promptVersion: 3 }],
  ])('%s가 바뀌면 키가 달라진다', (_label, override) => {
    expect(directorCacheKey({ ...parts, ...override })).not.toBe(directorCacheKey(parts));
  });

  it('다섯 값이 같으면 키도 같다', () => {
    expect(directorCacheKey({ ...parts })).toBe(directorCacheKey({ ...parts }));
  });

  it('기록이 한 글자만 달라져도 해시가 갈린다', () => {
    expect(stableHash('라면 먹고 잤다')).not.toBe(stableHash('라면 먹고 잤다.'));
  });
});

describe('캐시 저장·재사용', () => {
  it('저장한 결과를 같은 키로 다시 읽는다', () => {
    const key = directorCacheKey(parts);
    writeDirectorCache(parts.date, key, result);
    expect(readDirectorCache(parts.date, key)).toEqual(result);
  });

  // 사용자가 강도를 2 → 4 → 2로 되돌리는 경우. 되돌아온 강도는 다시 부르지 않아야 한다.
  it('이전에 만든 강도로 돌아오면 그 강도의 결과가 남아 있다', () => {
    const weak = directorCacheKey({ ...parts, intensityLevel: 0 });
    const strong = directorCacheKey({ ...parts, intensityLevel: 2 });
    writeDirectorCache(parts.date, weak, { ...result, title: '약하게' });
    writeDirectorCache(parts.date, strong, { ...result, title: '강하게' });

    expect(readDirectorCache(parts.date, weak)?.title).toBe('약하게');
    expect(readDirectorCache(parts.date, strong)?.title).toBe('강하게');
  });

  it('저장된 적 없는 키는 null을 준다', () => {
    expect(readDirectorCache(parts.date, directorCacheKey(parts))).toBeNull();
  });
});

describe('중복 요청 잠금', () => {
  it('같은 키의 동시 요청은 한 번만 실행된다', async () => {
    const run = vi.fn().mockResolvedValue(result);
    const key = directorCacheKey(parts);

    const [a, b, c] = await Promise.all([
      dedupe(key, run), dedupe(key, run), dedupe(key, run),
    ]);

    expect(run).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('키가 다르면 각각 실행된다', async () => {
    const run = vi.fn().mockResolvedValue(result);
    await Promise.all([
      dedupe(directorCacheKey(parts), run),
      dedupe(directorCacheKey({ ...parts, intensityLevel: 2 }), run),
    ]);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('실패한 요청은 잠금을 풀어서 다시 시도할 수 있다', async () => {
    const key = directorCacheKey(parts);
    await expect(dedupe(key, () => Promise.reject(new Error('실패')))).rejects.toThrow('실패');
    await expect(dedupe(key, () => Promise.resolve(result))).resolves.toEqual(result);
  });
});

describe('영상 이용권', () => {
  it('영상 생성 성공 시 날짜당 한 번만 차감된다', () => {
    expect(hasVideoForDate('2026-08-03')).toBe(false);
    expect(consumeVideoForDate('2026-08-03')).toBe(true);
    expect(hasVideoForDate('2026-08-03')).toBe(true);
    // 같은 날짜로 다시 불러도 아무 일도 없다
    expect(consumeVideoForDate('2026-08-03')).toBe(false);
  });

  it('날짜가 다르면 따로 차감된다', () => {
    consumeVideoForDate('2026-08-03');
    expect(hasVideoForDate('2026-08-04')).toBe(false);
  });
});
