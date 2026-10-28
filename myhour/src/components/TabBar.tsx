import { COLOR, FONT_BODY } from '../design';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface TabBarProps {
  active: Tab;
  onTabChange: (tab: Tab) => void;
}

const ICON_PATHS: Record<Tab, React.ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></>,
  today: <><path d="M5 4h11l3 3v13H5z" /><path d="M8.5 10h7M8.5 14h7M8.5 18h4" /></>,
  archive: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" /><path d="M10 13h4" /></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
};

const tabs: { id: Tab; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'today', label: '오늘' },
  { id: 'archive', label: '아카이브' },
  { id: 'settings', label: '설정' },
];

export default function TabBar({ active, onTabChange }: TabBarProps) {
  return (
    <nav aria-label="주요 메뉴" style={{
      margin: '0 14px max(14px, env(safe-area-inset-bottom))',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      padding: '6px 4px',
      background: COLOR.white,
      border: `1.5px solid ${COLOR.ink}`,
      borderRadius: 22,
      flexShrink: 0,
    }}>
      {tabs.map(tab => {
        const on = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-current={on ? 'page' : undefined}
            style={{
              minHeight: 54,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: FONT_BODY,
              fontSize: 13,
              fontWeight: on ? 700 : 400,
              color: on ? COLOR.ink : COLOR.inkSub,
            }}
          >
            <span style={{
              width: 40, height: 30, borderRadius: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxSizing: 'border-box',
              background: on ? COLOR.yellow : 'transparent',
              border: on ? `1.5px solid ${COLOR.ink}` : '1.5px solid transparent',
            }}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 2} strokeLinecap="round" strokeLinejoin="round">
                {ICON_PATHS[tab.id]}
              </svg>
            </span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
