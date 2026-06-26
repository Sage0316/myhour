import TabBar from '../components/TabBar';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface HomeScreenProps {
  isWrapped: boolean;
  onTabChange: (tab: Tab) => void;
  onRecord: () => void;
  onWrapUp: () => void;
  onWatchVideo: () => void;
  dateDay: string;
  dateWeekday: string;
  recordCount: number;
  nextIn: string;
}

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

function PlayIcon({ size = 10, color = '#1A1A1A' }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: 0, height: 0,
      borderLeft: `${size}px solid ${color}`,
      borderTop: `${size * 0.65}px solid transparent`,
      borderBottom: `${size * 0.65}px solid transparent`,
      marginLeft: 2,
    }} />
  );
}

// ---- Daytime Home ----
function HomeDay({ dateDay, dateWeekday, recordCount, nextIn, onRecord, onWrapUp }: {
  dateDay: string; dateWeekday: string; recordCount: number; nextIn: string;
  onRecord: () => void; onWrapUp: () => void;
}) {
  return (
    <div style={{ flex: 1, padding: '60px 22px 0', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
      {/* Header row */}
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
            {recordCount}<span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(26,26,26,0.45)' }}>/6</span>
          </div>
        </div>
      </div>

      {/* Countdown card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 11,
        background: '#E4DBF5', borderRadius: 14, padding: '11px 14px', marginTop: 2,
      }}>
        <div>
          <div style={{ ...MONO, fontSize: 9, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>Next in</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.6px', lineHeight: 1, marginTop: 3 }}>{nextIn}</div>
        </div>
        <div style={{ width: 1, height: 30, background: 'rgba(26,26,26,0.14)' }} />
        <div style={{ flex: 1, fontSize: 12, color: 'rgba(26,26,26,0.62)', lineHeight: 1.4 }}>
          17:00 슬롯이 열렸어요<br />
          <span style={{ color: '#7C5CC4', fontWeight: 500 }}>이 시간이 지나면 기록할 수 없어요</span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', marginTop: 2 }}>
        {/* Vertical spine */}
        <div style={{
          position: 'absolute', left: 6, top: 14, bottom: 14,
          width: 2, background: 'rgba(26,26,26,0.12)',
        }} />

        {/* 09:00 - Video */}
        <TimelineRow
          time="09:00" filled
          icon={<MediaIcon type="video" bg="#F4C9B8" />}
          label="출근길 버스"
        />
        {/* 11:00 - Photo */}
        <TimelineRow
          time="11:00" filled
          icon={<MediaIcon type="photo" bg="#CDEBDD" />}
          label="책상 정리"
        />
        {/* 13:00 - Audio */}
        <TimelineRow
          time="13:00" filled
          icon={<MediaIcon type="audio" bg="#E4DBF5" />}
          label="점심 메모 · 0:18"
        />
        {/* 15:00 - Missed */}
        <TimelineRow
          time="15:00" missed
          icon={<MediaIcon type="locked" bg="#F0EFEC" />}
          label="놓친 시간 · 기록 안 함"
          dimLabel
        />
        {/* 17:00 - Active */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '6px 0' }}>
          <div style={{ width: 14, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: '#7C5CC4', border: '3px solid #fff',
              boxShadow: '0 0 0 4px rgba(124,92,196,0.18)',
            }} />
          </div>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: '#fff', border: '1px solid rgba(124,92,196,0.32)',
            borderRadius: 14, padding: '10px 12px',
            boxShadow: '0 6px 16px rgba(124,92,196,0.12)',
          }}>
            <div style={{ ...MONO, fontSize: 11, color: '#7C5CC4', fontWeight: 500, width: 38 }}>17:00</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>지금 기록할 시간</div>
              <div style={{ ...MONO, fontSize: 10, letterSpacing: '0.6px', color: 'rgba(26,26,26,0.45)', marginTop: 2 }}>
                남은 시간 · {nextIn}
              </div>
            </div>
            <button
              onClick={onRecord}
              style={{
                height: 32, padding: '0 14px', borderRadius: 50,
                background: '#7C5CC4', color: '#fff',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: 'none', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center',
              }}
            >
              기록 →
            </button>
          </div>
        </div>
        {/* 19:00 - Waiting */}
        <TimelineRow
          time="19:00" upcoming
          icon={null}
          label="기록 대기"
          dimLabel
        />
      </div>

      {/* Wrap-up button */}
      <div style={{ padding: '10px 0 12px' }}>
        <button
          onClick={onWrapUp}
          style={{
            width: '100%', height: 48, borderRadius: 50,
            background: '#1A1A1A', color: '#FFFFFF',
            fontSize: 15, fontWeight: 500, cursor: 'pointer',
            border: 'none', fontFamily: 'Inter, sans-serif',
          }}
        >
          하루 마감하고 영상 만들기
        </button>
      </div>
    </div>
  );
}

function TimelineRow({ time, filled, missed, upcoming, icon, label, dimLabel }: {
  time: string; filled?: boolean; missed?: boolean; upcoming?: boolean;
  icon: React.ReactNode; label: string; dimLabel?: boolean;
}) {
  const dotColor = filled ? '#1A1A1A' : 'transparent';
  const dotBorder = filled ? 'none' : `2px solid rgba(26,26,26,${missed ? '0.2' : '0.25'})`;

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '6px 0' }}>
      <div style={{ width: 14, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <div style={{
          width: 11, height: 11, borderRadius: '50%',
          background: dotColor,
          border: dotBorder,
        }} />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ ...MONO, fontSize: 11, color: dimLabel ? 'rgba(26,26,26,0.35)' : 'rgba(26,26,26,0.5)', width: 38 }}>{time}</div>
        {icon}
        <div style={{ fontSize: 14, fontWeight: dimLabel ? 400 : 450, color: dimLabel ? 'rgba(26,26,26,0.4)' : '#1A1A1A' }}>{label}</div>
      </div>
    </div>
  );
}

type MediaType = 'video' | 'photo' | 'audio' | 'text' | 'locked';

function MediaIcon({ type, bg }: { type: MediaType; bg: string }) {
  const iconStyle: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 8, background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  };
  if (type === 'video') return (
    <div style={iconStyle}>
      <div style={{ width: 0, height: 0, borderLeft: '8px solid #1A1A1A', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 2 }} />
    </div>
  );
  if (type === 'photo') return (
    <div style={iconStyle}>
      <div style={{ width: 10, height: 10, border: '2px solid #1A1A1A', borderRadius: '50%' }} />
    </div>
  );
  if (type === 'audio') return (
    <div style={{ ...iconStyle, alignItems: 'flex-end', gap: 2, paddingBottom: 7 }}>
      <div style={{ width: 2, height: 7, background: '#1A1A1A' }} />
      <div style={{ width: 2, height: 11, background: '#1A1A1A' }} />
      <div style={{ width: 2, height: 5, background: '#1A1A1A' }} />
    </div>
  );
  if (type === 'text') return (
    <div style={{ ...iconStyle, flexDirection: 'column', gap: 3, padding: '0 6px' }}>
      <div style={{ width: '100%', height: 2, background: '#1A1A1A' }} />
      <div style={{ width: '100%', height: 2, background: '#1A1A1A' }} />
      <div style={{ width: '65%', height: 2, background: '#1A1A1A' }} />
    </div>
  );
  // locked
  return (
    <div style={iconStyle}>
      <div style={{
        width: 9, height: 7,
        border: '1.5px solid rgba(26,26,26,0.4)',
        borderRadius: '2px 2px 0 0', borderBottom: 'none',
        marginTop: 3, position: 'relative',
      }} />
    </div>
  );
}

// ---- Wrapped Home ----
function HomeWrapped({ dateDay, dateWeekday, onTabChange, onWatchVideo }: {
  dateDay: string; dateWeekday: string;
  onTabChange: (tab: Tab) => void; onWatchVideo: () => void;
}) {
  return (
    <div style={{ flex: 1, padding: '60px 22px 0', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(124,92,196,0.8)' }}>Today · Wrapped</div>
          <div style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-0.6px', marginTop: 5 }}>
            {dateDay} <span style={{ fontWeight: 300 }}>{dateWeekday}</span>
          </div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 11px', borderRadius: 50, background: '#CDEBDD',
          fontSize: 12, fontWeight: 500,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3FA37B', display: 'inline-block' }} />
          잔잔함
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.6)' }}>오늘이 한 편의 영상이 됐어요</div>

      {/* Video player */}
      <div style={{
        flex: 1, position: 'relative', borderRadius: 22, overflow: 'hidden', minHeight: 0,
        background: 'linear-gradient(158deg, #D5EADC 0%, #E2DBF0 52%, #EFE2D5 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3FA37B', display: 'inline-block' }} />
          <span style={{ ...MONO, fontSize: 10, letterSpacing: '1.2px', color: 'rgba(26,26,26,0.6)' }}>오늘의 영상 · 9:16</span>
        </div>
        <button onClick={onWatchVideo} style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(255,255,255,0.94)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
          border: 'none', cursor: 'pointer',
        }}>
          <PlayIcon size={14} />
        </button>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '14px 16px 16px',
          background: 'linear-gradient(rgba(26,26,26,0) 0%, rgba(26,26,26,0.58) 100%)',
          color: '#fff',
        }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.2px' }}>
            버스에서 노을까지, 평범하게 좋았던 하루
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 5, lineHeight: 1.45 }}>
            "별일 없었지만, 이런 하루가 제일 오래 남더라."
          </div>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <PlayIcon size={8} color="#fff" />
            <div style={{ flex: 1, height: 3, borderRadius: 50, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
              <div style={{ width: '6%', height: '100%', background: '#fff' }} />
            </div>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: '0.5px', color: 'rgba(255,255,255,0.85)' }}>0:00 / 0:52</div>
          </div>
        </div>
      </div>

      {/* Clips summary */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '11px 13px', background: '#fff',
        border: '1px solid rgba(26,26,26,0.07)', borderRadius: 16,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#1A1A1A' }} />
          ))}
        </div>
        <div style={{ flex: 1, fontSize: 13, color: 'rgba(26,26,26,0.7)' }}>오늘 6개 기록 · 09:00–19:00</div>
        <div style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.5)' }}>0:52</div>
      </div>

      {/* Save / Share */}
      <div style={{ padding: '10px 0 12px', display: 'flex', gap: 9 }}>
        <button style={{
          flex: 1.5, height: 50, borderRadius: 50,
          background: '#1A1A1A', color: '#FFFFFF',
          fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}>영상 저장하기</button>
        <button style={{
          flex: 1, height: 50, borderRadius: 50,
          background: '#FFFFFF', border: '1px solid rgba(26,26,26,0.18)',
          fontSize: 15, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}>공유</button>
      </div>
    </div>
  );
}

export default function HomeScreen({
  isWrapped, onTabChange, onRecord, onWrapUp, onWatchVideo,
  dateDay, dateWeekday, recordCount, nextIn,
}: HomeScreenProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {isWrapped ? (
        <HomeWrapped
          dateDay={dateDay} dateWeekday={dateWeekday}
          onTabChange={onTabChange} onWatchVideo={onWatchVideo}
        />
      ) : (
        <HomeDay
          dateDay={dateDay} dateWeekday={dateWeekday}
          recordCount={recordCount} nextIn={nextIn}
          onRecord={onRecord} onWrapUp={onWrapUp}
        />
      )}
      <TabBar active="home" onTabChange={onTabChange} />
    </div>
  );
}
