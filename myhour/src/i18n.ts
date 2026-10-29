// 한국어/영어 두 언어만 쓴다. 문장마다 L('한국어', 'English')로 두 언어를 나란히 적어서,
// 코드를 읽을 때 한국어 문장이 그대로 보이고 번역이 빠진 곳도 바로 눈에 띄게 한다.
// 언어를 바꾸면 앱을 다시 불러온다 — 드물게 쓰는 설정이라 화면마다 구독을 다는 것보다 단순하다.

export type Lang = 'ko' | 'en';
export type LangPref = 'auto' | Lang;

const KEY = 'hakku_lang_v1';

/** 폰 언어 목록에서 첫 번째가 한국어면 한국어, 아니면 영어 (일본어·스페인어 폰에도 한국어보다 영어가 낫다) */
export function resolveLang(pref: LangPref, languages: readonly string[]): Lang {
  if (pref !== 'auto') return pref;
  return languages[0]?.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function loadLangPref(): LangPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'ko' || v === 'en' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function deviceLanguages(): readonly string[] {
  // 테스트는 한국어 문장을 기대한다 — 테스트 러너의 navigator는 en-US라 따로 고정한다
  if (import.meta.env.MODE === 'test') return ['ko'];
  if (typeof navigator === 'undefined') return ['ko'];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

let current: Lang | null = null;

export function getLang(): Lang {
  return current ??= resolveLang(loadLangPref(), deviceLanguages());
}

/** 설정에서 언어를 바꾼다. 화면에 반영하려면 부른 쪽에서 앱을 다시 불러와야 한다 */
export function saveLangPref(pref: LangPref): void {
  try {
    if (pref === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch { /* 저장이 막혀도 이번 실행에서는 바뀐 언어를 쓴다 */ }
  current = resolveLang(pref, deviceLanguages());
}

export function L(ko: string, en: string): string {
  return getLang() === 'en' ? en : ko;
}
