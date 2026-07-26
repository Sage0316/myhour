import { describe, expect, it } from 'vitest';
import { BGM_CATALOG, BGM_FILES, bgmAssetUrl } from './llmDirector';

// hakku-media 워커가 받아주는 키 형태 (media-server/worker.js의 KEY_PATTERN과 같아야 한다)
const MEDIA_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.mp3$/;

describe('BGM static asset catalog', () => {
  it('keeps all 21 unique files outside the JavaScript bundle', () => {
    expect(BGM_CATALOG).toHaveLength(21);
    expect(new Set(BGM_CATALOG.map(item => item.file)).size).toBe(21);
    expect(Object.values(BGM_FILES).every(files => files.length === 3)).toBe(true);
  });

  // 곡은 R2에 있고 hakku-media 워커가 파일명을 화이트리스트로 검사한다.
  // 형태에 맞지 않는 이름을 카탈로그에 넣으면 워커가 404를 주고, 영상에서 BGM만 조용히 빠진다.
  it('names every track so the media Worker will serve it', () => {
    const rejected = BGM_CATALOG.filter(item => !MEDIA_KEY_PATTERN.test(item.file));
    expect(rejected.map(item => item.file)).toEqual([]);
  });

  it('builds an asset URL only for catalog files', () => {
    expect(bgmAssetUrl('slice-of-life.mp3')).toMatch(/bgm\/slice-of-life\.mp3$/);
    expect(() => bgmAssetUrl('../secret.mp3')).toThrow('지원하지 않는');
  });
});
