// 한국어·영어·일본어(2026-11-01 추가). 문장마다 L('한국어', 'English')로 두 언어를 나란히 적어서,
// 코드를 읽을 때 한국어 문장이 그대로 보이고 번역이 빠진 곳도 바로 눈에 띄게 한다.
// 일본어는 i18nJa.ts의 사전(한국어 문장 → 일본어)에서 찾고, 숫자가 섞인 문장만 세 번째 인자로 적는다.
// 사전에 없으면 영어로 보인다 — 새 문장을 추가하면 사전에도 넣을 것(i18nJa.test.ts가 빠진 문장을 잡는다).
// 언어를 바꾸면 앱을 다시 불러온다 — 드물게 쓰는 설정이라 화면마다 구독을 다는 것보다 단순하다.

import { JA } from './i18nJa';

export type Lang = 'ko' | 'en' | 'ja';
export type LangPref = 'auto' | Lang;

const KEY = 'hakku_lang_v1';

/** 폰 언어 목록의 첫 번째가 한국어면 한국어, 일본어면 일본어, 그 밖엔 영어 (스페인어 폰에도 한국어보다 영어가 낫다) */
export function resolveLang(pref: LangPref, languages: readonly string[]): Lang {
  if (pref !== 'auto') return pref;
  const first = languages[0]?.toLowerCase() ?? '';
  if (first.startsWith('ko')) return 'ko';
  if (first.startsWith('ja')) return 'ja';
  return 'en';
}

export function loadLangPref(): LangPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'ko' || v === 'en' || v === 'ja' ? v : 'auto';
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

export function L(ko: string, en: string, ja?: string): string {
  const lang = getLang();
  if (lang === 'ko') return ko;
  if (lang === 'ja') return ja ?? JA[ko] ?? en;
  return en;
}
