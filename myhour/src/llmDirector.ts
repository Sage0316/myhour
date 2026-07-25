import { z } from 'zod';
import type { MyRecord } from './store';

const AI_CONSENT_STORAGE = 'hakku_ai_consent_v1';
const AI_INSTALLATION_STORAGE = 'hakku_ai_installation_v1';
const AI_TOKEN_STORAGE = 'hakku_ai_token_v1';
export const AI_WORKER_URL = (import.meta.env.VITE_AI_WORKER_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export type BgmTrack = 'calm' | 'bright' | 'emotional' | 'piano' | 'ukulele' | 'nostalgic';

export const BGM_TRACKS: Record<BgmTrack, string> = {
  calm: '차분한 lo-fi',
  bright: '경쾌한 멜로디',
  emotional: '감성적인 비트',
  piano: '잔잔한 피아노',
  ukulele: '가벼운 우쿨렐레',
  nostalgic: '따뜻한 노스탤지어',
};

export const BGM_FILES: Record<BgmTrack, readonly string[]> = {
  calm: ['calm.mp3', 'slice-of-life.mp3', 'lagoon.mp3'],
  bright: ['bright.mp3', 'just-like-that.mp3', 'city-sunshine.mp3'],
  emotional: ['emotional.mp3', 'shining-stars.mp3', 'magic-garden.mp3'],
  piano: ['piano.mp3', 'landras-dream.mp3', 'piano-magic.mp3'],
  ukulele: ['ukulele.mp3', 'ukulele-song.mp3', 'funshine.mp3'],
  nostalgic: ['nostalgic.mp3', 'travelers-notebook.mp3', 'tournesol.mp3'],
};

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

export function bgmAssetUrl(file: string): string {
  if (!BGM_CATALOG.some(item => item.file === file)) throw new Error('지원하지 않는 BGM 파일이에요.');
  return `${import.meta.env.BASE_URL}bgm/${encodeURIComponent(file)}`;
}

const directorOutputSchema = z.object({
  title: z.string().trim().min(1).max(30),
  closing: z.string().trim().min(1).max(80),
  mood: z.string().trim().min(1).max(40),
  emojis: z.string().trim().max(20),
  bgMusic: z.string().trim().max(60),
  bgmTrack: z.enum(['calm', 'bright', 'emotional', 'piano', 'ukulele', 'nostalgic']),
  captions: z.array(z.string().trim().max(30)).max(96),
  diaryEmojis: z.array(z.string().trim().max(12)).max(96),
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

function getInstallationId(): string {
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

export async function analyzeDay(
  records: MyRecord[],
  dateStr: string,
  signal?: AbortSignal,
): Promise<DirectorOutput> {
  if (!hasAIConsent()) throw new Error('AI 분석 동의가 필요해요.');
  const token = await getInstallationToken(signal);
  const response = await fetch(`${AI_WORKER_URL}/v1/direct`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: dateStr.slice(0, 40),
      records: records.slice(0, 96).map(record => ({
        slotTime: record.slotTime,
        type: record.type,
        content: record.type === 'text' ? record.content.slice(0, 2_000) : '',
        caption: record.caption?.slice(0, 500) ?? '',
      })),
    }),
    signal,
  });
  const body = await response.json().catch(() => ({})) as { result?: unknown; error?: string };
  if (!response.ok) throw new Error(body.error ?? `AI 분석 오류 (${response.status})`);
  return directorOutputSchema.parse(body.result);
}
