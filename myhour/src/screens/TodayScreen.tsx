import { useRef, useState } from 'react';
import { useApp } from '../context';
import { getDateStrings, TYPE_COLORS, TYPE_LABELS } from '../store';
import type { MyRecord } from '../store';
import TabBar from '../components/TabBar';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface TodayScreenProps {
  onTabChange: (tab: Tab) => void;
  onWrapUp: () => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

function AudioBars() {
  const heights = [10, 22, 14, 30, 18, 26, 12, 28, 16, 20];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 34 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: 'rgba(26,26,26,0.4)' }} />
      ))}
    </div>
  );
}

function RecordTile({ record, onLongPress }: { record: MyRecord; onLongPress: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMedia = record.content.startsWith('data:');

  function handlePointerDown() {
    timerRef.current = setTimeout(() => { navigator.vibrate?.(30); onLongPress(); }, 500);
  }
  function handlePointerUp() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  const bg = TYPE_COLORS[record.type];

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ display: 'flex', flexDirection: 'column', gap: 7, userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Thumbnail */}
      <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden', background: bg, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {(record.type === 'photo' || record.type === 'video') && hasMedia ? (
          <img src={record.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : record.type === 'text' ? (
          <div style={{ padding: '14px 12px', fontSize: 12, lineHeight: 1.55, color: 'rgba(26,26,26,0.75)', overflow: 'hidden', maxHeight: '100%' }}>
            {record.content}
          </div>
        ) : (
          <AudioBars />
        )}

        {/* Video play overlay */}
        {record.type === 'video' && hasMedia && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderLeft: '11px solid #fff', borderTop: '7px solid transparent', borderBottom: '7px solid transparent', marginLeft: 3 }} />
            </div>
          </div>
        )}

        {/* Time badge */}
        <div style={{ position: 'absolute', top: 9, left: 9, ...MONO, fontSize: 10, color: record.type === 'text' ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.9)', background: record.type === 'text' ? 'transparent' : 'rgba(0,0,0,0.28)', borderRadius: 6, padding: '2px 5px' }}>
          {record.slotTime}
        </div>
      </div>

      {/* Label */}
      <div style={{ paddingLeft: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.type === 'text' ? (record.content.length > 16 ? record.content.slice(0, 14) + '…' : record.content) : TYPE_LABELS[record.type] + ' 기록'}
        </div>
        <div style={{ ...MONO, fontSize: 10, color: 'rgba(26,26,26,0.4)', marginTop: 1 }}>{TYPE_LABELS[record.type].toUpperCase()}</div>
      </div>
    </div>
  );
}

function EmptyTile({ slot, isCurrent }: { slot: string; isCurrent: boolean }) {
  if (isCurrent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: 16, border: '2px dashed rgba(124,92,196,0.45)', background: 'rgba(124,92,196,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px dashed rgba(124,92,196,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C5CC4', fontSize: 18, fontWeight: 300 }}>+</div>
          <div style={{ fontSize: 10, color: '#7C5CC4', fontWeight: 500 }}>기록하기</div>
        </div>
        <div style={{ paddingLeft: 2 }}>
          <div style={{ ...MONO, fontSize: 10, color: '#7C5CC4', fontWeight: 600 }}>{slot}</div>
          <div style={{ fontSize: 11, color: 'rgba(124,92,196,0.7)', marginTop: 1 }}>지금</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, opacity: 0.38 }}>
      <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: 16, background: 'rgba(26,26,26,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 9, height: 7, border: '1.5px solid rgba(26,26,26,0.3)', borderRadius: '2px 2px 0 0', borderBottom: 'none', marginTop: 3 }} />
      </div>
      <div style={{ paddingLeft: 2 }}>
        <div style={{ ...MONO, fontSize: 10, color: 'rgba(26,26,26,0.5)' }}>{slot}</div>
        <div style={{ fontSize: 11, color: 'rgba(26,26,26,0.4)', marginTop: 1 }}>기록 안 함</div>
      </div>
    </div>
  );
}

export default function TodayScreen({ onTabChange, onWrapUp }: TodayScreenProps) {
  const { records, slots, currentSlot, deleteRecord } = useApp();
  const { dateShort, weekdayEn } = getDateStrings();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const slotMap = new Map(records.map(r => [r.slotTime, r]));
  const currentIdx = slots.indexOf(currentSlot);
  const visibleSlots = slots.slice(0, currentIdx + 1);

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
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 7 }}>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.7px' }}>오늘</div>
          <div style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.45)', paddingBottom: 5 }}>
            {records.length}/{visibleSlots.length}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px' }}>
        {visibleSlots.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10, opacity: 0.5 }}>
            <div style={{ fontSize: 14, color: 'rgba(26,26,26,0.6)', textAlign: 'center', lineHeight: 1.6 }}>
              아직 기록할 시간이 시작되지 않았어요
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px' }}>
            {visibleSlots.map(slot => {
              const record = slotMap.get(slot);
              const isCurrent = slot === currentSlot;
              if (record) return <RecordTile key={slot} record={record} onLongPress={() => setPendingDelete(record.id)} />;
              return <EmptyTile key={slot} slot={slot} isCurrent={isCurrent} />;
            })}
          </div>
        )}

        <div style={{ height: 16 }} />
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
