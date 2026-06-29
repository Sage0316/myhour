import { useRef, useState } from 'react';
import { useApp } from '../context';
import { getDateStrings, TYPE_COLORS, TYPE_LABELS } from '../store';
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

function RecordCard({ record, onLongPress }: { record: MyRecord; onLongPress: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMedia = record.content.startsWith('data:');

  function handlePointerDown() {
    timerRef.current = setTimeout(() => {
      navigator.vibrate?.(30);
      onLongPress();
    }, 500);
  }
  function handlePointerUp() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  const label = record.type === 'text' ? record.content : TYPE_LABELS[record.type] + ' 기록';

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 18, overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {record.type === 'photo' && hasMedia && (
        <img src={record.content} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
      )}
      {record.type === 'video' && hasMedia && (
        <div style={{ position: 'relative' }}>
          <img src={record.content} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderLeft: '15px solid #fff', borderTop: '10px solid transparent', borderBottom: '10px solid transparent', marginLeft: 4 }} />
            </div>
          </div>
        </div>
      )}
      {record.type === 'audio' && hasMedia && (
        <div style={{ padding: '14px 16px 6px' }}>
          <audio src={record.content} controls style={{ width: '100%', height: 36 }} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <div style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.4)', flexShrink: 0 }}>{record.slotTime}</div>
        <TypeIcon type={record.type} bg={TYPE_COLORS[record.type]} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: record.type === 'text' ? 'nowrap' : undefined, color: '#1A1A1A' }}>
            {label}
          </div>
          {record.type === 'text' && (
            <div style={{ ...MONO, fontSize: 10, color: 'rgba(26,26,26,0.4)', marginTop: 2 }}>{record.content.length}자</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TodayScreen({ onTabChange, onWrapUp }: TodayScreenProps) {
  const { records, currentSlot, deleteRecord } = useApp();
  const { dateShort, weekdayEn } = getDateStrings();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const hasCurrentRecord = records.some(r => r.slotTime === currentSlot);

  function confirmDelete() {
    if (pendingDelete) { deleteRecord(pendingDelete); setPendingDelete(null); }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F7F7F5' }}>
      {/* Header */}
      <div style={{ padding: '60px 22px 16px', background: '#F7F7F5' }}>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>
          Today · {dateShort} {weekdayEn}
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.7px', marginTop: 7 }}>오늘</div>
        <div style={{ fontSize: 14, color: 'rgba(26,26,26,0.5)', marginTop: 4 }}>
          {records.length > 0 ? `${records.length}개의 기록` : '아직 기록이 없어요'}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* 지금 기록할 시간 배너 */}
        {!hasCurrentRecord && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'rgba(124,92,196,0.07)', border: '1.5px dashed rgba(124,92,196,0.35)', borderRadius: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C5CC4', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#7C5CC4' }}>지금 기록할 시간</div>
              <div style={{ ...MONO, fontSize: 10, color: 'rgba(124,92,196,0.7)', marginTop: 2 }}>{currentSlot}</div>
            </div>
          </div>
        )}

        {/* 기록 카드 목록 */}
        {records.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60, opacity: 0.5 }}>
            <div style={{ fontSize: 32 }}>📷</div>
            <div style={{ fontSize: 14, color: 'rgba(26,26,26,0.6)', textAlign: 'center', lineHeight: 1.6 }}>
              첫 기록을 남겨보세요<br />홈 탭에서 기록할 수 있어요
            </div>
          </div>
        ) : (
          records.map(r => (
            <RecordCard key={r.id} record={r} onLongPress={() => setPendingDelete(r.id)} />
          ))
        )}

        <div style={{ height: 8 }} />
      </div>

      {records.length > 0 && (
        <div style={{ padding: '10px 22px 12px', background: '#F7F7F5' }}>
          <button onClick={onWrapUp} style={{ width: '100%', height: 50, borderRadius: 50, background: '#1A1A1A', color: '#FFFFFF', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            하루 마감하고 영상 만들기
          </button>
        </div>
      )}

      <TabBar active="today" onTabChange={onTabChange} />

      {pendingDelete && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setPendingDelete(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px 22px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.45)', textAlign: 'center', marginBottom: 4 }}>이 기록을 삭제할까요?</div>
            <button onClick={confirmDelete} style={{ width: '100%', height: 52, borderRadius: 50, background: '#E5533C', color: '#fff', fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              삭제하기
            </button>
            <button onClick={() => setPendingDelete(null)} style={{ width: '100%', height: 52, borderRadius: 50, background: 'rgba(26,26,26,0.06)', color: '#1A1A1A', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
