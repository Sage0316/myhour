// 첫 실행 설명서(OnboardingScreen)를 봤는지. 한 번 보면(건너뛰기 포함) 다시 나오지 않는다
const ONBOARDED_KEY = 'hakku_onboarded_v1';

export function isOnboarded(): boolean {
  // 저장소를 못 읽는 환경에서 매번 설명서가 뜨지 않게 본 것으로 친다
  try { return localStorage.getItem(ONBOARDED_KEY) === '1'; } catch { return true; }
}

export function markOnboarded(): void {
  try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch { /* 저장이 막혀도 이번 실행에서는 닫는다 */ }
}
