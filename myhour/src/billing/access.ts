// 영상 이용권 판정. 순수 함수라 결제 연결 없이 테스트한다.
//
// 상품 (2026-10-28 펌킨 결정)
// - Standard 월 3,300원: 한 결제 기간에 영상 15개 (결제일마다 다시 채움)
// - Premium 월 5,500원: 매일 영상 1개
// - 둘 다 3일 무료 체험. 구독이 없으면 기록·아카이브는 그대로, 영상 만들기만 잠긴다.
// - 날짜당 영상 1개 규칙은 요금제와 상관없이 원장(videoEntitlement)이 따로 지킨다.
export type Plan = 'standard' | 'premium';

export const STANDARD_VIDEOS_PER_PERIOD = 15;

export interface Subscription {
  plan: Plan;
  /** 지금 결제 기간이 시작된 시각 (첫 결제·갱신·체험 시작) */
  periodStart: string;
  /** 지금 결제 기간이 끝나는 시각 = 다음 결제일 */
  periodEnd: string | null;
  isTrial: boolean;
}

export type VideoAccess =
  /** 결제를 쓰지 않는 환경(웹·키 없음): 지금처럼 제한 없음 */
  | { kind: 'unrestricted' }
  | { kind: 'allowed'; plan: Plan; remaining: number | null }
  | { kind: 'subscribe' }
  | { kind: 'standard_used_up'; resetsAt: string | null };

/** 이번 결제 기간에 만든 영상 개수. consumedAt은 영상을 만든 시각들(ISO) */
export function videosInPeriod(subscription: Subscription, consumedAt: string[]): number {
  const start = Date.parse(subscription.periodStart);
  const end = subscription.periodEnd ? Date.parse(subscription.periodEnd) : Infinity;
  return consumedAt.filter(at => {
    const t = Date.parse(at);
    return t >= start && t < end;
  }).length;
}

export function decideVideoAccess(
  billingActive: boolean,
  subscription: Subscription | null,
  consumedAt: string[],
): VideoAccess {
  if (!billingActive) return { kind: 'unrestricted' };
  if (!subscription) return { kind: 'subscribe' };
  if (subscription.plan === 'premium') return { kind: 'allowed', plan: 'premium', remaining: null };
  const remaining = Math.max(0, STANDARD_VIDEOS_PER_PERIOD - videosInPeriod(subscription, consumedAt));
  return remaining > 0
    ? { kind: 'allowed', plan: 'standard', remaining }
    : { kind: 'standard_used_up', resetsAt: subscription.periodEnd };
}

/** 영상을 만들 수 있는가 */
export function canMakeVideo(access: VideoAccess): boolean {
  return access.kind === 'unrestricted' || access.kind === 'allowed';
}

/** 다음 충전일·결제일 표시용: '11월 28일' */
export function formatMonthDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
