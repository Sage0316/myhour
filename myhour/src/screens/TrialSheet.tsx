import { useEffect, useRef, useState } from 'react';
import { useDialogFocus } from '../accessibility/useDialogFocus';
import { STANDARD_VIDEOS_PER_PERIOD } from '../billing/access';
import type { Plan } from '../billing/access';
import { PRIVACY_URL, TERMS_URL, getPlanOffers, getSubscription, isBillingActive, purchase } from '../billing/purchases';
import type { PlanOffer } from '../billing/purchases';
import Doodle from '../components/Doodle';
import { BUTTON_DISABLED, BUTTON_PRIMARY, COLOR, FONT_BODY, FONT_HAND, TAPE_GREEN, tape } from '../design';
import { L } from '../i18n';

// 설명서를 다 본 직후 아래에서 올라오는 3일 무료 체험 안내 (2026-10-29, 펌킨이 시안 A로 고름).
// 홈을 어둡게 덮고, 요금제를 여기서 바로 골라 애플 결제 창까지 한 번에 간다.
// 기록은 무료라 '나중에 할게요'로 언제든 닫을 수 있어야 하고, 체험 뒤 가격은 애플 심사 때문에 꼭 보여야 한다.

const PLANS: { plan: Plan; name: string; summary: string }[] = [
  { plan: 'standard', name: 'Standard', summary: L(`한 달에 영상 ${STANDARD_VIDEOS_PER_PERIOD}개`, `${STANDARD_VIDEOS_PER_PERIOD} films a month`) },
  { plan: 'premium', name: 'Premium', summary: L('매일 영상 1개', 'A film every day') },
];

const CLOSE_MS = 260;

interface TrialSheetProps {
  onClose: () => void;
  /** 설정의 테스트 도구에서 여는 미리보기 — 구독·체험 자격과 상관없이 보여 주고 결제는 하지 않는다 */
  preview?: boolean;
}

export default function TrialSheet({ onClose, preview = false }: TrialSheetProps) {
  const [offers, setOffers] = useState<PlanOffer[] | null>(null);
  const [selected, setSelected] = useState<Plan>('premium');
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>(offers !== null, close);
  // 부모가 매번 새 함수를 넘겨도 구독 확인을 다시 하지 않게 ref로 잡아 둔다
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // 이미 구독 중이거나 체험을 써버린 사람에겐 띄우지 않는다 (불러오는 동안은 아무것도 그리지 않아 깜빡이지 않는다)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getPlanOffers();
        if (!preview && (await getSubscription() || !list.some(o => o.trialEligible))) { onCloseRef.current(); return; }
        if (alive) setOffers(list);
      } catch {
        if (!preview) onCloseRef.current();
      }
    })();
    return () => { alive = false; };
  }, [preview]);

  function close() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => onCloseRef.current(), CLOSE_MS);
  }

  if (!offers) return null;
  const offer = offers.find(o => o.plan === selected) ?? null;
  const planName = PLANS.find(p => p.plan === selected)!.name;
  const canBuy = !preview && isBillingActive() && offer?.product != null && !busy;

  async function start() {
    if (preview) { setMessage(L('미리보기라 결제는 하지 않아요', 'Preview only — no purchase')); return; }
    if (!offer || !canBuy) return;
    setBusy(true);
    setMessage(null);
    try {
      const subscription = await purchase(offer);
      if (subscription) close();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : L('결제를 마치지 못했어요.', "Couldn't complete the purchase."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div className={closing ? 'sheet-dim sheet-dim-out' : 'sheet-dim'} onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(20,16,12,0.45)' }} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={L('3일 무료 체험', '3-day free trial')}
        className={closing ? 'sheet-up sheet-down' : 'sheet-up'}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: COLOR.paper, borderTop: `2px solid ${COLOR.ink}`, borderRadius: '26px 26px 0 0',
          padding: '10px 22px calc(var(--bottom-inset, 14px) + 8px)', boxShadow: '0 -6px 20px rgba(0,0,0,0.15)',
          fontFamily: FONT_BODY, color: COLOR.ink, outline: 'none',
        }}
      >
        <div aria-hidden="true" style={{ width: 44, height: 5, borderRadius: 3, background: 'rgba(43,38,34,0.2)', margin: '0 auto 14px' }} />

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ ...TAPE_GREEN(), alignSelf: 'center', fontSize: 16, padding: '3px 12px' }}>{L('3일 무료 체험', '3-day free trial')}</span>
          <h2 style={{ margin: '12px 0 0', fontFamily: FONT_HAND, fontWeight: 400, fontSize: 28, lineHeight: 1.3, textAlign: 'center' }}>
            {L('3일 동안 영상까지', 'Make your daily films')}<br />{L('무료로 만들어봐요', 'free for 3 days')}
          </h2>
          <Doodle kind="star" size={30} style={{ left: 10, top: 30, transform: 'rotate(-12deg)' }} />
          <Doodle kind="pinkStar" size={20} style={{ right: 20, top: 6, transform: 'rotate(14deg)' }} />
        </div>

        <div role="radiogroup" aria-label={L('요금제', 'Plan')} style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {PLANS.map(({ plan, name, summary }) => {
            const active = selected === plan;
            const price = offers.find(o => o.plan === plan)?.priceString ?? '';
            return (
              <button
                key={plan}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(plan)}
                style={{
                  flex: 1, position: 'relative', padding: '12px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                  fontFamily: FONT_BODY, color: COLOR.ink, boxSizing: 'border-box',
                  background: active ? '#FFF6C9' : COLOR.white,
                  // 테두리 두께를 바꾸면 안쪽 글자가 밀린다 — 선택 표시는 안쪽 그림자로 한다 (결제 화면과 같은 방식)
                  border: `1.5px solid ${active ? COLOR.ink : 'rgba(43,38,34,0.25)'}`,
                  boxShadow: active ? `inset 0 0 0 1px ${COLOR.ink}` : 'none',
                }}
              >
                {plan === 'premium' && (
                  <span aria-hidden="true" style={{ ...tape(COLOR.red, COLOR.white, 3, 12), position: 'absolute', right: -6, top: -12, padding: '1px 8px' }}>{L('추천', 'Best')}</span>
                )}
                <span style={{ display: 'block', fontWeight: 700, fontSize: 15 }}>{name}</span>
                <span style={{ display: 'block', fontSize: 13, color: COLOR.inkSub, marginTop: 2 }}>{summary}</span>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 16, marginTop: 6 }}>
                  {price}<span style={{ fontWeight: 400, fontSize: 12, color: COLOR.inkMuted }}> {L('/월', '/mo')}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={start} disabled={busy} style={{ ...BUTTON_PRIMARY, width: '100%', marginTop: 16, ...(canBuy || preview ? {} : BUTTON_DISABLED) }}>
          {busy ? L('처리 중…', 'Working…') : L('3일 무료로 시작하기', 'Start 3 days free')}
        </button>
        {message && <div role="alert" style={{ fontSize: 13, color: COLOR.red, textAlign: 'center', marginTop: 8 }}>{message}</div>}
        <p style={{ margin: '10px 0 0', fontSize: 11.5, color: COLOR.inkMuted, lineHeight: 1.5, textAlign: 'center' }}>
          {L(
            `3일 뒤 ${planName} 월 ${offer?.priceString ?? ''} 자동 결제 · 체험이 끝나기 24시간 전까지 해지하면 결제되지 않아요`,
            `${planName} renews at ${offer?.priceString ?? ''}/month after 3 days · Cancel at least 24 hours before the trial ends and you won't be charged`,
          )}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 4, fontSize: 11.5 }}>
          <a href={TERMS_URL} target="_blank" rel="noreferrer" style={{ color: COLOR.inkMuted, minHeight: 28, display: 'flex', alignItems: 'center' }}>{L('이용약관', 'Terms')}</a>
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer" style={{ color: COLOR.inkMuted, minHeight: 28, display: 'flex', alignItems: 'center' }}>{L('개인정보처리방침', 'Privacy')}</a>
        </div>
        <button type="button" onClick={close} style={{ display: 'block', margin: '2px auto 0', minHeight: 44, padding: '0 16px', background: 'none', border: 'none', fontSize: 14, color: COLOR.inkSub, fontFamily: FONT_BODY, cursor: 'pointer' }}>
          {L('나중에 할게요', 'Maybe later')}
        </button>
      </div>
    </div>
  );
}
