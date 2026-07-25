import { describe, expect, it } from 'vitest';
import { BGM_CATALOG, BGM_FILES, bgmAssetUrl } from './llmDirector';

describe('BGM static asset catalog', () => {
  it('keeps all 18 unique files outside the JavaScript bundle', () => {
    expect(BGM_CATALOG).toHaveLength(18);
    expect(new Set(BGM_CATALOG.map(item => item.file)).size).toBe(18);
    expect(Object.values(BGM_FILES).every(files => files.length === 3)).toBe(true);
  });

  it('builds a public relative asset URL only for catalog files', () => {
    expect(bgmAssetUrl('slice-of-life.mp3')).toMatch(/bgm\/slice-of-life\.mp3$/);
    expect(() => bgmAssetUrl('../secret.mp3')).toThrow('지원하지 않는');
  });
});
