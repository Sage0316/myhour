import { useEffect, useState } from 'react';
import { useApp } from '../appContext';
import {
  formatTime, getDateStrings, getNextSlot, getSessionDate, minutesUntilSlot, TYPE_LABELS,
} from '../store';
import type { MyRecord } from '../store';
import TabBar from '../components/TabBar';
import { useMediaSrc } from '../useMediaSrc';
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, COLOR, FONT_HAND, SCREEN, TAPE_GREEN, TAPE_SKY,
} from '../design';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface HomeScreenProps {
  onTabChange: (tab: Tab) => void;
  onRecord: () => void;
  onWrapUp: () => void;
}

/** 별이 박힌 남색 테이프 — 타임라인 세로줄 */
const STAR_TAPE: React.CSSProperties = {
  position: 'absolute', left: 30, top: 4, bottom: 4, width: 18, borderRadius: 2,
  backgroundColor: COLOR.navy,
  backgroundImage: 'radial-gradient(circle at 30% 20%, #FFF6C9 1.6px, transparent 2px), radial-gradient(circle at 70% 60%, #FFFFFF 1.2px, transparent 1.6px), radial-gradient(circle at 45% 85%, #FFE27A 1.8px, transparent 2.2px)',
  backgroundSize: '18px 46px',
  opacity: 0.92,
  pointerEvents: 'none',
};

function recordLabel(record: MyRecord): string {
  if (record.caption) return record.caption;
  if (record.type === 'text') return record.content;
  return `${TYPE_LABELS[record.type]} 기록`;
}

function RecordThumb({ record }: { record: MyRecord }) {
  const mediaSrc = useMediaSrc(record);
  const isVisual = record.type === 'photo' || record.type === 'meme' || record.type === 'video';
  const thumb = record.type === 'video'
    ? (record.content.startsWith('data:') ? record.content : null)
    : mediaSrc;

  if (isVisual) {
    return (
      <div style={{ position: 'relative', flexShrink: 0, width: 76, height: 85, boxSizing: 'border-box', background: COLOR.white, padding: '5px 5px 14px', border: `1px solid ${COLOR.dash}`, transform: 'rotate(-2deg)' }}>
        <div style={{ width: 64, height: 64, background: COLOR.beige, overflow: 'hidden', position: 'relative' }}>
          {thumb && <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          {record.type === 'video' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}><path d="M7 4.5v15l12.5-7.5z" /></svg>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: 76, height: 85, boxSizing: 'border-box', flexShrink: 0, ...CARD, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: record.type === 'text' ? '#FFF6C9' : COLOR.white }}>
      {record.type === 'audio' ? (
        <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 3, height: 26 }}>
          {[10, 20, 14, 24, 12].map((h, i) => <span key={i} style={{ width: 3, height: h, borderRadius: 2, background: COLOR.ink }} />)}
        </span>
      ) : (
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLOR.ink} strokeWidth="2" strokeLinecap="round"><path d="M5 7h14M5 12h14M5 17h9" /></svg>
      )}
    </div>
  );
}

function TimelineRow({ record, index }: { record: MyRecord; index: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', padding: '8px 0' }}>
      <span style={{ ...TAPE_SKY(index % 2 === 0 ? -3 : 2, 17), alignSelf: 'center', width: 62, textAlign: 'center', boxSizing: 'border-box', flexShrink: 0, zIndex: 1 }}>
        {record.slotTime}
      </span>
      <RecordThumb record={record} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {recordLabel(record)}
        </div>
        <div style={{ fontSize: 12, color: COLOR.inkMuted, marginTop: 2 }}>{TYPE_LABELS[record.type]}</div>
      </div>
    </div>
  );
}

function EmptyState({ onRecord, nextSlotText }: { onRecord: () => void; nextSlotText: string | null }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 6px' }}>
      <div style={{ width: '100%', maxWidth: 290, ...CARD, borderRadius: 4, overflow: 'hidden', transform: 'rotate(-1.5deg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#8EC5F0', borderBottom: `1.5px solid ${COLOR.ink}`, padding: '5px 10px' }}>
          <span style={{ fontFamily: FONT_HAND, fontWeight: 700, fontSize: 16, color: COLOR.skyInk }}>hakku.exe</span>
          <span aria-hidden="true" style={{ width: 14, height: 14, border: `1.5px solid ${COLOR.ink}`, background: COLOR.white, fontSize: 10, lineHeight: '12px', textAlign: 'center', fontWeight: 700 }}>×</span>
        </div>
        <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.45, textAlign: 'center' }}>오늘의 첫 기록을<br />남겨볼까요?</div>
          <button type="button" onClick={onRecord} style={{ ...BUTTON_SECONDARY, minHeight: 44, padding: '0 28px', fontSize: 15, background: COLOR.yellow }}>
            기록하기
          </button>
        </div>
      </div>
      {nextSlotText && (
        <div style={{ fontSize: 13, color: COLOR.inkMuted, textAlign: 'center' }}>{nextSlotText}</div>
      )}
    </div>
  );
}

function HomeDay({ onRecord, onWrapUp }: { onRecord: () => void; onWrapUp: () => void }) {
  const { records, settings, slots, isWrapped } = useApp();
  const sessionDate = getSessionDate(settings.startTime);
  const { dateWeekday } = getDateStrings(sessionDate);
  const [, month, day] = sessionDate.split('-').map(Number);
  const sorted = [...records].sort((a, b) => a.createdAt - b.createdAt);

  // "다음 기록까지 N분"이 멈춰 있지 않게 1분마다 다시 그린다
  const [, setMinuteTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setMinuteTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const nextSlot = isWrapped ? null : getNextSlot(slots, settings.startTime);
  const nextSlotText = nextSlot
    ? `다음 기록까지 ${formatTime(minutesUntilSlot(nextSlot, settings.startTime))} · ${nextSlot}`
    : null;

  return (
    <div style={{ flex: 1, padding: '58px 22px 0', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={TAPE_GREEN()}>오늘의 하꾸</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: FONT_HAND, fontWeight: 700, fontSize: 60, lineHeight: 1, color: COLOR.red, letterSpacing: '-1px' }}>
              {month}·{day}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: COLOR.navy }}>{dateWeekday}</span>
          </div>
        </div>
        <div style={{ ...CARD, borderRadius: 14, padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: COLOR.inkMuted }}>기록</span>
          <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: COLOR.red }}>{records.length}</span>
        </div>
      </div>

      {sorted.length === 0 ? (
        isWrapped ? <div style={{ flex: 1 }} /> : <EmptyState onRecord={onRecord} nextSlotText={nextSlotText} />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ position: 'relative', padding: '6px 0' }}>
            <div aria-hidden="true" style={STAR_TAPE} />
            {sorted.map((record, i) => <TimelineRow key={record.id} record={record} index={i} />)}
          </div>
          {nextSlotText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 8px 74px', minHeight: 40, padding: '0 14px', border: '1.5px dashed #8EA7C9', borderRadius: 12, background: 'rgba(255,255,255,0.7)', fontSize: 13, color: '#3B557A', alignSelf: 'flex-start', width: 'fit-content' }}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /></svg>
              {nextSlotText}
            </div>
          )}
        </div>
      )}

      {/* 마감한 하루는 더 기록할 수 없다 — 같은 날짜로 아카이브 항목이 두 개 생기던 원인이다 */}
      {isWrapped ? (
        <div style={{ padding: '8px 0 12px' }}>
          <div style={{ minHeight: 52, borderRadius: 16, border: `1.5px dashed ${COLOR.dash}`, color: COLOR.inkSub, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)' }}>
            오늘은 마감했어요 · 내일 다시 만나요
          </div>
        </div>
      ) : (
        <div style={{ padding: '8px 0 12px', display: 'flex', gap: 10 }}>
          <button data-modal-trigger="record" onClick={onRecord} style={{ ...BUTTON_SECONDARY, flex: 1 }}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            기록하기
          </button>
          <button data-modal-trigger="wrapup" onClick={onWrapUp} style={{ ...BUTTON_PRIMARY, flex: 1.4 }}>
            하루 마감하기
          </button>
        </div>
      )}
    </div>
  );
}

export default function HomeScreen({ onTabChange, onRecord, onWrapUp }: HomeScreenProps) {
  return (
    <div style={SCREEN}>
      <HomeDay onRecord={onRecord} onWrapUp={onWrapUp} />
      <TabBar active="home" onTabChange={onTabChange} />
    </div>
  );
}
