import { useEffect, useRef, useState } from 'react';
import { useDialogFocus } from '../accessibility/useDialogFocus';
import {
  BUTTON_DISABLED, BUTTON_PRIMARY, CARD, COLOR, FONT_BODY, SCREEN, TAPE_GREEN, TITLE, tape, topPad,
} from '../design';
import { STANDARD_VIDEOS_PER_PERIOD, formatMonthDay } from '../billing/access';
import type { Plan, Subscription } from '../billing/access';
import {
  PRIVACY_URL, TERMS_URL, getPlanOffers, isBillingActive, purchase, redeemOfferCode, restorePurchases, watchSubscription,
} from '../billing/purchases';
import type { PlanOffer } from '../billing/purchases';

interface PaywallScreenProps {
  onClose: () => void;
  onSubscribed: (subscription: Subscription) => void;
  /** Standard 15개를 다 쓴 경우 다음 충전일 (ISO). 있으면 Premium 안내를 먼저 보여 준다 */
  standardResetsAt?: string | null;
}

const PLAN_INFO: Record<Plan, { name: string; summary: string; detail: string }> = {
  standard: { name: 'Standard', summary: `한 달에 영상 ${STANDARD_VIDEOS_PER_PERIOD}개`, detail: '결제일마다 다시 채워져요' },
  premium: { name: 'Premium', summary: '매일 영상 1개', detail: '하루도 빠짐없이 남겨요' },
};

const BENEFITS = [
  'AI 감독이 고른 BGM·자막으로 하루 영상',
  '마음에 안 들면 연출 다시 하기 3번',
  '기록과 아카이브는 구독 없이도 언제나 무료',
];

export default function PaywallScreen({ onClose, onSubscribed, standardResetsAt }: PaywallScreenProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);
  const usedUp = standardResetsAt !== undefined;
  const billing = isBillingActive();
  const [offers, setOffers] = useState<PlanOffer[] | null>(null);
  const [selected, setSelected] = useState<Plan>('premium');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 쿠폰 입력은 애플 창에서 끝나고 결과가 나중에 온다 — 구독이 생기면 바로 닫는다
  const onSubscribedRef = useRef(onSubscribed);
  useEffect(() => { onSubscribedRef.current = onSubscribed; }, [onSubscribed]);
  useEffect(() => watchSubscription(subscription => { if (subscription) onSubscribedRef.current(subscription); }), []);

  useEffect(() => {
    getPlanOffers().then(setOffers).catch(() => setMessage('요금제를 불러오지 못했어요. 잠시 후 다시 열어 주세요.'));
  }, []);

  const offer = offers?.find(o => o.plan === selected) ?? null;
  const trial = offer?.trialEligible ?? true;
  const canBuy = billing && offer?.product != null && !busy;

  async function handlePurchase() {
    if (!offer || !canBuy) return;
    setBusy(true);
    setMessage(null);
    try {
      const subscription = await purchase(offer);
      if (subscription) onSubscribed(subscription);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '결제를 마치지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const subscription = await restorePurchases();
      if (subscription) onSubscribed(subscription);
      else setMessage('복원할 구독이 없어요.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '구매를 복원하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRedeem() {
    setMessage(null);
    try {
      await redeemOfferCode();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '쿠폰 입력 창을 열지 못했어요.');
    }
  }

  const ctaLabel = busy ? '처리 중…' : trial ? '3일 무료로 시작하기' : `${offer?.priceString ?? ''} 구독하기`;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="하꾸 구독"
      style={{ ...SCREEN, position: 'fixed', inset: 0, zIndex: 100 }}
    >
      <div style={{ padding: `${topPad(52)} 22px 0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={TAPE_GREEN()}>하꾸 구독</span>
        <button onClick={onClose} aria-label="구독 화면 닫기" style={{ width: 44, height: 44, marginRight: -10, background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLOR.ink} strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ ...TITLE, whiteSpace: 'pre-line' }}>{usedUp ? '이번 달 영상을\n다 만들었어요' : '오늘 하루를\n영상으로 남겨요'}</h1>
          <p style={{ margin: 0, fontSize: 14, color: COLOR.inkMuted, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {usedUp
              ? `Standard ${STANDARD_VIDEOS_PER_PERIOD}개를 모두 썼어요.${standardResetsAt ? ` ${formatMonthDay(standardResetsAt)}에 다시 채워져요.` : ''}\nPremium으로 바꾸면 매일 만들 수 있어요.`
              : '기록은 지금처럼 자유롭게 남기고,\n하루 마감 영상은 구독으로 만들어요.'}
          </p>
        </div>

        {!usedUp && (
          <ul style={{ ...CARD, margin: 0, padding: '14px 16px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BENEFITS.map(text => (
              <li key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, lineHeight: 1.45 }}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLOR.red} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        )}

        <div role="radiogroup" aria-label="요금제" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(['premium', 'standard'] as const).map(plan => {
            const info = PLAN_INFO[plan];
            const active = selected === plan;
            const price = offers?.find(o => o.plan === plan)?.priceString ?? '';
            return (
              <button
                key={plan}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(plan)}
                style={{
                  ...CARD, position: 'relative', width: '100%', minHeight: 78, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', fontFamily: FONT_BODY, color: COLOR.ink,
                  background: active ? '#FFF6C9' : COLOR.white,
                  // 테두리 두께를 바꾸면 안쪽 글자가 1px 밀린다 — 선택 표시는 안쪽 그림자로 한다
                  boxShadow: active ? `inset 0 0 0 1.5px ${COLOR.ink}` : 'none',
                  boxSizing: 'border-box',
                }}
              >
                {plan === 'premium' && (
                  <span aria-hidden="true" style={{ ...tape(COLOR.red, COLOR.white, 4, 14), position: 'absolute', top: -11, right: 14 }}>추천</span>
                )}
                <span aria-hidden="true" style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 11, border: `2px solid ${COLOR.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                  {active && <span style={{ width: 10, height: 10, borderRadius: 5, background: COLOR.ink }} />}
                </span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{info.name}</span>
                  <span style={{ fontSize: 14, color: COLOR.ink }}>{info.summary}</span>
                  <span style={{ fontSize: 12, color: COLOR.inkMuted }}>{info.detail}</span>
                </span>
                <span style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>{price}</span>
                  <span style={{ display: 'block', fontSize: 11, color: COLOR.inkMuted }}>한 달</span>
                </span>
              </button>
            );
          })}
        </div>

        {message && <div role="alert" style={{ fontSize: 13, color: COLOR.red, lineHeight: 1.5 }}>{message}</div>}
      </div>

      <div style={{ padding: '12px 22px calc(var(--bottom-inset, 14px) + 4px)', display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1.5px dashed ${COLOR.dash}`, background: COLOR.paper }}>
        <button type="button" onClick={handlePurchase} disabled={!canBuy} style={canBuy ? BUTTON_PRIMARY : { ...BUTTON_PRIMARY, ...BUTTON_DISABLED }}>
          {billing ? ctaLabel : '앱에서 구독할 수 있어요'}
        </button>
        <p style={{ margin: 0, fontSize: 11, color: COLOR.inkMuted, lineHeight: 1.55, textAlign: 'center' }}>
          {trial
            ? `3일 무료 체험이 끝나면 ${PLAN_INFO[selected].name} ${offer?.priceString ?? ''}가 매달 자동 결제돼요. 체험이 끝나기 24시간 전까지 해지하면 결제되지 않아요.`
            : `${PLAN_INFO[selected].name} ${offer?.priceString ?? ''}가 매달 자동 결제돼요. 다음 결제일 24시간 전까지 해지하지 않으면 자동으로 갱신돼요.`}
          {' '}해지는 아이폰 설정 &gt; Apple 계정 &gt; 구독에서 할 수 있어요.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12 }}>
          <button type="button" onClick={handleRestore} disabled={!billing || busy} style={{ background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT_BODY, color: COLOR.inkSub, fontSize: 12, minHeight: 32 }}>구매 복원</button>
          <button type="button" onClick={handleRedeem} disabled={!billing} style={{ background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT_BODY, color: COLOR.inkSub, fontSize: 12, minHeight: 32 }}>쿠폰 입력</button>
          <a href={TERMS_URL} target="_blank" rel="noreferrer" style={{ color: COLOR.inkSub, minHeight: 32, display: 'flex', alignItems: 'center' }}>이용약관</a>
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer" style={{ color: COLOR.inkSub, minHeight: 32, display: 'flex', alignItems: 'center' }}>개인정보처리방침</a>
        </div>
      </div>
    </div>
  );
}
