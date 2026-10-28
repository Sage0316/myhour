import { Capacitor } from '@capacitor/core';
import { INTRO_ELIGIBILITY_STATUS, PURCHASES_ERROR_CODE, Purchases } from '@revenuecat/purchases-capacitor';
import type { CustomerInfo, PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';
import { getInstallationId } from '../llmDirector';
import { consumedTimes } from '../videoEntitlement';
import { decideVideoAccess } from './access';
import type { Plan, Subscription, VideoAccess } from './access';

// 결제 연결 (RevenueCat). 애플 영수증 검증, 갱신일, 무료 체험 자격은 RevenueCat이 관리한다.
// - 앱 사용자 ID는 AI 서버 설치 ID와 같게 둔다 → AI 서버가 같은 ID로 구독을 확인한다.
// - 키가 없거나(계정 연결 전) 웹이면 결제를 쓰지 않는다 → 영상 만들기는 지금처럼 제한 없음.
const REVENUECAT_IOS_KEY = (import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined)?.trim() ?? '';

export const PRODUCT_IDS: Record<Plan, string> = {
  standard: 'com.hakku.app.standard.monthly',
  premium: 'com.hakku.app.premium.monthly',
};

/** 가격을 스토어에서 못 불러왔을 때 보여 줄 값 (App Store Connect에 등록할 가격과 같다) */
export const FALLBACK_PRICES: Record<Plan, string> = { standard: '₩3,300', premium: '₩5,500' };

export function isBillingActive(): boolean {
  return Capacitor.isNativePlatform() && REVENUECAT_IOS_KEY !== '';
}

let configured: Promise<void> | null = null;

function ensureConfigured(): Promise<void> {
  configured ??= Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: getInstallationId() });
  return configured;
}

/** RevenueCat 고객 정보 → 지금 쓰는 구독. Premium이 Standard보다 우선이다 */
export function subscriptionFrom(info: CustomerInfo): Subscription | null {
  for (const plan of ['premium', 'standard'] as const) {
    const entitlement = info.entitlements.active[plan];
    if (!entitlement?.isActive) continue;
    return {
      plan,
      periodStart: entitlement.latestPurchaseDate,
      periodEnd: entitlement.expirationDate,
      isTrial: entitlement.periodType === 'TRIAL',
    };
  }
  return null;
}

export async function getSubscription(): Promise<Subscription | null> {
  if (!isBillingActive()) return null;
  await ensureConfigured();
  const { customerInfo } = await Purchases.getCustomerInfo();
  return subscriptionFrom(customerInfo);
}

/** 영상을 만들 수 있는지. 구독 정보를 못 불러오면(오프라인 등) 막지 않는다 — AI 서버가 최종 확인한다 */
export async function getVideoAccess(): Promise<VideoAccess> {
  if (!isBillingActive()) return decideVideoAccess(false, null, []);
  try {
    return decideVideoAccess(true, await getSubscription(), consumedTimes());
  } catch {
    return { kind: 'unrestricted' };
  }
}

export interface PlanOffer {
  plan: Plan;
  priceString: string;
  /** 이 사람이 3일 무료 체험을 받을 수 있는가 (한 사람당 한 번) */
  trialEligible: boolean;
  product: PurchasesStoreProduct | null;
}

export async function getPlanOffers(): Promise<PlanOffer[]> {
  const plans: Plan[] = ['standard', 'premium'];
  if (!isBillingActive()) {
    return plans.map(plan => ({ plan, priceString: FALLBACK_PRICES[plan], trialEligible: true, product: null }));
  }
  await ensureConfigured();
  const ids = plans.map(plan => PRODUCT_IDS[plan]);
  const [{ products }, eligibility] = await Promise.all([
    Purchases.getProducts({ productIdentifiers: ids }),
    Purchases.checkTrialOrIntroductoryPriceEligibility({ productIdentifiers: ids }),
  ]);
  return plans.map(plan => {
    const product = products.find(p => p.identifier === PRODUCT_IDS[plan]) ?? null;
    return {
      plan,
      priceString: product?.priceString ?? FALLBACK_PRICES[plan],
      trialEligible: eligibility[PRODUCT_IDS[plan]]?.status !== INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE,
      product,
    };
  });
}

function isCancelled(error: unknown): boolean {
  const e = error as { code?: unknown; userCancelled?: unknown } | null;
  return e?.userCancelled === true || String(e?.code) === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

/** 구매가 끝나 구독이 열렸으면 그 구독, 사용자가 취소했으면 null */
export async function purchase(offer: PlanOffer): Promise<Subscription | null> {
  if (!isBillingActive() || !offer.product) throw new Error('지금은 구독할 수 없어요. 잠시 후 다시 시도해 주세요.');
  await ensureConfigured();
  try {
    const { customerInfo } = await Purchases.purchaseStoreProduct({ product: offer.product });
    return subscriptionFrom(customerInfo);
  } catch (error) {
    if (isCancelled(error)) return null;
    throw new Error('결제를 마치지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}

/** 앱을 지웠다 깔았거나 기기를 바꿨을 때 이전 구독을 되찾는다 */
export async function restorePurchases(): Promise<Subscription | null> {
  if (!isBillingActive()) throw new Error('지금은 구매를 복원할 수 없어요.');
  await ensureConfigured();
  const { customerInfo } = await Purchases.restorePurchases();
  return subscriptionFrom(customerInfo);
}

/** 애플 구독 관리 화면 (해지·요금제 변경) */
export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
/** 애플 표준 이용약관 (EULA) */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
/** 개인정보처리방침 — 페이지는 U16에서 만든다 */
export const PRIVACY_URL = 'https://sage0316.github.io/myhour/privacy.html';
