import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { AppSettings } from '../store';
import { planReminders } from './reminderPlan';
import { L } from '../i18n';

// iOS 앱에서만 쓰는 기록 시간 알림. 웹 버전은 기존 웹 푸시(push.ts)를 그대로 쓴다.
const ENABLED_KEY = 'hakku_local_reminders_v1';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

function readEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) === '1'; } catch { return false; }
}

function writeEnabled(on: boolean): void {
  try { localStorage.setItem(ENABLED_KEY, on ? '1' : '0'); } catch { /* 저장 실패해도 예약 상태가 기준 */ }
}

export async function getRemindersEnabled(): Promise<boolean> {
  if (!isNativeApp() || !readEnabled()) return false;
  const { display } = await LocalNotifications.checkPermissions();
  return display === 'granted';
}

async function cancelAll(): Promise<void> {
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: notifications.map(n => ({ id: n.id })) });
  }
}

/**
 * 예약을 지우고 앞으로 며칠분을 다시 건다. 설정이 바뀌거나, 하루를 마감하거나, 앱이 다시 열릴 때 부른다.
 * 알림을 켜지 않았으면 아무것도 하지 않는다.
 */
export async function syncReminders(settings: AppSettings, sessionDate: string, wrappedSessionDate: string | null): Promise<void> {
  if (!await getRemindersEnabled()) return;
  await cancelAll();
  const plan = planReminders(settings, new Date(), sessionDate, wrappedSessionDate);
  if (plan.length === 0) return;
  await LocalNotifications.schedule({
    notifications: plan.map(reminder => ({
      id: reminder.id,
      title: reminder.title,
      body: reminder.body,
      schedule: { at: reminder.at, allowWhileIdle: true },
    })),
  });
}

export async function enableReminders(settings: AppSettings, sessionDate: string, wrappedSessionDate: string | null): Promise<void> {
  const { display } = await LocalNotifications.requestPermissions();
  if (display !== 'granted') {
    throw new Error(L('알림이 꺼져 있어요. 아이폰 설정 > 하꾸 > 알림에서 켜 주세요.', 'Notifications are off. Turn them on in iPhone Settings > MyHour > Notifications.'));
  }
  writeEnabled(true);
  await syncReminders(settings, sessionDate, wrappedSessionDate);
}

export async function disableReminders(): Promise<void> {
  writeEnabled(false);
  await cancelAll();
}
