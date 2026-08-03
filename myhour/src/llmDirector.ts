import { z } from 'zod';
import type { MyRecord } from './store';
import {
  dedupe, directorCacheKey, readDirectorCache, stableHash, writeDirectorCache,
} from './directorCache';
import { MOOD_LIST } from './store';

const MOOD_NAMES = MOOD_LIST.map(item => item.mood) as unknown as [string, ...string[]];

const AI_CONSENT_STORAGE = 'hakku_ai_consent_v1';
const AI_INSTALLATION_STORAGE = 'hakku_ai_installation_v1';
const AI_TOKEN_STORAGE = 'hakku_ai_token_v1';
export const AI_WORKER_URL = (import.meta.env.VITE_AI_WORKER_URL as string | undefined)?.replace(/\/$/, '') ?? '';

// 프롬프트나 응답 규격을 바꾸면 이 숫자를 올린다. 캐시 키에 들어가므로
// 옛 프롬프트로 만든 결과가 새 프롬프트 결과와 섞이지 않는다.
export const PROMPT_VERSION = 2;

// 감정 강도 라벨 — 캐시 키의 단계(0·1·2)와 워커 프롬프트가 같은 말을 쓰게 한다
export const INTENSITY_LABELS = ['약하게', '보통', '강하게'] as const;
export type IntensityLevel = 0 | 1 | 2;

// 슬라이더 원값(0~100) → 단계. 드래그 중 키가 매 픽셀 바뀌지 않도록 여기서 접는다.
export function toIntensityLevel(intensity: number): IntensityLevel {
  if (intensity < 40) return 0;
  return intensity < 70 ? 1 : 2;
}

export type BgmTrack = 'calm' | 'bright' | 'emotional' | 'piano' | 'ukulele' | 'nostalgic' | 'sad';

export const BGM_TRACKS: Record<BgmTrack, string> = {
  calm: '차분한 lo-fi',
  bright: '경쾌한 멜로디',
  emotional: '감성적인 비트',
  piano: '잔잔한 피아노',
  ukulele: '가벼운 우쿨렐레',
  nostalgic: '따뜻한 노스탤지어',
  sad: '차분한 슬픔·위로',
};

// 무드별 곡 풀 — AI는 무드만 고르고, 그 안에서 매번 랜덤으로 한 곡이 뽑힌다 (전곡 CC0).
// 파일명은 R2의 myhour-media 객체 키와 정확히 일치해야 한다. 2026-07 라이선스 감사에서 출처 미상이던
// calm/bright/emotional.mp3는 삭제하고 study-and-relax/pickled-pink/cornfield-chase로 교체했다.
export const BGM_FILES: Record<BgmTrack, readonly string[]> = {
  calm: ['study-and-relax.mp3', 'slice-of-life.mp3', 'lagoon.mp3'],
  bright: ['pickled-pink.mp3', 'just-like-that.mp3', 'city-sunshine.mp3'],
  emotional: ['cornfield-chase.mp3', 'shining-stars.mp3', 'magic-garden.mp3'],
  piano: ['piano.mp3', 'landras-dream.mp3', 'piano-magic.mp3'],
  ukulele: ['ukulele.mp3', 'ukulele-song.mp3', 'funshine.mp3'],
  nostalgic: ['nostalgic.mp3', 'travelers-notebook.mp3', 'tournesol.mp3'],
  sad: ['winter.mp3', 'isolation-waltz.mp3', 'cold-journey.mp3'],
};

// 무드 × 감정 강도 → 곡 풀. [약하게, 보통, 강하게] 순.
// 같은 "슬픔"이라도 덜 가라앉은 날엔 잔잔한 피아노, 깊은 날엔 위로하는 곡으로 간다.
// 예전엔 강도가 calm/bright 둘 중 하나로만 접혀서, 슬픈 날 슬라이더를 조금만 내려도
// 음악이 경쾌한 곡으로 튀었다 — 영상 분위기와 정면으로 어긋나는 결과였다.
export const MOOD_TRACKS: Record<string, readonly [BgmTrack, BgmTrack, BgmTrack]> = {
  '잔잔함': ['calm', 'calm', 'piano'],
  '뿌듯함': ['calm', 'bright', 'bright'],
  '감성': ['piano', 'nostalgic', 'emotional'],
  '웃김': ['ukulele', 'ukulele', 'bright'],
  '정신없음': ['calm', 'bright', 'bright'],
  '슬픔': ['piano', 'nostalgic', 'sad'],
  '짜증': ['calm', 'calm', 'sad'],
  '지침': ['calm', 'nostalgic', 'sad'],
};

const DEFAULT_MOOD_TRACKS = MOOD_TRACKS['잔잔함'];

export function trackForMood(mood: string, intensity: number): BgmTrack {
  return (MOOD_TRACKS[mood] ?? DEFAULT_MOOD_TRACKS)[toIntensityLevel(intensity)];
}

// 슬라이더 초깃값 — AI가 고른 곡이 그 무드에서 몇 번째 단계인지 되짚는다.
// 이래야 슬라이더가 AI의 판단을 그대로 비추고, 사용자가 옮긴 만큼만 달라진다.
export function intensityForTrack(mood: string, track: BgmTrack): number {
  const index = (MOOD_TRACKS[mood] ?? DEFAULT_MOOD_TRACKS).lastIndexOf(track);
  return index < 0 ? 60 : [25, 55, 85][index];
}

export function pickBgmFile(track: BgmTrack): string {
  const files = BGM_FILES[track] ?? BGM_FILES.calm;
  return files[Math.floor(Math.random() * files.length)];
}

export const BGM_CATALOG = (Object.entries(BGM_FILES) as Array<[BgmTrack, readonly string[]]>)
  .flatMap(([track, files]) => files.map(file => ({
    track,
    file,
    label: file.replace(/\.mp3$/i, '').replaceAll('-', ' '),
  })));

// 곡 파일은 R2(myhour-media)에 있고 hakku-media 워커가 내보낸다. 앱 배포본에는 넣지 않는다 —
// 배포본 118MB 중 114MB가 오디오였다. 지연 로딩과 "번들·precache에 넣지 않는다"는
// 원래 정책은 그대로다 (CLAUDE.md 참고). Worker 주소는 공개 엔드포인트라 기본값으로 고정하고,
// VITE_MEDIA_BASE_URL은 다른 환경에서만 재정의한다. public/bgm은 삭제됐으므로 로컬 경로로 폴백하면 안 된다.
export const DEFAULT_MEDIA_BASE_URL = 'https://hakku-media.sage0316.workers.dev';
const MEDIA_BASE_URL = (
  (import.meta.env.VITE_MEDIA_BASE_URL as string | undefined)?.trim() || DEFAULT_MEDIA_BASE_URL
).replace(/\/$/, '');

export function bgmAssetUrl(file: string): string {
  if (!BGM_CATALOG.some(item => item.file === file)) throw new Error('지원하지 않는 BGM 파일이에요.');
  const name = encodeURIComponent(file);
  return `${MEDIA_BASE_URL}/bgm/${name}`;
}

const directorOutputSchema = z.object({
  title: z.string().trim().min(1).max(30),
  closing: z.string().trim().min(1).max(80),
  mood: z.string().trim().min(1).max(40),
  // 마감 화면 무드 칩 자동 선택용 — MOOD_LIST 중 하나. AI가 엉뚱한 값을 주면 서버가 지운다
  moodChip: z.enum(MOOD_NAMES).optional(),
  emojis: z.string().trim().max(20),
  bgMusic: z.string().trim().max(60),
  bgmTrack: z.enum(['calm', 'bright', 'emotional', 'piano', 'ukulele', 'nostalgic', 'sad']),
  captions: z.array(z.string().trim().max(30)).max(96),
  // 기록별 내용 이모지 — 무드 이모지(emojis)와 섞지 말 것 (CLAUDE.md 이모지 규칙)
  recordEmojis: z.array(z.string().trim().max(12)).max(96),
});

export type DirectorOutput = z.infer<typeof directorOutputSchema>;

export function hasAIConsent(): boolean {
  return localStorage.getItem(AI_CONSENT_STORAGE) === 'true';
}

export function setAIConsent(consented: boolean): void {
  if (consented) localStorage.setItem(AI_CONSENT_STORAGE, 'true');
  else {
    localStorage.removeItem(AI_CONSENT_STORAGE);
    localStorage.removeItem(AI_TOKEN_STORAGE);
  }
}

export function isAIConfigured(): boolean {
  return AI_WORKER_URL.length > 0;
}

export function getInstallationId(): string {
  const existing = localStorage.getItem(AI_INSTALLATION_STORAGE);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(AI_INSTALLATION_STORAGE, id);
  return id;
}

async function getInstallationToken(signal?: AbortSignal): Promise<string> {
  const cached = localStorage.getItem(AI_TOKEN_STORAGE);
  if (cached) return cached;
  if (!AI_WORKER_URL) throw new Error('AI 서버가 아직 연결되지 않았어요.');
  const response = await fetch(`${AI_WORKER_URL}/v1/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ installationId: getInstallationId() }),
    signal,
  });
  const body = await response.json().catch(() => ({})) as { token?: string; error?: string };
  if (!response.ok || !body.token) throw new Error(body.error ?? 'AI 연결을 만들지 못했어요.');
  localStorage.setItem(AI_TOKEN_STORAGE, body.token);
  return body.token;
}

// 워커가 돌려주는 오류 코드를 사람이 읽을 문장으로 옮긴다.
// 코드는 괄호에 남겨서, 문제가 생겼을 때 어느 단계에서 막혔는지 바로 알 수 있게 한다.
const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'AI 연결이 만료됐어요. 다시 시도해 주세요.',
  daily_quota_exceeded: '오늘 쓸 수 있는 AI 분석을 다 썼어요. 내일 다시 시도해 주세요.',
  rate_limit_exceeded: '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.',
  invalid_request: '기록 형식이 올바르지 않아 분석하지 못했어요.',
  origin_not_allowed: '허용되지 않은 주소에서 온 요청이에요.',
  provider_not_configured: 'AI 서버에 API 키가 설정되지 않았어요.',
  provider_auth_failed: 'AI 서버의 API 키가 거절됐어요. 키를 다시 등록해 주세요.',
  provider_forbidden: 'AI 게이트웨이가 요청을 막았어요. 게이트웨이 설정을 확인해 주세요.',
  provider_rate_limited: 'AI 사용량 한도에 걸렸어요. 잠시 후 다시 시도해 주세요.',
  provider_unavailable: 'AI 서버가 일시적으로 응답하지 않아요. 잠시 후 다시 시도해 주세요.',
  invalid_provider_output: 'AI 응답을 이해하지 못했어요. 다시 시도해 주세요.',
  analysis_unavailable: 'AI 분석에 실패했어요. 잠시 후 다시 시도해 주세요.',
};

function directorError(code: string | undefined, status: number): Error {
  if (!code) return new Error(`AI 분석 오류 (${status})`);
  return new Error(`${ERROR_MESSAGES[code] ?? 'AI 분석에 실패했어요.'} (${code})`);
}

// AI에 실제로 보내는 기록 페이로드. 캐시 해시도 **이 함수 결과**로 만든다 —
// 보내는 것과 해시 대상이 어긋나면 캐시가 거짓말을 하기 때문이다.
export function directorRecordsPayload(records: MyRecord[]) {
  return records.slice(0, 96).map(record => ({
    slotTime: record.slotTime,
    type: record.type,
    content: record.type === 'text' ? record.content.slice(0, 2_000) : '',
    caption: record.caption?.slice(0, 500) ?? '',
  }));
}

export function directorKeyFor(
  records: MyRecord[],
  date: string,
  intensityLevel: IntensityLevel,
): string {
  return directorCacheKey({
    installationId: getInstallationId(),
    date,
    recordsHash: stableHash(JSON.stringify(directorRecordsPayload(records))),
    intensityLevel,
    promptVersion: PROMPT_VERSION,
  });
}

async function requestDirector(
  records: MyRecord[],
  dateStr: string,
  intensityLevel: IntensityLevel,
  signal?: AbortSignal,
): Promise<DirectorOutput> {
  if (!hasAIConsent()) throw new Error('AI 분석 동의가 필요해요.');
  const payload = JSON.stringify({
    date: dateStr.slice(0, 40),
    records: directorRecordsPayload(records),
    // 강도를 보내야 제목·마무리·선곡이 강도를 반영한다. 예전엔 강도가 로컬에서
    // 곡 풀만 골랐고 AI는 강도를 아예 몰랐다.
    intensity: INTENSITY_LABELS[intensityLevel],
    promptVersion: PROMPT_VERSION,
  });
  const post = async (token: string) => fetch(`${AI_WORKER_URL}/v1/direct`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: payload,
    signal,
  });

  let response = await post(await getInstallationToken(signal));
  if (response.status === 401) {
    // 워커의 INSTALL_TOKEN_SECRET이 바뀌면 폰에 저장된 토큰이 무효가 된다.
    // 예전엔 설정에서 AI 동의를 껐다 켜야 풀렸고, 그 사이 증상이 "분석 불가"로만 보여서
    // 키가 죽은 것처럼 오해하기 쉬웠다. 여기서 토큰을 버리고 한 번 다시 받는다.
    localStorage.removeItem(AI_TOKEN_STORAGE);
    response = await post(await getInstallationToken(signal));
  }
  const body = await response.json().catch(() => ({})) as { result?: unknown; error?: string };
  if (!response.ok) throw directorError(body.error, response.status);
  return directorOutputSchema.parse(body.result);
}

/**
 * 캐시 우선 AI 연출. 같은 (설치 · 날짜 · 기록 · 강도 단계 · 프롬프트 버전)이면
 * API를 부르지 않고 저장된 결과를 돌려준다. 같은 키의 동시 요청은 하나로 합쳐진다.
 */
export async function analyzeDay(
  records: MyRecord[],
  dateStr: string,
  date: string,
  intensityLevel: IntensityLevel,
  signal?: AbortSignal,
): Promise<DirectorOutput> {
  const key = directorKeyFor(records, date, intensityLevel);
  const cached = readDirectorCache(date, key);
  if (cached) return cached;
  return dedupe(key, async () => {
    const result = await requestDirector(records, dateStr, intensityLevel, signal);
    writeDirectorCache(date, key, result);
    return result;
  });
}
