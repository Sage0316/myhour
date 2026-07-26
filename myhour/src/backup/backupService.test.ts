import { beforeEach, describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { exportCompleteBackup, restoreCompleteBackup } from './backupService';
import { deleteMediaBlob, listMediaKeys, loadMediaBlob, saveMediaBlob } from '../persistence/mediaRepository';
import { DEFAULT_SETTINGS, getSessionDate, loadAppData, saveAppData, saveSettings } from '../store';

describe('complete backup', () => {
  beforeEach(async () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        get length() { return values.size; },
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => [...values.keys()][index] ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, String(value)),
      } satisfies Storage,
    });
    localStorage.clear();
    await Promise.all((await listMediaKeys()).map(deleteMediaBlob));
  });

  it('round-trips metadata and media', async () => {
    saveSettings(DEFAULT_SETTINGS);
    const sessionDate = getSessionDate(DEFAULT_SETTINGS.startTime);
    const original = loadAppData(DEFAULT_SETTINGS.startTime);
    saveAppData({ ...original, date: sessionDate });
    await saveMediaBlob('media_test', new Blob(['hello'], { type: 'text/plain' }));

    const exported = await exportCompleteBackup();
    localStorage.clear();
    await restoreCompleteBackup(exported.blob);

    expect(loadAppData(DEFAULT_SETTINGS.startTime).date).toBe(sessionDate);
    expect(await (await loadMediaBlob('media_test'))?.text()).toBe('hello');
  });

  it('rejects a manifest hash mismatch without changing data', async () => {
    saveSettings(DEFAULT_SETTINGS);
    const before = loadAppData(DEFAULT_SETTINGS.startTime);
    const exported = await exportCompleteBackup();
    const zip = await JSZip.loadAsync(await exported.blob.arrayBuffer());
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('text'));
    manifest.files[0].sha256 = '0'.repeat(64);
    zip.file('manifest.json', JSON.stringify(manifest));
    const tampered = await zip.generateAsync({ type: 'blob' });

    await expect(restoreCompleteBackup(tampered)).rejects.toThrow('무결성');
    expect(loadAppData(DEFAULT_SETTINGS.startTime)).toEqual(before);
  });
});
