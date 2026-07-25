import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteMediaBlob,
  listMediaKeys,
  loadMediaBlob,
  mediaStorageUsage,
  saveMediaBlob,
} from './mediaRepository';

beforeEach(async () => {
  const keys = await listMediaKeys();
  await Promise.all(keys.map(deleteMediaBlob));
});

describe('media repository', () => {
  it('persists and deletes typed blobs without swallowing errors', async () => {
    const source = new Blob(['hakku'], { type: 'text/plain' });
    await saveMediaBlob('media-1', source);
    const restored = await loadMediaBlob('media-1');
    expect(restored?.type).toBe('text/plain');
    expect(await restored?.text()).toBe('hakku');
    expect(await mediaStorageUsage()).toEqual({ count: 1, bytes: 5 });

    await deleteMediaBlob('media-1');
    expect(await loadMediaBlob('media-1')).toBeNull();
  });

  it('rejects empty blobs', async () => {
    await expect(saveMediaBlob('empty', new Blob([]))).rejects.toThrow();
  });
});
