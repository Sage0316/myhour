import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkCaptureCapacity, hashBlob } from './capabilities';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('capture capacity', () => {
  it('rejects media above the configured limit', async () => {
    const report = await checkCaptureCapacity('audio', 16 * 1024 * 1024);
    expect(report.allowed).toBe(false);
  });

  it('reserves storage space before accepting capture', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { storage: { estimate: async () => ({ quota: 100, usage: 80 }) } },
    });
    const report = await checkCaptureCapacity('photo', 10);
    expect(report.allowed).toBe(false);
  });

  it('hashes the same blob deterministically', async () => {
    const blob = new Blob(['하꾸']);
    expect(await hashBlob(blob)).toBe(await hashBlob(blob));
  });
});
