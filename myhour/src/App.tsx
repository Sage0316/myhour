import { useState, useEffect } from 'react';
import IOSFrame from './components/IOSFrame';
import HomeScreen from './screens/HomeScreen';
import TodayScreen from './screens/TodayScreen';
import RecordScreen from './screens/RecordScreen';
import ArchiveScreen from './screens/ArchiveScreen';
import type { ArchiveEntry } from './store';
import SettingsScreen from './screens/SettingsScreen';
import WrapUpScreen from './screens/WrapUpScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { isOnboarded } from './onboarding';
import TrialSheet from './screens/TrialSheet';
import { isBillingActive } from './billing/purchases';
import { AppProvider } from './context';
import { useApp } from './appContext';
import { getSessionDate } from './store';
import { isNativeApp, syncReminders } from './notifications/localReminders';
import './App.css';

type Tab = 'home' | 'today' | 'archive' | 'settings';
type ModalScreen = 'record' | 'wrapup' | null;

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11, letterSpacing: '1.4px', textTransform: 'uppercase',
  color: 'rgba(26,26,26,0.5)',
};

function FrameWrapper({ label, children, dark }: { label: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={LABEL_STYLE}>{label}</div>
      <IOSFrame dark={dark}>{children}</IOSFrame>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [modal, setModal] = useState<ModalScreen>(null);
  const [restoreFocusTo, setRestoreFocusTo] = useState<Exclude<ModalScreen, null> | null>(null);
  // 아카이브 항목으로 영상을 만드는 중이면 그 항목. 마감 화면이 이 항목 모드로 열린다.
  const [videoEntry, setVideoEntry] = useState<ArchiveEntry | null>(null);
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(() => {
    const match = window.location.hash.match(/^#archive=(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const { addRecord, reset, settings, isWrapped } = useApp();
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboarded());
  // 설명서를 막 다 본 순간 무료 체험을 아래에서 올려 보여 준다 (결제가 되는 앱에서만)
  const [showTrial, setShowTrial] = useState(false);

  // iOS 앱: 예약 알림은 며칠분만 걸려 있으므로 설정이 바뀌거나, 하루를 마감하거나,
  // 앱이 다시 앞으로 나올 때마다 다시 채운다. 알림을 켜지 않았으면 syncReminders가 아무것도 하지 않는다.
  useEffect(() => {
    if (!isNativeApp()) return;
    const sync = () => {
      const sessionDate = getSessionDate(settings.startTime);
      syncReminders(settings, sessionDate, isWrapped ? sessionDate : null).catch(() => undefined);
    };
    sync();
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [settings, isWrapped]);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);

  useEffect(() => {
    if (modal || !restoreFocusTo) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-modal-trigger="${restoreFocusTo}"]`)?.focus();
      setRestoreFocusTo(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [modal, restoreFocusTo]);

  function openModal(screen: Exclude<ModalScreen, null>) {
    setRestoreFocusTo(screen);
    setModal(screen);
  }

  function closeModal() {
    setModal(null);
  }

  function handleSave(archiveId: string) {
    reset();
    setModal(null);
    setSelectedArchiveId(archiveId);
    window.history.replaceState(null, '', `#archive=${encodeURIComponent(archiveId)}`);
    setActiveTab('archive');
  }

  function renderMain() {
    switch (activeTab) {
      case 'home': return (
        <HomeScreen
          onTabChange={setActiveTab}
          onRecord={() => openModal('record')}
          onWrapUp={() => openModal('wrapup')}
        />
      );
      case 'today': return <TodayScreen onTabChange={setActiveTab} onWrapUp={() => openModal('wrapup')} />;
      case 'archive': return (
        <ArchiveScreen
          onTabChange={setActiveTab}
          initialArchiveId={selectedArchiveId}
          onMakeVideo={entry => { setVideoEntry(entry); openModal('wrapup'); }}
        />
      );
      case 'settings': return <SettingsScreen onTabChange={setActiveTab} />;
    }
  }

  const activeScreen = showOnboarding ? (
    <OnboardingScreen onDone={() => { setShowOnboarding(false); if (isBillingActive()) setShowTrial(true); }} />
  ) : modal === 'record' ? (
    <RecordScreen
      onClose={closeModal}
      onSave={(type, content, caption, media) => { addRecord(type, content, caption, media); setModal(null); }}
    />
  ) : modal === 'wrapup' ? (
    <WrapUpScreen
      onClose={() => { setVideoEntry(null); closeModal(); }}
      onSave={id => { setVideoEntry(null); handleSave(id); }}
      entry={videoEntry ?? undefined}
    />
  ) : renderMain();

  if (isMobile) {
    return (
      // 폰에서는 실제 상태 표시줄 높이만큼만 위를 비운다 (데스크톱 미리보기 틀은 가짜 상태 표시줄 높이).
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', background: '#FBF7EC',
        // 상태 표시줄 밑 흐림 효과에 위 글씨가 덮이지 않게 28px 더 내린다
        '--top-inset': 'calc(env(safe-area-inset-top, 0px) + 28px)',
        // 아래쪽은 홈 인디케이터 여백을 30px 덜 써서 화면을 아래로 더 넓게 쓴다 (위는 그대로)
        '--bottom-inset': 'max(8px, calc(env(safe-area-inset-bottom, 0px) - 30px))',
      } as React.CSSProperties}>
        {activeScreen}
        {showTrial && <TrialSheet onClose={() => setShowTrial(false)} />}
      </div>
    );
  }

  const mainLabel = showOnboarding ? '하꾸 · 설명서'
    : modal === 'record' ? '하꾸 · 기록하기'
    : modal === 'wrapup' ? '하꾸 · 하루 마감'
    : activeTab === 'home' ? '하꾸 · 홈'
    : activeTab === 'today' ? '하꾸 · 오늘'
    : activeTab === 'archive' ? '하꾸 · 아카이브' : '하꾸 · 설정';

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '8px 0 48px' }}>
      <FrameWrapper label={mainLabel}>
        {activeScreen}
        {showTrial && <TrialSheet onClose={() => setShowTrial(false)} />}
      </FrameWrapper>
    </main>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
