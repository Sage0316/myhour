import { describe, expect, it } from 'vitest';
import { resolveLang } from './i18n';

describe('언어 고르기', () => {
  it('follows the phone when set to auto', () => {
    expect(resolveLang('auto', ['ko-KR', 'en-US'])).toBe('ko');
    expect(resolveLang('auto', ['en-US', 'ko-KR'])).toBe('en');
  });

  it('falls back to English for phones in other languages', () => {
    expect(resolveLang('auto', ['ja-JP'])).toBe('en');
    expect(resolveLang('auto', [])).toBe('en');
  });

  it('lets the setting override the phone', () => {
    expect(resolveLang('ko', ['en-US'])).toBe('ko');
    expect(resolveLang('en', ['ko-KR'])).toBe('en');
  });
});
