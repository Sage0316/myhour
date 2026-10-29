import { useRef, useState } from 'react';
import { useApp } from '../appContext';
import Doodle from '../components/Doodle';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, COLOR, FONT_HAND, SCREEN, tape, topPad } from '../design';
import { L } from '../i18n';
import { enableReminders, isNativeApp } from '../notifications/localReminders';
import { enablePush, isPushSupported, PUSH_SERVER_URL } from '../push';
import { markOnboarded } from '../onboarding';
import { getSessionDate } from '../store';

// 처음 켰을 때 한 번 보여주는 설명서 네 장 (2026-10-29, 펌킨이 시안에서 고름).
// 옆으로 넘기거나 '다음'을 누른다. 버튼은 같은 자리에서 마지막 장에만 '알림 켜고 시작하기'로 바뀐다 — 버튼이 사라졌다 생기면 화면이 흔들려 보인다.

const CARD_ART: React.CSSProperties = { background: COLOR.white, border: `2px solid ${COLOR.ink}`, borderRadius: 16 };

function NotificationArt() {
  return (
    <>
      <div style={{ ...CARD_ART, position: 'absolute', left: 20, top: 30, width: 220, padding: '12px 14px', boxSizing: 'border-box', boxShadow: '3px 4px 0 rgba(43,38,34,.15)', transform: 'rotate(-3deg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: COLOR.inkMuted }}>
          <span style={{ width: 18, height: 18, borderRadius: 5, background: COLOR.sky }} />
          {L('하꾸 · 지금', 'MyHour · now')}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{L('15:00 기록할 시간이에요', "It's 15:00 — time to record")}</div>
        <div style={{ fontSize: 13, color: COLOR.inkSub, marginTop: 2 }}>{L('지금 이 순간, 뭐 하고 있어요?', 'What are you up to right now?')}</div>
      </div>
      <span style={{ ...tape(COLOR.sky, COLOR.skyInk, 4, 20), position: 'absolute', left: 70, top: 132, padding: '3px 12px' }}>15:00 · 16:00 · 17:00</span>
      <Doodle kind="star" size={38} style={{ right: 4, top: 0, transform: 'rotate(14deg)' }} />
      <Doodle kind="heart" size={26} style={{ left: 6, top: 150, transform: 'rotate(-10deg)' }} />
    </>
  );
}

function RecordTypesArt() {
  const types = [
    { label: L('사진', 'Photo'), bg: '#CDEBDD', tilt: -3, emoji: '📷' },
    { label: L('영상', 'Video'), bg: '#F4C9B8', tilt: 2, emoji: '🎬' },
    { label: L('음성', 'Voice'), bg: '#E4DBF5', tilt: 2.5, emoji: '🎙️' },
    { label: L('글', 'Text'), bg: '#F4ECD9', tilt: -2, emoji: '✏️' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '16px 20px', boxSizing: 'border-box' }}>
      {types.map(t => (
        <div key={t.label} style={{ ...CARD_ART, background: t.bg, transform: `rotate(${t.tilt}deg)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, boxShadow: '2px 3px 0 rgba(43,38,34,.12)' }}>
          <span style={{ fontSize: 28 }}>{t.emoji}</span>
          <span style={{ fontFamily: FONT_HAND, fontSize: 19 }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function VideoArt() {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ position: 'absolute', left: 18 + i * 26, top: 40 + i * 8, width: 70, height: 84, background: COLOR.white, padding: '5px 5px 16px', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(43,38,34,.2)', transform: `rotate(${[-8, 2, 9][i]}deg)` }}>
          <div style={{ width: '100%', height: '100%', background: ['#CDEBDD', '#F4C9B8', '#E4DBF5'][i] }} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: 142, top: 86, fontSize: 26 }}>→</div>
      <div style={{ position: 'absolute', right: 16, top: 14, width: 84, height: 150, border: `2px solid ${COLOR.ink}`, borderRadius: 12, background: 'repeating-linear-gradient(0deg, #C93A2E 0 8px, #E8857B 8px 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#FFF8EC', border: `1.5px solid ${COLOR.ink}`, borderRadius: 40, padding: 8, fontFamily: FONT_HAND, fontSize: 12, textAlign: 'center', lineHeight: 1.3 }}>
          {L('커피 두 잔의 날', 'Two-coffee day')}<br /><span style={{ fontSize: 9 }}>{L('10월 29일', 'Oct 29')}</span>
        </div>
      </div>
      <span style={{ ...tape(COLOR.yellow, '#5A4710', -3, 15), position: 'absolute', right: 20, top: 172, padding: '3px 12px' }}>▶ {L('오늘의 영상', "Today's film")}</span>
    </>
  );
}

function ShareArt() {
  const covers = [
    { left: 30, top: 22, tilt: -5, bg: 'radial-gradient(#fff 1.2px, transparent 1.5px) 0 0 / 10px 10px, #1F3A6B' },
    { left: 98, top: 10, tilt: 1, bg: 'repeating-linear-gradient(90deg, rgba(255,255,255,.45) 0 6px, transparent 6px 12px), #C93A2E' },
    { left: 166, top: 24, tilt: 6, bg: 'repeating-linear-gradient(0deg, rgba(255,255,255,.4) 0 6px, transparent 6px 12px), #B7A6E0' },
  ];
  const sns = [
    { label: L('릴스', 'Reels'), bg: '#F9D3D3', ink: '#7A2E2E', tilt: -3 },
    { label: L('스레드', 'Threads'), bg: COLOR.beige, ink: COLOR.ink, tilt: 2 },
    { label: 'X', bg: COLOR.sky, ink: COLOR.skyInk, tilt: -1.5 },
  ];
  return (
    <>
      {covers.map(c => (
        <div key={c.left} style={{ position: 'absolute', left: c.left, top: c.top, width: 62, height: 110, border: `2px solid ${COLOR.ink}`, borderRadius: 10, background: c.bg, transform: `rotate(${c.tilt}deg)` }} />
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 146, display: 'flex', justifyContent: 'center', gap: 8 }}>
        {sns.map(s => <span key={s.label} style={{ ...tape(s.bg, s.ink, s.tilt, 17), alignSelf: 'auto', padding: '3px 12px' }}>{s.label}</span>)}
      </div>
      <div style={{ position: 'absolute', right: 2, top: 96, width: 40, height: 40, borderRadius: '50%', background: COLOR.red, border: `2px solid ${COLOR.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
      </div>
      <Doodle kind="star" size={30} style={{ left: 2, top: 4, transform: 'rotate(-12deg)' }} />
    </>
  );
}

const PAGES = [
  { tag: [COLOR.green, COLOR.greenInk], title: [L('알림이 오면', 'When it pings,'), L('딱 한 순간만', 'catch one moment')], body: [L('정해둔 시간마다 알림이 와요.', "You'll get a reminder at the times you set."), L('사진 한 장, 글 한 줄이면 충분해요.', 'One photo or one line is enough.')], Art: NotificationArt },
  { tag: [COLOR.yellow, '#5A4710'], title: [L('편한 걸로', 'Save it'), L('남겨요', 'your way')], body: [L('사진·영상·음성·글 중에 골라요.', 'Photo, video, voice or text.'), L('영상과 음성은 앞 5초가 영상에 담겨요.', 'Videos and voice keep their first 5 seconds.')], Art: RecordTypesArt },
  { tag: ['#F9D3D3', '#7A2E2E'], title: [L('밤에 마감하면', 'Wrap up at night,'), L('영상 하나로', 'get one film')], body: [L('하루 기분을 고르면 AI가 제목과 자막을 붙여', 'Pick your mood and AI adds a title and captions,'), L('오늘을 짧은 영상으로 만들어줘요.', 'turning your day into a short film.')], Art: VideoArt },
  { tag: [COLOR.sky, COLOR.skyInk], title: [L('내 하루를', 'Share your day'), L('SNS에 공유해보세요', 'on social')], body: [L('만든 영상은 아카이브에 쌓이고,', 'Your films pile up in the archive,'), L('릴스·스레드·X에 바로 올릴 수 있어요.', 'ready to post to Reels, Threads or X.')], Art: ShareArt },
] as const;

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { settings, isWrapped } = useApp();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const last = page === PAGES.length - 1;
  const native = isNativeApp();
  const canNotify = native || (PUSH_SERVER_URL !== '' && isPushSupported());

  function finish() {
    markOnboarded();
    onDone();
  }

  function goTo(i: number) {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  async function start() {
    if (busy) return;
    setBusy(true);
    // 알림을 못 켜도(거절·미지원) 시작은 막지 않는다 — 설정에서 다시 켤 수 있다
    if (canNotify) {
      const sessionDate = getSessionDate(settings.startTime);
      await (native ? enableReminders(settings, sessionDate, isWrapped ? sessionDate : null) : enablePush(settings)).catch(() => undefined);
    }
    finish();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={L('하꾸 사용 설명서', 'How MyHour works')} style={{ ...SCREEN, position: 'relative' }}>
      {/* 마지막 장에서도 자리는 남겨둬서 위쪽이 흔들리지 않게 한다 */}
      <div style={{ padding: `${topPad(40)} 16px 0`, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={finish}
          style={{ minHeight: 44, padding: '0 8px', background: 'none', border: 'none', fontSize: 14, color: COLOR.inkMuted, fontFamily: 'inherit', cursor: 'pointer', visibility: last ? 'hidden' : 'visible' }}
        >
          {L('건너뛰기', 'Skip')}
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar"
        onScroll={e => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / el.clientWidth));
        }}
        style={{ flex: 1, minHeight: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory' }}
      >
        {PAGES.map(({ tag, title, body, Art }, i) => (
          <section key={i} aria-label={`${i + 1} / ${PAGES.length}`} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 28px 0', boxSizing: 'border-box', overflow: 'hidden' }}>
            <span style={{ ...tape(tag[0], tag[1], -2, 15), alignSelf: 'center', padding: '3px 12px' }}>{i + 1} / {PAGES.length}</span>
            <div aria-hidden="true" style={{ position: 'relative', width: 260, height: 200, marginTop: 32, flexShrink: 0 }}>
              <Art />
            </div>
            <h2 style={{ margin: '36px 0 0', fontFamily: FONT_HAND, fontWeight: 400, fontSize: 34, lineHeight: 1.25, textAlign: 'center' }}>
              {title[0]}<br />{title[1]}
            </h2>
            <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.6, color: COLOR.inkSub, textAlign: 'center', wordBreak: 'keep-all' }}>
              {body[0]}<br />{body[1]}
            </p>
          </section>
        ))}
      </div>

      <div style={{ padding: '12px 22px calc(var(--bottom-inset, 14px) + 8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div aria-hidden="true" style={{ display: 'flex', gap: 8 }}>
          {PAGES.map((_, j) => (
            <span key={j} style={{ width: j === page ? 22 : 8, height: 8, borderRadius: 4, background: j === page ? COLOR.ink : 'rgba(43,38,34,.2)', transition: 'width .2s ease' }} />
          ))}
        </div>
        {last ? (
          <button type="button" onClick={start} disabled={busy} style={{ ...BUTTON_PRIMARY, width: '100%' }}>
            {canNotify ? L('알림 켜고 시작하기', 'Turn on reminders & start') : L('시작하기', 'Start')}
          </button>
        ) : (
          <button type="button" onClick={() => goTo(page + 1)} style={{ ...BUTTON_SECONDARY, width: '100%' }}>
            {L('다음', 'Next')}
          </button>
        )}
      </div>
    </div>
  );
}
