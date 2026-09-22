// 관리자(테스트) 모드.
//
// 예전엔 설정 화면의 `useState`에만 있어서 탭을 옮기거나 모달을 열면 화면이 언마운트되면서
// 그대로 꺼졌다. 그래서 "일곱 번 두드려 켰는데 바로 풀린다"는 증상이 났다.
// 화면 바깥(localStorage)에 두고 구독으로 알리면 앱을 다시 열어도 유지된다.
//
// 켜져 있는 동안은 "하루에 영상 하나" 이용권과 마감 잠금을 건너뛴다.
// **실제 과금을 붙일 때는 이 우회가 서버 판정으로 대체되거나 사라져야 한다.**
import { useSyncExternalStore } from 'react';

const KEY = 'hakku_dev_mode_v1';

// localStorage 접근이 막힌 환경(사파리 프라이빗 등)에서도 세션 동안은 동작하도록 메모리에 캐시한다.
// useSyncExternalStore는 getSnapshot이 매번 같은 값을 돌려주길 요구하므로 캐시가 필수다.
let cached: boolean | null = null;
const listeners = new Set<() => void>();

export function isDevMode(): boolean {
  if (cached === null) {
    try {
      cached = localStorage.getItem(KEY) === 'on';
    } catch {
      cached = false;
    }
  }
  return cached;
}

export function setDevMode(on: boolean): void {
  cached = on;
  try {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {
    /* 저장에 실패해도 이번 세션 동안은 메모리 값으로 동작한다 */
  }
  listeners.forEach(notify => notify());
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => { listeners.delete(notify); };
}

/** 관리자 모드가 켜지고 꺼질 때 다시 그려지는 훅 */
export function useDevMode(): boolean {
  return useSyncExternalStore(subscribe, isDevMode, () => false);
}
