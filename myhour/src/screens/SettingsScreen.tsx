import TabBar from '../components/TabBar';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface SettingsScreenProps {
  onTabChange: (tab: Tab) => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

function Chevron() {
  return (
    <div style={{
      width: 7, height: 11,
      borderRight: '2px solid rgba(26,26,26,0.3)',
      borderBottom: '2px solid rgba(26,26,26,0.3)',
      transform: 'rotate(-45deg)',
      flexShrink: 0,
    }} />
  );
}

interface SettingRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

function SettingRow({ label, value, isLast }: SettingRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', minHeight: 50, padding: '0 16px',
      borderBottom: isLast ? 'none' : '1px solid rgba(26,26,26,0.07)',
    }}>
      <div style={{ flex: 1, fontSize: 15 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)', marginRight: 9 }}>{value}</div>
      <Chevron />
    </div>
  );
}

interface SettingGroupProps {
  header: string;
  rows: { label: string; value: string }[];
}

function SettingGroup({ header, rows }: SettingGroupProps) {
  return (
    <div>
      <div style={{
        ...MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase',
        color: 'rgba(26,26,26,0.45)', padding: '0 4px 8px',
      }}>
        {header}
      </div>
      <div style={{
        background: '#fff', border: '1px solid rgba(26,26,26,0.07)',
        borderRadius: 18, overflow: 'hidden',
      }}>
        {rows.map((row, i) => (
          <SettingRow key={row.label} label={row.label} value={row.value} isLast={i === rows.length - 1} />
        ))}
      </div>
    </div>
  );
}

export default function SettingsScreen({ onTabChange }: SettingsScreenProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '60px 22px 8px' }}>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>Settings</div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.7px', marginTop: 7 }}>설정</div>
      </div>

      {/* Settings groups */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 22px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <SettingGroup
          header="Schedule · 기록 시간"
          rows={[
            { label: '시작 시간', value: '09:00' },
            { label: '종료 방식', value: '종료 시간 미정' },
            { label: '기록 간격', value: '2시간' },
          ]}
        />
        <SettingGroup
          header="Output · 결과물"
          rows={[
            { label: '출력 비율', value: '9:16 세로' },
            { label: '저장 방식', value: '결과물 먼저 보기' },
            { label: '배경 음악', value: '잔잔한 피아노' },
          ]}
        />
        <SettingGroup
          header="Capture · 알림 · 기록 방식"
          rows={[
            { label: '알림 시점', value: '1분 전 · 기록 시각' },
            { label: '기록 방식', value: '매번 선택' },
          ]}
        />
      </div>

      <TabBar active="settings" onTabChange={onTabChange} />
    </div>
  );
}
