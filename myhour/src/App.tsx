import { useState } from 'react';
import IOSFrame from './components/IOSFrame';
import HomeScreen from './screens/HomeScreen';
import TodayScreen from './screens/TodayScreen';
import RecordScreen from './screens/RecordScreen';
import ArchiveScreen from './screens/ArchiveScreen';
import SettingsScreen from './screens/SettingsScreen';
import WrapUpScreen from './screens/WrapUpScreen';

type Tab = 'home' | 'today' | 'archive' | 'settings';
import './App.css';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [modal, setModal] = useState<ModalScreen>(null);
  const [isWrapped, setIsWrapped] = useState(false);

  function handleSave() {
    setModal(null);
    setIsWrapped(true);
    setActiveTab('home');
  }

  function renderMain() {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            isWrapped={isWrapped}
            onTabChange={setActiveTab}
            onRecord={() => setModal('record')}
            onWrapUp={() => setModal('wrapup')}
            onWatchVideo={() => {}}
            dateDay="6월 25일"
            dateWeekday="목요일"
            recordCount={4}
            nextIn="52분"
          />
        );
      case 'today':
        return (
          <TodayScreen
            onTabChange={setActiveTab}
            onWrapUp={() => setModal('wrapup')}
          />
        );
      case 'archive':
        return <ArchiveScreen onTabChange={setActiveTab} />;
      case 'settings':
        return <SettingsScreen onTabChange={setActiveTab} />;
    }
  }

  const mainLabel = activeTab === 'home'
    ? (isWrapped ? '홈 · 마감 후' : '홈 · 기록 중')
    : activeTab === 'today' ? '오늘'
    : activeTab === 'archive' ? '아카이브' : '설정';

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', padding: '8px 0 48px' }}>

      {/* Interactive main app */}
      <FrameWrapper label={`MYHOUR · ${mainLabel}`}>
        {modal === 'record' ? (
          <RecordScreen onClose={() => setModal(null)} />
        ) : modal === 'wrapup' ? (
          <WrapUpScreen onClose={() => setModal(null)} onSave={handleSave} />
        ) : (
          renderMain()
        )}
      </FrameWrapper>

      {/* Static reference: Record screen */}
      <FrameWrapper label="지금 기록하기" dark>
        <RecordScreen onClose={() => {}} />
      </FrameWrapper>

      {/* Static reference: WrapUp screen */}
      <FrameWrapper label="하루 마감 → 영상 생성">
        <WrapUpScreen onClose={() => {}} onSave={() => {}} />
      </FrameWrapper>

    </div>
  );
}
