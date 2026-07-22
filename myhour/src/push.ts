// 푸시 알림 구독 관리 — Cloudflare Worker(push-server/)와 짝을 이룬다.
// iOS 16.4+ 홈 화면 PWA에서만 동작. PUSH_SERVER_URL이 비어있으면 기능이 비활성 상태로 표시된다.
import type { AppSettings } from './store';

// 워커 배포 후 여기에 URL을 넣으면 설정 화면의 알림 섹션이 활성화된다.
export const PUSH_SERVER_URL: string = 'https://myhour-push.sage0316.workers.dev';

const VAPID_PUBLIC_KEY = 'BHkes45_SwI_Bp-hKFFAPy1pAKx_2NjCXpQjucklSjNwrEEm--ZhR4cMdb1ULOBLLLeUygBp6wR5uU0VFJlf5Ys';

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushEnabled(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

export async function enablePush(settings: AppSettings): Promise<void> {
  if (!isPushSupported()) throw new Error('이 기기는 푸시 알림을 지원하지 않아요.\n(iOS 16.4 이상 + 홈 화면 설치 필요)');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('알림 권한이 거부됐어요.\n설정 > 하꾸 > 알림에서 허용해주세요.');

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });

  const res = await fetch(`${PUSH_SERVER_URL}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      interval: settings.interval,
      startTime: settings.startTime,
      endTime: settings.endMode === 'fixed' ? settings.endTime : '22:00',
      tzOffsetMin: new Date().getTimezoneOffset(),
    }),
  });
  if (!res.ok) throw new Error('알림 서버 등록에 실패했어요. 잠시 후 다시 시도해주세요.');

  // 연결 확인용 즉시 테스트 푸시 (실패해도 구독 자체는 유효)
  fetch(`${PUSH_SERVER_URL}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  fetch(`${PUSH_SERVER_URL}/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe();
}
