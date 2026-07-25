import { z } from 'zod';

export const recordTypeSchema = z.enum(['text', 'video', 'photo', 'audio']);
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
    mediaId: typeof legacy.mediaId === 'string'
      ? legacy.mediaId
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
