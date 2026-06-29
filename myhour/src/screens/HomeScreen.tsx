import { useApp } from '../context';
import {
  getNextSlot, minutesLeftInSlot, minutesUntilSlot,
  formatTime, getDateStrings, TYPE_COLORS, TYPE_LABELS,
  guessMood, generateTitle, generateClosing,
} from '../store';
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
  const { records, slots, currentSlot, settings } = useApp();
  const { dateDay, dateWeekday } = getDateStrings();
  const nextSlot = getNextSlot(slots, settings.startTime);

  const slotMap = new Map<string, MyRecord>();
  for (const r of records) slotMap.set(r.slotTime, r);

  const currentIdx = slots.indexOf(currentSlot);
  const visibleSlots = slots.slice(0, currentIdx + 1);

  function slotStatus(slot: string): 'filled' | 'active' | 'missed' | 'upcoming' {
    if (slotMap.has(slot)) return 'filled';
    if (slot === currentSlot) return 'active';
    return slots.indexOf(slot) < currentIdx ? 'missed' : 'upcoming';
  }

  const hasActiveRecord = slotMap.has(currentSlot);
  const timeLeft = formatTime(minutesLeftInSlot(currentSlot, slots, settings.interval, settings.startTime));
  const nextIn = nextSlot ? formatTime(minutesUntilSlot(nextSlot, settings.startTime)) : null;

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
          <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.5px', marginTop: 3 }}>
            {records.length}<span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(26,26,26,0.45)' }}>/{slots.length}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#E4DBF5', borderRadius: 14, padding: '11px 14px', marginTop: 2 }}>
        <div>
          <div style={{ ...MONO, fontSize: 9, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>
            {hasActiveRecord ? 'Next in' : 'Left'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.6px', lineHeight: 1, marginTop: 3 }}>
            {hasActiveRecord ? (nextIn ?? '–') : timeLeft}
          </div>
        </div>
        <div style={{ width: 1, height: 30, background: 'rgba(26,26,26,0.14)' }} />
        <div style={{ flex: 1, fontSize: 12, color: 'rgba(26,26,26,0.62)', lineHeight: 1.4 }}>
          {hasActiveRecord ? `${currentSlot} 기록 완료` : `${currentSlot} 슬롯이 열려있어요`}<br />
          <span style={{ color: '#7C5CC4', fontWeight: 500 }}>
            {hasActiveRecord
              ? (nextSlot ? `다음 기록까지 ${nextIn}` : '오늘 기록 완료!')
              : '이 시간이 지나면 기록할 수 없어요'}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginTop: 2, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 6, top: 14, bottom: 14, width: 2, background: 'rgba(26,26,26,0.12)', pointerEvents: 'none' }} />

        {visibleSlots.map(slot => {
          const status = slotStatus(slot);
          if (status === 'active') {
            return (
              <div key={slot} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '6px 0' }}>
                <div style={{ width: 14, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#7C5CC4', border: '3px solid #fff', boxShadow: '0 0 0 4px rgba(124,92,196,0.18)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid rgba(124,92,196,0.32)', borderRadius: 14, padding: '10px 12px', boxShadow: '0 6px 16px rgba(124,92,196,0.12)' }}>
                  <div style={{ ...MONO, fontSize: 11, color: '#7C5CC4', fontWeight: 500, width: 38 }}>{slot}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>지금 기록할 시간</div>
                    <div style={{ ...MONO, fontSize: 10, letterSpacing: '0.6px', color: 'rgba(26,26,26,0.45)', marginTop: 2 }}>남은 시간 · {timeLeft}</div>
                  </div>
                  <button onClick={onRecord} style={{ height: 32, padding: '0 14px', borderRadius: 50, background: '#7C5CC4', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center' }}>
                    기록 →
                  </button>
                </div>
              </div>
            );
          }
          return <TimelineRow key={slot} time={slot} status={status} record={slotMap.get(slot)} />;
        })}
      </div>

      <div style={{ padding: '10px 0 12px' }}>
        <button onClick={onWrapUp} style={{ width: '100%', height: 48, borderRadius: 50, background: '#1A1A1A', color: '#FFFFFF', fontSize: 15, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif' }}>
          하루 마감하고 영상 만들기
        </button>
      </div>
    </div>
  );
}

function HomeWrapped({ videoUrl }: { videoUrl?: string | null }) {
  const { records } = useApp();
  const { dateDay, dateWeekday, dateShort } = getDateStrings();
  const mood = guessMood(records);
  const title = generateTitle(records);
  const closing = generateClosing(records);

  function handleDownload() {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `myhour-${dateShort}.webm`;
    a.click();
  }

  return (
    <div style={{ flex: 1, padding: '60px 22px 0', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(124,92,196,0.8)' }}>Today · Wrapped</div>
          <div style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-0.6px', marginTop: 5 }}>
            {dateDay} <span style={{ fontWeight: 300 }}>{dateWeekday}</span>
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 50, background: mood.color, fontSize: 12, fontWeight: 500 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
          {mood.mood}
        </div>
      </div>

      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.35 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.6)', lineHeight: 1.5, marginTop: -8 }}>"{closing}"</div>

      {videoUrl ? (
        <video src={videoUrl} controls playsInline style={{ width: '100%', borderRadius: 18, display: 'block' }} />
      ) : (
        <div style={{ borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(158deg, #D5EADC 0%, #E2DBF0 52%, #EFE2D5 100%)', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.55)', textAlign: 'center', lineHeight: 1.6 }}>
            영상을 아직 생성하지 않았어요<br />
            <span style={{ color: '#7C5CC4' }}>하루 마감 → 영상 만들기</span>에서 생성할 수 있어요
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 16 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {records.slice(0, 6).map(r => (
            <div key={r.id} style={{ width: 7, height: 7, borderRadius: '50%', background: TYPE_COLORS[r.type] }} />
          ))}
        </div>
        <div style={{ flex: 1, fontSize: 13, color: 'rgba(26,26,26,0.7)' }}>오늘 {records.length}개 기록</div>
      </div>

      {videoUrl && (
        <div style={{ padding: '4px 0 20px' }}>
          <button onClick={handleDownload} style={{ width: '100%', height: 50, borderRadius: 50, background: '#1A1A1A', color: '#FFFFFF', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            영상 저장하기
          </button>
        </div>
      )}
    </div>
  );
}

export default function HomeScreen({ onTabChange, onRecord, onWrapUp, videoUrl }: HomeScreenProps & { videoUrl?: string | null }) {
  const { isWrapped } = useApp();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {isWrapped ? <HomeWrapped videoUrl={videoUrl} /> : <HomeDay onRecord={onRecord} onWrapUp={onWrapUp} />}
      <TabBar active="home" onTabChange={onTabChange} />
    </div>
  );
}
