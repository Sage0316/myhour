import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BGM_CATALOG, BGM_FILES, bgmAssetUrl } from './llmDirector';

describe('BGM static asset catalog', () => {
  it('keeps all 21 unique files outside the JavaScript bundle', () => {
    expect(BGM_CATALOG).toHaveLength(21);
    expect(new Set(BGM_CATALOG.map(item => item.file)).size).toBe(21);
    expect(Object.values(BGM_FILES).every(files => files.length === 3)).toBe(true);
  });

  // 카탈로그에 public/bgm에 없는 파일명이 있으면 영상 생성 때 BGM만 조용히 빠진다
  it('points every catalog entry at a file that exists in public/bgm', () => {
    const bgmDir = fileURLToPath(new URL('../public/bgm/', import.meta.url));
    const missing = BGM_CATALOG.filter(item => !existsSync(`${bgmDir}${item.file}`));
    expect(missing.map(item => item.file)).toEqual([]);
  });

  it('builds a public relative asset URL only for catalog files', () => {
    expect(bgmAssetUrl('slice-of-life.mp3')).toMatch(/bgm\/slice-of-life\.mp3$/);
    expect(() => bgmAssetUrl('../secret.mp3')).toThrow('지원하지 않는');
  });
});
