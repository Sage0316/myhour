type Tab = 'home' | 'today' | 'archive' | 'settings';

interface TabBarProps {
  active: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'today', label: '오늘' },
  { id: 'archive', label: '아카이브' },
  { id: 'settings', label: '설정' },
];

export default function TabBar({ active, onTabChange }: TabBarProps) {
  return (
    <div style={{
      display: 'flex',
      padding: '10px 20px 28px',
      borderTop: '1px solid rgba(26,26,26,0.08)',
      background: 'rgba(255,255,255,0.94)',
      flexShrink: 0,
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: active === tab.id ? '#1A1A1A' : 'transparent',
          }} />
          <span style={{
            fontSize: 12,
            fontWeight: active === tab.id ? 500 : 400,
            color: active === tab.id ? '#1A1A1A' : 'rgba(26,26,26,0.38)',
            fontFamily: 'Inter, sans-serif',
          }}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}

