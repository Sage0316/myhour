import type { ArchiveEntry, MyRecord } from '../store';
import { deleteMediaBlob, listMediaKeys } from '../persistence/mediaRepository';

export interface CleanupReport {
  scanned: number;
  referenced: number;
  deleted: string[];
}

function collectRecordMedia(records: MyRecord[], target: Set<string>): void {
  for (const record of records) {
    const key = record.mediaId ?? record.videoKey;
    if (key) target.add(key);
  }
}

export async function cleanupOrphanMedia(
  currentRecords: MyRecord[],
  archives: ArchiveEntry[],
): Promise<CleanupReport> {
  const referenced = new Set<string>();
  collectRecordMedia(currentRecords, referenced);
  for (const archive of archives) {
    collectRecordMedia(archive.records, referenced);
    if (archive.isWrapped) referenced.add(`wrapped_${archive.id}`);
  }

  const keys = await listMediaKeys();
  const deleted: string[] = [];
  for (const key of keys) {
    if (!key.startsWith('media_') || referenced.has(key)) continue;
    await deleteMediaBlob(key);
    deleted.push(key);
  }
  return { scanned: keys.length, referenced: referenced.size, deleted };
}
