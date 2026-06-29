import { useApp } from '../context';
import { SLOTS, getCurrentSlot, getDateStrings, TYPE_COLORS, TYPE_LABELS } from '../store';
import type { MyRecord, RecordType } from '../store';
import TabBar from '../components/TabBar';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface TodayScreenProps {
  onTabChange: (tab: Tab) => void;
  onWrapUp: () => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

function TypeIcon({ type, bg }: { type: RecordType; bg: string }) {
  const base: React.CSSProperties = { width: 30, height: 30, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  if (type === 'video') return <div style={base}><div style={{ width: 0, height: 0, borderLeft: '9px solid #1A1A1A', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 2 }} /></div>;
  if (type === 'photo') return <div style={base}><div style={{ width: 12, height: 12, border: '2px solid #1A1A1A', borderRadius: '50%' }} /></div>;
  if (type === 'audio') return (
    <div style={{ ...base, alignItems: 'flex-end', gap: 2, paddingBottom: 8 }}>
      <div style={{ width: 2, height: 8, background: '#1A1A1A' }} />
      <div style={{ width: 2, height: 13, background: '#1A1A1A' }} />
      <div style={{ width: 2, height: 6, background: '#1A1A1A' }} />
    </div>
  );
  return (
    <div style={{ ...base, flexDirection: 'column', gap: 3, padding: '0 6px' }}>
      <div style={{ width: '100%', height: 2, background: '#1A1A1A' }} />
      <div style={{ width: '100%', height: 2, background: '#1A1A1A' }} />
      <div style={{ width: '65%', height: 2, background: '#1A1A1A' }} />
    </div>
  );
}

function isDataUrl(s: string) {
  return s.startsWith('data:');
}

function RecordCard({ record }: { record: MyRecord }) {
  const hasMedia = isDataUrl(record.content);
  const label = record.type === 'text' ? record.content : TYPE_LABELS[record.type] + ' 기록';
  const detail = record.type === 'text'
    ? `TEXT · ${record.content.length}자`
    : TYPE_LABELS[record.type].toUpperCase();

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 16, overflow: 'hidden' }}>
      {record.type === 'photo' && hasMedia && (
        <img src={record.content} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
      )}
      {record.type === 'video' && hasMedia && (
        <div style={{ position: 'relative' }}>
          <img src={record.content} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderLeft: '14px solid #fff', borderTop: '9px solid transparent', borderBottom: '9px solid transparent', marginLeft: 3 }} />
            </div>
          </div>
        </div>
      )}
      {record.type === 'audio' && hasMedia && (
        <div style={{ padding: '12px 14px 4px' }}>
          <audio src={record.content} controls style={{ width: '100%', height: 36 }} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 11 }}>
        <div style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.5)', width: 38, flexShrink: 0 }}>{record.slotTime}</div>
        <TypeIcon type={record.type} bg={TYPE_COLORS[record.type]} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: record.type === 'text' ? 'nowrap' : undefined }}>
            {label}
          </div>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: '0.5px', color: 'rgba(26,26,26,0.45)', marginTop: 2 }}>{detail}</div>
        </div>
      </div>
    </div>
  );
}

export default function TodayScreen({ onTabChange, onWrapUp }: TodayScreenProps) {
  const { records } = useApp();
  const { dateShort, weekdayEn } = getDateStrings();
  const currentSlot = getCurrentSlot();
  const currentSlotIdx = SLOTS.indexOf(currentSlot);

  const slotMap = new Map<string, MyRecord>();
  for (const r of records) slotMap.set(r.slotTime, r);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '60px 22px 14px' }}>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>
          Today · {dateShort} {weekdayEn}
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.7px', marginTop: 7 }}>오늘</div>
        <div style={{ fontSize: 14, color: 'rgba(26,26,26,0.55)', marginTop: 4 }}>
          {records.length > 0 ? `시간 단위로 남긴 ${records.length}개의 기록` : '아직 기록이 없어요'}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {SLOTS.map((slot, idx) => {
          const record = slotMap.get(slot);
          const isActive = slot === currentSlot && !record;
          const isPast = idx < currentSlotIdx && !record;
          const isFarFuture = idx > currentSlotIdx + 1;
          if (isFarFuture) return null;

          if (record) return <RecordCard key={slot} record={record} />;

          if (isActive) return (
            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 11, border: '1.5px dashed rgba(124,92,196,0.4)', borderRadius: 16, background: 'rgba(124,92,196,0.04)' }}>
              <div style={{ ...MONO, fontSize: 11, color: '#7C5CC4', width: 38 }}>{slot}</div>
              <div style={{ width: 30, height: 30, borderRadius: 9, border: '1.5px dashed rgba(124,92,196,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#7C5CC4', fontSize: 18, fontWeight: 300 }}>+</div>
              <div style={{ flex: 1, fontSize: 14, color: '#7C5CC4', fontWeight: 500 }}>지금 기록할 시간</div>
            </div>
          );

          if (isPast) return (
            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 11, border: '1px solid rgba(26,26,26,0.06)', borderRadius: 16, opacity: 0.45 }}>
              <div style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.4)', width: 38 }}>{slot}</div>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: '#F0EFEC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 9, height: 7, border: '1.5px solid rgba(26,26,26,0.35)', borderRadius: '2px 2px 0 0', borderBottom: 'none', marginTop: 3 }} />
              </div>
              <div style={{ flex: 1, fontSize: 14, color: 'rgba(26,26,26,0.4)' }}>기록 안 함</div>
            </div>
          );

          return (
            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 11, border: '1.5px dashed rgba(26,26,26,0.2)', borderRadius: 16 }}>
              <div style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.4)', width: 38 }}>{slot}</div>
              <div style={{ width: 30, height: 30, borderRadius: 9, border: '1.5px dashed rgba(26,26,26,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(26,26,26,0.4)', fontSize: 18, fontWeight: 300 }}>+</div>
              <div style={{ flex: 1, fontSize: 14, color: 'rgba(26,26,26,0.4)' }}>다음 기록 대기 중</div>
            </div>
          );
        })}
      </div>

      {records.length > 0 && (
        <div style={{ padding: '12px 22px 12px' }}>
          <button onClick={onWrapUp} style={{ width: '100%', height: 50, borderRadius: 50, background: '#1A1A1A', color: '#FFFFFF', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            하루 마감하고 영상 만들기
          </button>
        </div>
      )}

      <TabBar active="today" onTabChange={onTabChange} />
    </div>
  );
}
