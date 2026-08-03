import { describe, expect, it } from 'vitest';
import { BGM_CATALOG, BGM_FILES, DEFAULT_MEDIA_BASE_URL, bgmAssetUrl, trackForMood, intensityForTrack } from './llmDirector';
import { MOOD_LIST } from './store';

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

  it('always builds a media Worker URL for catalog files', () => {
    expect(bgmAssetUrl('slice-of-life.mp3')).toBe(`${DEFAULT_MEDIA_BASE_URL}/bgm/slice-of-life.mp3`);
    expect(() => bgmAssetUrl('../secret.mp3')).toThrow('지원하지 않는');
  });
});

describe('무드 × 감정 강도 → 곡', () => {
  // 예전엔 강도가 calm/bright 둘로만 접혀서, 슬픈 날 슬라이더를 조금 내리면
  // 경쾌한 곡이 붙었다. 우울한 영상에 신나는 음악이 깔리는 게 가장 나쁜 결과였다.
  it('슬픈 날은 강도를 낮춰도 절대 경쾌한 곡으로 가지 않는다', () => {
    for (let i = 0; i <= 100; i += 5) {
      const track = trackForMood('슬픔', i);
      expect(track).not.toBe('bright');
      expect(track).not.toBe('ukulele');
    }
  });

  it('같은 무드라도 강도에 따라 곡이 달라진다', () => {
    expect(trackForMood('슬픔', 10)).toBe('piano');
    expect(trackForMood('슬픔', 55)).toBe('nostalgic');
    expect(trackForMood('슬픔', 90)).toBe('sad');
  });

  it('모든 무드가 실제 존재하는 곡 풀을 가리킨다', () => {
    for (const mood of MOOD_LIST) {
      for (const intensity of [0, 50, 100]) {
        expect(BGM_FILES[trackForMood(mood.mood, intensity)]?.length).toBeGreaterThan(0);
      }
    }
  });

  it('슬라이더 초깃값은 AI가 고른 곡의 단계를 되짚는다', () => {
    expect(trackForMood('슬픔', intensityForTrack('슬픔', 'sad'))).toBe('sad');
    expect(trackForMood('감성', intensityForTrack('감성', 'piano'))).toBe('piano');
    expect(trackForMood('웃김', intensityForTrack('웃김', 'bright'))).toBe('bright');
  });

  it('그 무드에 없는 곡을 AI가 골랐어도 중간값으로 받아준다', () => {
    expect(intensityForTrack('슬픔', 'ukulele')).toBe(60);
  });
});
