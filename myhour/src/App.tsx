import { useState, useEffect } from 'react';
import IOSFrame from './components/IOSFrame';
import HomeScreen from './screens/HomeScreen';
import TodayScreen from './screens/TodayScreen';
import RecordScreen from './screens/RecordScreen';
import ArchiveScreen from './screens/ArchiveScreen';
import SettingsScreen from './screens/SettingsScreen';
import WrapUpScreen from './screens/WrapUpScreen';
import { AppProvider, useApp } from './context';
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
  const { isWrapped, setWrapped, addRecord } = useApp();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  function handleSave() {
    setModal(null);
    setWrapped(true);
    setActiveTab('home');
  }

  function renderMain() {
    switch (activeTab) {
      case 'home': return (
        <HomeScreen
          onTabChange={setActiveTab}
          onRecord={() => setModal('record')}
          onWrapUp={() => setModal('wrapup')}
        />
      );
      case 'today': return <TodayScreen onTabChange={setActiveTab} onWrapUp={() => setModal('wrapup')} />;
      case 'archive': return <ArchiveScreen onTabChange={setActiveTab} />;
      case 'settings': return <SettingsScreen onTabChange={setActiveTab} />;
    }
  }

  const activeScreen = modal === 'record' ? (
    <RecordScreen
      onClose={() => setModal(null)}
      onSave={(type, content) => { addRecord(type, content); setModal(null); }}
    />
  ) : modal === 'wrapup' ? (
    <WrapUpScreen onClose={() => setModal(null)} onSave={handleSave} />
  ) : renderMain();

  if (isMobile) {
    return (
      <div style={{ height: '100dvh', overflow: 'hidden', background: '#fff' }}>
        {activeScreen}
      </div>
    );
  }

  const mainLabel = modal === 'record' ? 'MYHOUR · 기록하기'
    : modal === 'wrapup' ? 'MYHOUR · 하루 마감'
    : activeTab === 'home' ? (isWrapped ? 'MYHOUR · 홈 · 마감 후' : 'MYHOUR · 홈 · 기록 중')
    : activeTab === 'today' ? 'MYHOUR · 오늘'
    : activeTab === 'archive' ? 'MYHOUR · 아카이브' : 'MYHOUR · 설정';

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', padding: '8px 0 48px' }}>
      <FrameWrapper label={mainLabel}>
        {activeScreen}
      </FrameWrapper>
      <FrameWrapper label="지금 기록하기" dark>
        <RecordScreen onClose={() => {}} onSave={() => {}} />
      </FrameWrapper>
      <FrameWrapper label="하루 마감 → 영상 생성">
        <WrapUpScreen onClose={() => {}} onSave={() => {}} />
      </FrameWrapper>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
