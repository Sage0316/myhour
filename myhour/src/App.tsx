import { useState, useEffect } from 'react';
import IOSFrame from './components/IOSFrame';
import HomeScreen from './screens/HomeScreen';
import TodayScreen from './screens/TodayScreen';
import RecordScreen from './screens/RecordScreen';
import ArchiveScreen from './screens/ArchiveScreen';
import type { ArchiveEntry } from './store';
import SettingsScreen from './screens/SettingsScreen';
import WrapUpScreen from './screens/WrapUpScreen';
import { AppProvider } from './context';
import { useApp } from './appContext';
import './App.css';

type Tab = 'home' | 'today' | 'archive' | 'settings';
type ModalScreen = 'record' | 'wrapup' | null;

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11, letterSpacing: '1.4px', textTransform: 'uppercase',
  color: 'rgba(26,26,26,0.5)',
};

/**
 * 아이폰 홈 화면 앱(PWA)은 상태 표시줄 밑까지 그리면서도 창 높이를 상태 표시줄만큼 짧게 알려준다.
 * 그래서 100%나 100dvh로는 아래에 빈 띠가 남는다. 그때만 실제 화면 높이를 쓴다.
 * 차이가 상태 표시줄 정도(80px 이하)일 때만 쓰고, 그 밖에는 null을 돌려 평소처럼 100%를 쓴다.
 */
function measureStandaloneHeight(): number | null {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!standalone) return null;
  const portrait = window.innerHeight >= window.innerWidth;
  const screenHeight = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  const gap = screenHeight - window.innerHeight;
  return gap > 0 && gap <= 80 ? screenHeight : null;
}

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
  const { addRecord, reset } = useApp();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);
  const [standaloneHeight, setStandaloneHeight] = useState(measureStandaloneHeight);

  useEffect(() => {
    const handler = () => {
      setIsMobile(window.innerWidth < 600);
      setStandaloneHeight(measureStandaloneHeight());
    };
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

  const activeScreen = modal === 'record' ? (
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
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: standaloneHeight ? `${standaloneHeight}px` : '100%',
        overflow: 'hidden', background: '#FBF7EC',
      }}>
        {activeScreen}
      </div>
    );
  }

  const mainLabel = modal === 'record' ? '하꾸 · 기록하기'
    : modal === 'wrapup' ? '하꾸 · 하루 마감'
    : activeTab === 'home' ? '하꾸 · 홈'
    : activeTab === 'today' ? '하꾸 · 오늘'
    : activeTab === 'archive' ? '하꾸 · 아카이브' : '하꾸 · 설정';

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '8px 0 48px' }}>
      <FrameWrapper label={mainLabel}>
        {activeScreen}
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
