import { z } from 'zod';

// 'meme'(앨범에서 고른 짤·사진)은 2026-07 추가된 타입 — 빠지면 짤이 담긴 기록/아카이브가
// normalizeRecord의 safeParse에서 탈락해 조용히 사라진다. 절대 빼지 말 것.
export const recordTypeSchema = z.enum(['text', 'video', 'photo', 'audio', 'meme']);
export type RecordType = z.infer<typeof recordTypeSchema>;

export const recordSchema = z.object({
  id: z.string().min(1).max(128),
  slotId: z.string().regex(/^\d{2}:\d{2}$/),
  capturedAt: z.string().datetime(),
  type: recordTypeSchema,
  content: z.string(),
  caption: z.string().max(2_000).optional(),
  mediaId: z.string().min(1).max(256).optional(),
  mediaType: z.string().max(128).optional(),
  mediaSize: z.number().int().nonnegative().optional(),
  createdAt: z.number().finite(),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/),
  videoKey: z.string().min(1).max(256).optional(),
});

export type JournalRecord = z.infer<typeof recordSchema>;

export const settingsSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endMode: z.enum(['open', 'fixed']),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  interval: z.union([z.literal(30), z.literal(60), z.literal(120)]),
  notifyTiming: z.enum(['before', 'exact', 'both']),
  captureMode: z.enum(['choose', 'fixed']),
  defaultType: recordTypeSchema,
  outputRatio: z.enum(['9:16', '1:1']),
  bgMusic: z.string().max(128),
});

export type JournalSettings = z.infer<typeof settingsSchema>;

export const appDataSchema = z.object({
  schemaVersion: z.literal(2),
  records: z.array(recordSchema),
  isWrapped: z.boolean(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type JournalAppData = z.infer<typeof appDataSchema>;

export const archiveEntrySchema = z.object({
  id: z.string().min(1).max(128),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(recordSchema),
  isWrapped: z.boolean(),
  trimmed: z.boolean().optional(),
  // 영상에 실제로 들어간 제목 (사용자가 고쳤거나 AI가 지은 것). 없으면 generateTitle로 폴백
  title: z.string().trim().max(60).optional(),
});

export type JournalArchiveEntry = z.infer<typeof archiveEntrySchema>;

export function createStableId(prefix: string): string {
  const value = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${value}`;
}

function legacyCapturedAt(value: unknown): string {
  const timestamp = typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
  return new Date(timestamp).toISOString();
}

export function normalizeRecord(value: unknown): JournalRecord | null {
  if (!value || typeof value !== 'object') return null;
  const legacy = value as Record<string, unknown>;
  const slotId = typeof legacy.slotId === 'string'
    ? legacy.slotId
    : typeof legacy.slotTime === 'string'
      ? legacy.slotTime
      : '09:00';
  const createdAt = typeof legacy.createdAt === 'number' ? legacy.createdAt : Date.now();
  const candidate = {
    ...legacy,
    id: typeof legacy.id === 'string' && legacy.id ? legacy.id : createStableId('record'),
    slotId,
    slotTime: slotId,
    capturedAt: typeof legacy.capturedAt === 'string'
      ? legacy.capturedAt
      : legacyCapturedAt(createdAt),
    createdAt,
    // mediaKey는 2026-07 배포판이 사진·음성 원본을 IDB에 넣을 때 쓴 필드명 —
    // 여기서 mediaId로 이어주지 않으면 그 기록들은 content가 빈 채로 남아 원본을 잃는다
    mediaId: typeof legacy.mediaId === 'string'
      ? legacy.mediaId
      : typeof legacy.mediaKey === 'string'
        ? legacy.mediaKey
        : typeof legacy.videoKey === 'string'
          ? legacy.videoKey
          : undefined,
  };
  const parsed = recordSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function normalizeRecords(value: unknown): JournalRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const record = normalizeRecord(item);
    return record ? [record] : [];
  });
}
