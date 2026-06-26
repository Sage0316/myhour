import TabBar from '../components/TabBar';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface TodayScreenProps {
  onTabChange: (tab: Tab) => void;
  onWrapUp: () => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

type RecordType = 'video' | 'photo' | 'audio' | 'text';

interface RecordItem {
  time: string;
  type: RecordType;
  title: string;
  detail: string;
  bg: string;
  thumbBg?: string;
}

const records: RecordItem[] = [
  { time: '09:00', type: 'video', title: '출근길 버스', detail: 'VIDEO · 0:12', bg: '#F4C9B8', thumbBg: '#F0D9C8' },
  { time: '11:00', type: 'photo', title: '책상 정리', detail: 'PHOTO', bg: '#CDEBDD', thumbBg: '#D9EAD9' },
  { time: '13:00', type: 'audio', title: '점심 메모', detail: 'AUDIO · 0:18', bg: '#E4DBF5' },
  { time: '15:00', type: 'text', title: '회의 끝, 머리 아픔', detail: 'TEXT · 28자', bg: '#F4ECD9' },
  { time: '17:00', type: 'video', title: '퇴근 노을', detail: 'VIDEO · 0:09', bg: '#F4C9B8', thumbBg: '#F0D9C8' },
];

function TypeIcon({ type, bg }: { type: RecordType; bg: string }) {
  const base: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 9, background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
  if (type === 'video') return (
    <div style={base}>
      <div style={{ width: 0, height: 0, borderLeft: '9px solid #1A1A1A', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 2 }} />
    </div>
  );
  if (type === 'photo') return (
    <div style={base}>
      <div style={{ width: 12, height: 12, border: '2px solid #1A1A1A', borderRadius: '50%' }} />
    </div>
  );
  if (type === 'audio') return (
    <div style={{ ...base, alignItems: 'flex-end', gap: 2, paddingBottom: 8 }}>
      <div style={{ width: 2, height: 8, background: '#1A1A1A' }} />
      <div style={{ width: 2, height: 13, background: '#1A1A1A' }} />
      <div style={{ width: 2, height: 6, background: '#1A1A1A' }} />
    </div>
  );
  // text
  return (
    <div style={{ ...base, flexDirection: 'column', gap: 3, alignItems: 'center', padding: '0 6px' }}>
      <div style={{ width: '100%', height: 2, background: '#1A1A1A' }} />
      <div style={{ width: '100%', height: 2, background: '#1A1A1A' }} />
      <div style={{ width: '65%', height: 2, background: '#1A1A1A' }} />
    </div>
  );
}

function RecordThumb({ type, bg, thumbBg }: { type: RecordType; bg: string; thumbBg?: string }) {
  if (type === 'audio') {
    return (
      <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 14, height: 2, background: 'rgba(26,26,26,0.5)', boxShadow: '0 4px 0 rgba(26,26,26,0.5), 0 -4px 0 rgba(26,26,26,0.5)' }} />
      </div>
    );
  }
  if (type === 'text') return null;
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 9,
      background: `repeating-linear-gradient(135deg, rgba(26,26,26,0.06) 0 6px, rgba(26,26,26,0) 6px 12px), ${thumbBg || bg}`,
    }} />
  );
}

export default function TodayScreen({ onTabChange, onWrapUp }: TodayScreenProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '60px 22px 14px' }}>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>
          Today · 6.25 THU
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.7px', marginTop: 7 }}>오늘</div>
        <div style={{ fontSize: 14, color: 'rgba(26,26,26,0.55)', marginTop: 4 }}>시간 단위로 남긴 5개의 기록</div>
      </div>

      {/* Record list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {records.map(item => (
          <div key={item.time} style={{
            display: 'flex', alignItems: 'center', gap: 13, padding: 11,
            background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 16,
          }}>
            <div style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.5)', width: 38 }}>{item.time}</div>
            <TypeIcon type={item.type} bg={item.bg} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
              <div style={{ ...MONO, fontSize: 10, letterSpacing: '0.5px', color: 'rgba(26,26,26,0.45)', marginTop: 2 }}>{item.detail}</div>
            </div>
            <RecordThumb type={item.type} bg={item.bg} thumbBg={item.thumbBg} />
          </div>
        ))}

        {/* Upcoming slot */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 13, padding: 11,
          border: '1.5px dashed rgba(26,26,26,0.2)', borderRadius: 16,
        }}>
          <div style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.4)', width: 38 }}>19:00</div>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            border: '1.5px dashed rgba(26,26,26,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: 'rgba(26,26,26,0.4)', fontSize: 18, fontWeight: 300,
          }}>+</div>
          <div style={{ flex: 1, fontSize: 14, color: 'rgba(26,26,26,0.4)' }}>다음 기록 대기 중</div>
        </div>
      </div>

      {/* Wrap-up button */}
      <div style={{ padding: '12px 22px 12px' }}>
        <button
          onClick={onWrapUp}
          style={{
            width: '100%', height: 50, borderRadius: 50,
            background: '#1A1A1A', color: '#FFFFFF',
            fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          하루 마감하고 영상 만들기
        </button>
      </div>

      <TabBar active="today" onTabChange={onTabChange} />
    </div>
  );
}
