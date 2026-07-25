import { useApp } from '../context';
import { getDateStrings, getSessionDate, TYPE_COLORS, TYPE_LABELS } from '../store';
import type { MyRecord, RecordType } from '../store';
import TabBar from '../components/TabBar';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface HomeScreenProps {
  onTabChange: (tab: Tab) => void;
  onRecord: () => void;
  onWrapUp: () => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };


type IconType = RecordType | 'locked' | 'waiting';

function MediaIcon({ type, bg }: { type: IconType; bg: string }) {
  const base: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 8, background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
  if (type === 'video') return <div style={base}><div style={{ width: 0, height: 0, borderLeft: '8px solid #1A1A1A', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 2 }} /></div>;
  if (type === 'photo') return <div style={base}><div style={{ width: 10, height: 10, border: '2px solid #1A1A1A', borderRadius: '50%' }} /></div>;
  if (type === 'meme') return (
    <div style={base}>
      <div style={{ width: 13, height: 11, border: '2px solid #1A1A1A', borderRadius: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ width: 0, height: 0, borderLeft: '3.5px solid transparent', borderRight: '3.5px solid transparent', borderBottom: '4px solid #1A1A1A' }} />
      </div>
    </div>
  );
  if (type === 'audio') return (
    <div style={{ ...base, alignItems: 'flex-end', gap: 2, paddingBottom: 7 }}>
      <div style={{ width: 2, height: 7, background: '#1A1A1A' }} />
      <div style={{ width: 2, height: 11, background: '#1A1A1A' }} />
      <div style={{ width: 2, height: 5, background: '#1A1A1A' }} />
    </div>
  );
  if (type === 'text') return (
    <div style={{ ...base, flexDirection: 'column', gap: 3, padding: '0 6px' }}>
      <div style={{ width: '100%', height: 2, background: '#1A1A1A' }} />
      <div style={{ width: '100%', height: 2, background: '#1A1A1A' }} />
      <div style={{ width: '65%', height: 2, background: '#1A1A1A' }} />
    </div>
  );
  if (type === 'locked') return (
    <div style={base}>
      <div style={{ width: 9, height: 7, border: '1.5px solid rgba(26,26,26,0.35)', borderRadius: '2px 2px 0 0', borderBottom: 'none', marginTop: 3 }} />
    </div>
  );
  return (
    <div style={{ ...base, background: 'transparent', border: '1.5px dashed rgba(26,26,26,0.2)' }}>
      <div style={{ fontSize: 14, color: 'rgba(26,26,26,0.3)', fontWeight: 300, lineHeight: 1 }}>+</div>
    </div>
  );
}

function TimelineRow({ time, status, record }: { time: string; status: 'filled' | 'missed' | 'upcoming'; record?: MyRecord }) {
  const dim = status !== 'filled';
  const iconType: IconType = status === 'filled' ? record!.type : status === 'missed' ? 'locked' : 'waiting';
  const iconBg = status === 'filled' ? TYPE_COLORS[record!.type] : status === 'missed' ? '#F0EFEC' : 'transparent';

  let label: string;
  if (status === 'filled' && record) {
    if (record.caption) {
      label = record.caption.length > 14 ? record.caption.slice(0, 12) + '…' : record.caption;
    } else {
      label = record.type === 'text'
        ? (record.content.length > 14 ? record.content.slice(0, 12) + '…' : record.content)
        : TYPE_LABELS[record.type] + ' 기록';
    }
  } else {
    label = status === 'missed' ? '놓친 시간 · 기록 안 함' : '기록 대기';
  }

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '6px 0' }}>
      <div style={{ width: 14, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <div style={{
          width: 11, height: 11, borderRadius: '50%',
          background: status === 'filled' ? '#1A1A1A' : 'transparent',
          border: status === 'filled' ? 'none' : `2px solid rgba(26,26,26,${status === 'missed' ? '0.2' : '0.2'})`,
        }} />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ ...MONO, fontSize: 11, color: dim ? 'rgba(26,26,26,0.35)' : 'rgba(26,26,26,0.5)', width: 38 }}>{time}</div>
        <MediaIcon type={iconType} bg={iconBg} />
        <div style={{ fontSize: 13, fontWeight: dim ? 400 : 450, color: dim ? 'rgba(26,26,26,0.4)' : '#1A1A1A' }}>{label}</div>
      </div>
    </div>
  );
}

function HomeDay({ onRecord, onWrapUp }: { onRecord: () => void; onWrapUp: () => void }) {
  const { records, settings } = useApp();
  const { dateDay, dateWeekday } = getDateStrings(getSessionDate(settings.startTime));
  const sorted = [...records].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div style={{ flex: 1, padding: '60px 22px 0', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(124,92,196,0.8)' }}>Today</div>
          <div style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-0.6px', marginTop: 5 }}>
            {dateDay} <span style={{ fontWeight: 300 }}>{dateWeekday}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.2px', color: 'rgba(26,26,26,0.45)' }}>RECORDS</div>
          <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.5px', marginTop: 3 }}>{records.length}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginTop: 2, position: 'relative' }}>
        {sorted.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, opacity: 0.4 }}>
            <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.6)' }}>아직 기록이 없어요</div>
          </div>
        ) : (
          <>
            <div style={{ position: 'absolute', left: 6, top: 14, bottom: 14, width: 2, background: 'rgba(26,26,26,0.12)', pointerEvents: 'none' }} />
            {sorted.map(record => (
              <TimelineRow key={record.id} time={record.slotTime} status="filled" record={record} />
            ))}
          </>
        )}
      </div>

      <div style={{ padding: '10px 0 12px', display: 'flex', gap: 9 }}>
        <button onClick={onRecord} style={{ flex: 1, height: 48, borderRadius: 50, background: '#F0F0EE', color: '#1A1A1A', fontSize: 15, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif' }}>
          + 기록하기
        </button>
        <button onClick={onWrapUp} style={{ flex: 1.5, height: 48, borderRadius: 50, background: '#1A1A1A', color: '#FFFFFF', fontSize: 15, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif' }}>
          하루 마감
        </button>
      </div>
    </div>
  );
}

export default function HomeScreen({ onTabChange, onRecord, onWrapUp }: HomeScreenProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <HomeDay onRecord={onRecord} onWrapUp={onWrapUp} />
      <TabBar active="home" onTabChange={onTabChange} />
    </div>
  );
}
