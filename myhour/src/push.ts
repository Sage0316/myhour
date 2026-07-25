import type { AppSettings } from './store';

export const PUSH_SERVER_URL = (import.meta.env.VITE_PUSH_SERVER_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? '';
const INSTALL_ID_KEY = 'hakku_push_installation_v1';
const TOKEN_KEY = 'hakku_push_token_v1';

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

function installationId(): string {
  const existing = localStorage.getItem(INSTALL_ID_KEY);
  if (existing) return existing;
  const value = crypto.randomUUID();
  localStorage.setItem(INSTALL_ID_KEY, value);
  return value;
}

async function bearerToken(): Promise<string> {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const response = await fetch(`${PUSH_SERVER_URL}/v1/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ installationId: installationId() }),
  });
  const body = await response.json().catch(() => ({})) as { token?: string; error?: string };
  if (!response.ok || !body.token) throw new Error(body.error ?? '알림 서버 연결에 실패했어요.');
  localStorage.setItem(TOKEN_KEY, body.token);
  return body.token;
}

async function authenticatedPost(path: string, body: unknown): Promise<void> {
  const token = await bearerToken();
  const response = await fetch(`${PUSH_SERVER_URL}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? '알림 서버 요청에 실패했어요.');
}

export function isPushSupported(): boolean {
  return PUSH_SERVER_URL.length > 0
    && VAPID_PUBLIC_KEY.length > 0
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export async function getPushEnabled(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  return Boolean(await registration.pushManager.getSubscription());
}

export async function syncPushSchedule(settings: AppSettings): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await authenticatedPost('/v1/subscriptions', {
    subscription: subscription.toJSON(),
    interval: settings.interval,
    startTime: settings.startTime,
    endTime: settings.endMode === 'fixed' ? settings.endTime : '22:00',
    tzOffsetMin: new Date().getTimezoneOffset(),
  });
}

export async function enablePush(settings: AppSettings): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('이 기기에서는 알림을 사용할 수 없어요. iOS는 16.4 이상에서 홈 화면에 설치해야 해요.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('알림 권한이 허용되지 않았어요.');
  const registration = await navigator.serviceWorker.ready;
  if (!await registration.pushManager.getSubscription()) {
    await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }
  await syncPushSchedule(settings);
}

export async function disablePush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await authenticatedPost('/v1/subscriptions/delete', { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}
