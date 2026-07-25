import { z } from 'zod';
import {
  appDataSchema,
  settingsSchema,
  archiveEntrySchema,
  type JournalAppData,
  type JournalArchiveEntry,
  type JournalSettings,
} from '../domain/model';
import { hashBlob } from '../media/capabilities';
import {
  deleteMediaBlob,
  listMediaKeys,
  loadMediaBlob,
  saveMediaBlob,
} from '../persistence/mediaRepository';
import {
  loadAppData,
  loadArchive,
  loadSettings,
  saveAppData,
  saveArchive,
  saveSettings,
} from '../store';

const MAX_ENTRIES = 10_000;
const MAX_UNCOMPRESSED_BYTES = 1_500 * 1024 * 1024;

const manifestFileSchema = z.object({
  path: z.string().min(1).max(512),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  mediaType: z.string().max(128),
});

const backupManifestSchema = z.object({
  format: z.literal('hakku-backup'),
  version: z.literal(2),
  product: z.literal('하꾸'),
  exportedAt: z.string().datetime(),
  files: z.array(manifestFileSchema).max(MAX_ENTRIES),
});

const mediaIndexSchema = z.array(z.object({
  key: z.string().min(1).max(256),
  path: z.string().min(1).max(512),
  mediaType: z.string().max(128),
}));

export interface BackupProgress {
  phase: 'collecting' | 'hashing' | 'compressing' | 'validating' | 'restoring' | 'complete';
  completed: number;
  total: number;
}

export interface BackupExport {
  blob: Blob;
  filename: string;
  mediaCount: number;
  bytes: number;
}

function safePath(path: string): boolean {
  return !path.startsWith('/')
    && !path.startsWith('\\')
    && !path.includes('..')
    && !path.includes('\\')
    && path.length <= 512;
}

async function jsonBlob(value: unknown): Promise<Blob> {
  return new Blob([JSON.stringify(value)], { type: 'application/json' });
}

async function parseJsonFile<T>(blob: Blob, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(JSON.parse(await blob.text()));
}

export async function exportCompleteBackup(
  onProgress?: (progress: BackupProgress) => void,
): Promise<BackupExport> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const settings = loadSettings();
  const current = loadAppData(settings.startTime);
  const archive = loadArchive();
  const mediaKeys = await listMediaKeys();
  const files: z.infer<typeof manifestFileSchema>[] = [];
  const mediaIndex: z.infer<typeof mediaIndexSchema> = [];
  const total = mediaKeys.length + 4;
  let completed = 0;

  const add = async (path: string, blob: Blob, mediaType = blob.type || 'application/octet-stream') => {
    if (!safePath(path)) throw new Error(`안전하지 않은 백업 경로: ${path}`);
    const sha256 = await hashBlob(blob);
    zip.file(path, new Uint8Array(await blob.arrayBuffer()), {
      binary: true,
      compression: mediaType.startsWith('application/json') ? 'DEFLATE' : 'STORE',
    });
    files.push({ path, bytes: blob.size, sha256, mediaType });
    completed += 1;
    onProgress?.({ phase: 'hashing', completed, total });
  };

  onProgress?.({ phase: 'collecting', completed: 0, total });
  await add('data/settings.json', await jsonBlob(settings), 'application/json');
  await add('data/current.json', await jsonBlob(current), 'application/json');
  await add('data/archive.json', await jsonBlob(archive), 'application/json');

  for (const key of mediaKeys) {
    const blob = await loadMediaBlob(key);
    if (!blob) throw new Error(`백업할 미디어를 읽지 못했어요: ${key}`);
    const path = `media/${encodeURIComponent(key)}.bin`;
    mediaIndex.push({ key, path, mediaType: blob.type || 'application/octet-stream' });
    await add(path, blob);
  }

  const mediaIndexBlob = await jsonBlob(mediaIndex);
  await add('data/media-index.json', mediaIndexBlob, 'application/json');
  const manifest = backupManifestSchema.parse({
    format: 'hakku-backup',
    version: 2,
    product: '하꾸',
    exportedAt: new Date().toISOString(),
    files,
  });
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  onProgress?.({ phase: 'compressing', completed: total, total });
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE', streamFiles: true });
  onProgress?.({ phase: 'complete', completed: total, total });
  return {
    blob,
    filename: `hakku-${new Date().toISOString().slice(0, 10)}.hakku.zip`,
    mediaCount: mediaKeys.length,
    bytes: blob.size,
  };
}

export async function restoreCompleteBackup(
  backupFile: Blob,
  onProgress?: (progress: BackupProgress) => void,
): Promise<{ mediaCount: number; restoredBytes: number }> {
  if (backupFile.size > MAX_UNCOMPRESSED_BYTES) throw new Error('백업 파일이 허용 크기를 초과했어요.');
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await backupFile.arrayBuffer(), { checkCRC32: true, createFolders: false });
  const entries = Object.values(zip.files).filter(entry => !entry.dir);
  if (entries.length > MAX_ENTRIES) throw new Error('백업 항목 수가 너무 많아요.');
  for (const entry of entries) {
    const unsafeOriginalName = (entry as typeof entry & { unsafeOriginalName?: string }).unsafeOriginalName;
    if (!safePath(unsafeOriginalName ?? entry.name)) throw new Error('안전하지 않은 백업 경로가 있어요.');
  }

  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) throw new Error('백업 매니페스트가 없어요.');
  const manifest = backupManifestSchema.parse(JSON.parse(await manifestEntry.async('text')));
  const totalBytes = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
  if (totalBytes > MAX_UNCOMPRESSED_BYTES) throw new Error('백업 압축 해제 크기가 허용 범위를 초과했어요.');

  const verified = new Map<string, Blob>();
  let completed = 0;
  onProgress?.({ phase: 'validating', completed, total: manifest.files.length });
  for (const expected of manifest.files) {
    if (!safePath(expected.path)) throw new Error('안전하지 않은 파일 경로가 있어요.');
    const entry = zip.file(expected.path);
    if (!entry) throw new Error(`백업 파일이 누락됐어요: ${expected.path}`);
    const bytes = await entry.async('uint8array');
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: expected.mediaType });
    if (blob.size !== expected.bytes || await hashBlob(blob) !== expected.sha256) {
      throw new Error(`백업 무결성 검증에 실패했어요: ${expected.path}`);
    }
    verified.set(expected.path, blob);
    completed += 1;
    onProgress?.({ phase: 'validating', completed, total: manifest.files.length });
  }

  const requiredFiles = [
    'data/settings.json',
    'data/current.json',
    'data/archive.json',
    'data/media-index.json',
  ] as const;
  for (const path of requiredFiles) {
    if (!verified.has(path)) throw new Error(`필수 백업 파일이 누락됐어요: ${path}`);
  }

  const settings = await parseJsonFile(verified.get('data/settings.json') as Blob, settingsSchema);
  const current = await parseJsonFile(verified.get('data/current.json') as Blob, appDataSchema);
  const archives = await parseJsonFile(
    verified.get('data/archive.json') as Blob,
    z.array(archiveEntrySchema),
  );
  const mediaIndex = await parseJsonFile(verified.get('data/media-index.json') as Blob, mediaIndexSchema);
  const uniqueKeys = new Set(mediaIndex.map(item => item.key));
  if (uniqueKeys.size !== mediaIndex.length) throw new Error('백업 미디어 키가 중복됐어요.');

  const previousSettings: JournalSettings = loadSettings();
  const previousCurrent: JournalAppData = loadAppData(previousSettings.startTime);
  const previousArchives: JournalArchiveEntry[] = loadArchive();
  const previousKeys = await listMediaKeys();
  const overwritten = new Map<string, Blob>();
  for (const item of mediaIndex) {
    const existing = await loadMediaBlob(item.key);
    if (existing) overwritten.set(item.key, existing);
  }

  const written: string[] = [];
  completed = 0;
  onProgress?.({ phase: 'restoring', completed, total: mediaIndex.length + 3 });
  try {
    for (const item of mediaIndex) {
      const blob = verified.get(item.path);
      if (!blob) throw new Error(`미디어 파일이 누락됐어요: ${item.path}`);
      await saveMediaBlob(item.key, new Blob([blob], { type: item.mediaType }));
      written.push(item.key);
      completed += 1;
      onProgress?.({ phase: 'restoring', completed, total: mediaIndex.length + 3 });
    }
    saveSettings(settings);
    saveAppData(current);
    saveArchive(archives);
  } catch (error) {
    for (const key of written) {
      const original = overwritten.get(key);
      if (original) await saveMediaBlob(key, original);
      else await deleteMediaBlob(key);
    }
    saveSettings(previousSettings);
    saveAppData(previousCurrent);
    saveArchive(previousArchives);
    throw error;
  }

  // 커밋 이후의 고아 미디어 정리는 실패해도 복원 자체를 되돌리지 않는다.
  await Promise.all(previousKeys
    .filter(key => !uniqueKeys.has(key))
    .map(key => deleteMediaBlob(key).catch(() => undefined)));

  onProgress?.({ phase: 'complete', completed: mediaIndex.length + 3, total: mediaIndex.length + 3 });
  return { mediaCount: mediaIndex.length, restoredBytes: totalBytes };
}
