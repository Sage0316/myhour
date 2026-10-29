import { beforeEach, describe, expect, it } from 'vitest';
import { isWatermarkEnabled, setWatermarkEnabled } from './videoWatermark';

describe('영상 로고 설정', () => {
  beforeEach(() => localStorage.clear());

  it('is on by default so shared films show the app name', () => {
    expect(isWatermarkEnabled()).toBe(true);
  });

  it('remembers when the user turns it off and back on', () => {
    setWatermarkEnabled(false);
    expect(isWatermarkEnabled()).toBe(false);
    setWatermarkEnabled(true);
    expect(isWatermarkEnabled()).toBe(true);
  });
});
