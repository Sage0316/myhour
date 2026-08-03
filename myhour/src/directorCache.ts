import type { DirectorOutput } from './llmDirector';

// AI 연출 결과 캐시.
// 예전엔 결과를 `hakku_director_v1_${date}`에 저장만 하고 아무도 읽지 않아서,
// 마감 화면을 열 때마다 같은 기록으로 API를 다시 불렀다 (영상 0편인데 비용만 나가는 상태).
// 이제 키에 "무엇이 달라지면 다시 불러야 하는가"를 전부 담는다:
//   설치 ID · 날짜 · 기록 내용 해시 · 감정 강도 단계 · 프롬프트 버전
const STORE_PREFIX = 'hakku_director_v2_';
// 오래된 날짜까지 계속 쌓으면 localStorage를 잡아먹는다. 최근 것만 남긴다.
const KEEP_DATES = 14;

// FNV-1a. 기록이 한 글자만 달라져도 키가 갈리면 충분하고, 암호학적 강도는 필요 없다.
// 렌더 중에 동기로 계산해야 해서 crypto.subtle(비동기)은 쓰지 않는다.
export function stableHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

export interface DirectorCacheKeyParts {
  installationId: string;
  date: string;
  /** AI에 실제로 보내는 페이로드의 해시 — 보내는 것과 해시 대상이 어긋나면 캐시가 거짓말을 한다 */
  recordsHash: string;
  /** 감정 강도 "단계"(0·1·2). 슬라이더 원값(0~100)을 그대로 넣으면 드래그마다 키가 바뀐다 */
  intensityLevel: number;
  promptVersion: number;
}

export function directorCacheKey(parts: DirectorCacheKeyParts): string {
  return [
    parts.installationId,
    parts.date,
    parts.recordsHash,
    `i${parts.intensityLevel}`,
    `p${parts.promptVersion}`,
  ].join('|');
}

type DateBucket = Record<string, DirectorOutput>;

function bucketKey(date: string): string {
  return `${STORE_PREFIX}${date}`;
}

function readBucket(date: string): DateBucket {
  try {
    const raw = localStorage.getItem(bucketKey(date));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as DateBucket : {};
  } catch {
    return {};
  }
}

export function readDirectorCache(date: string, key: string): DirectorOutput | null {
  return readBucket(date)[key] ?? null;
}

export function writeDirectorCache(date: string, key: string, value: DirectorOutput): void {
  try {
    const bucket = readBucket(date);
    bucket[key] = value;
    localStorage.setItem(bucketKey(date), JSON.stringify(bucket));
    pruneOldDates(date);
  } catch {
    // 저장 실패는 치명적이지 않다 — 다음에 다시 부르면 될 뿐이다
  }
}

function pruneOldDates(keepDate: string): void {
  try {
    const dates: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORE_PREFIX)) dates.push(key.slice(STORE_PREFIX.length));
    }
    if (dates.length <= KEEP_DATES) return;
    dates.sort().reverse();
    for (const date of dates.slice(KEEP_DATES)) {
      if (date !== keepDate) localStorage.removeItem(bucketKey(date));
    }
  } catch {
    // 정리 실패는 무시 — 다음 저장 때 다시 시도된다
  }
}

// 같은 키의 요청이 동시에 두 번 나가지 않게 한다.
// 버튼 연타·재마운트·React StrictMode의 이중 실행이 전부 여기서 합쳐진다.
const inFlight = new Map<string, Promise<DirectorOutput>>();

export function dedupe(key: string, run: () => Promise<DirectorOutput>): Promise<DirectorOutput> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = run().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

export function isInFlight(key: string): boolean {
  return inFlight.has(key);
}

/** 테스트용 — 모듈 상태를 초기화한다 */
export function resetInFlight(): void {
  inFlight.clear();
}
