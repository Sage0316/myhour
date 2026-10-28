import { useEffect, useState } from 'react';
import { useApp } from '../appContext';
import {
  formatTime, getDateStrings, getNextSlot, getSessionDate, minutesUntilSlot, TYPE_LABELS,
} from '../store';
import type { MyRecord } from '../store';
import TabBar from '../components/TabBar';
import { useMediaSrc } from '../useMediaSrc';
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, COLOR, FONT_HAND, SCREEN, TAPE_GREEN, TAPE_SKY,
} from '../design';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface HomeScreenProps {
  onTabChange: (tab: Tab) => void;
  onRecord: () => void;
  onWrapUp: () => void;
}

/** 별이 박힌 남색 테이프 — 타임라인 세로줄 */
const STAR_TAPE: React.CSSProperties = {
  position: 'absolute', left: 32, top: 0, bottom: 0, width: 22, borderRadius: 2,
  backgroundColor: COLOR.navy,
  backgroundImage: 'radial-gradient(circle at 30% 20%, #FFF6C9 1.6px, transparent 2px), radial-gradient(circle at 70% 60%, #FFFFFF 1.2px, transparent 1.6px), radial-gradient(circle at 45% 85%, #FFE27A 1.8px, transparent 2.2px)',
  backgroundSize: '22px 46px',
  opacity: 0.92,
  pointerEvents: 'none',
};

// 줄마다 번갈아 쓰는 기울기·종이 테이프·형광펜 색 — 다이어리에 손으로 붙인 느낌
const ROW_TILT = [-3, 2.5, -2, 3];
const PHOTO_TAPE = ['rgba(240,170,170,0.7)', 'rgba(184,214,120,0.75)'];
const UNDERLINE = ['rgba(255,214,90,0.8)', 'rgba(132,190,236,0.8)'];

const STAR_PATH = 'M12 2.5l2.6 6 6.4.6-4.9 4.2 1.5 6.3L12 16.3 6.4 19.6l1.5-6.3L3 9.1l6.4-.6z';

function Doodle({ kind, size, style }: { kind: 'star' | 'pinkStar' | 'heart' | 'wave'; size: number; style: React.CSSProperties }) {
  if (kind === 'wave') {
    return (
      <svg aria-hidden="true" width={size} height={size / 3} viewBox="0 0 60 20" style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
        <path d="M2 10c6-8 10 8 16 0s10 8 16 0 10 8 16 0 6 4 8 2" fill="none" stroke="#5E7D2E" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  const d = kind === 'heart' ? 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' : STAR_PATH;
  const fill = kind === 'star' ? '#FFD25A' : '#F4A6A6';
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
      <path d={d} fill={fill} stroke={COLOR.ink} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function recordTitle(record: MyRecord): string {
  if (record.caption) return record.caption;
  return `${TYPE_LABELS[record.type]} 기록`;
}

/** 사진·영상·음성 — 테이프로 붙인 폴라로이드 */
function Polaroid({ record, index }: { record: MyRecord; index: number }) {
  const mediaSrc = useMediaSrc(record);
  const thumb = record.type === 'video'
    ? (record.content.startsWith('data:') ? record.content : null)
    : mediaSrc;

  return (
    <div style={{ position: 'relative', flexShrink: 0, background: COLOR.white, padding: '7px 7px 22px', boxShadow: '0 2px 6px rgba(43,38,34,0.18)', transform: `rotate(${ROW_TILT[index % ROW_TILT.length]}deg)` }}>
      <div aria-hidden="true" style={{ position: 'absolute', top: -9, left: 22, width: 46, height: 16, background: PHOTO_TAPE[Math.floor(index / 2) % 2], transform: `rotate(${index % 2 ? 4 : -6}deg)`, zIndex: 1 }} />
      <div style={{ width: 92, height: 92, background: COLOR.beige, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {record.type === 'audio' ? (
          <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 3, height: 34 }}>
            {[12, 24, 16, 30, 14, 22].map((h, i) => <span key={i} style={{ width: 3, height: h, borderRadius: 2, background: COLOR.ink }} />)}
          </span>
        ) : thumb ? (
          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : null}
        {record.type === 'video' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 30, height: 30, borderRadius: 15, background: COLOR.white, border: `1.5px solid ${COLOR.ink}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill={COLOR.navy}><path d="M7 4.5v15l12.5-7.5z" /></svg>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineRow({ record, index }: { record: MyRecord; index: number }) {
  const tilt = index % 2 ? 3 : -4;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative', paddingLeft: 88, minHeight: 60 }}>
      <span style={{ ...TAPE_SKY(tilt, 18), position: 'absolute', left: 12, top: 18, padding: '3px 9px', zIndex: 2 }}>{record.slotTime}</span>
      {record.type === 'text' ? (
        <div style={{ background: '#FFF6C9', border: `1.5px solid ${COLOR.ink}`, borderRadius: 18, padding: '10px 14px', transform: 'rotate(-1.5deg)', maxWidth: 220, marginTop: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>{record.content}</span>
        </div>
      ) : (
        <>
          <Polaroid record={record} index={index} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2, borderBottom: `3px solid ${UNDERLINE[index % 2]}`, alignSelf: 'flex-start' }}>
              {recordTitle(record)}
            </span>
            <span style={{ fontSize: 13, color: COLOR.inkMuted }}>{TYPE_LABELS[record.type]}</span>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ onRecord, nextSlot }: { onRecord: () => void; nextSlot: string | null }) {
  const [later, setLater] = useState(false);
  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '0 6px' }}>
      {!later && (
        <div style={{ width: 290, maxWidth: '100%', background: COLOR.white, border: `2px solid ${COLOR.ink}`, transform: 'rotate(-2deg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#8EC5F0', borderBottom: `2px solid ${COLOR.ink}`, padding: '5px 10px' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: COLOR.skyInk }}>hakku.exe</span>
            <span aria-hidden="true" style={{ width: 16, height: 16, boxSizing: 'border-box', border: `2px solid ${COLOR.ink}`, background: COLOR.white, fontSize: 11, lineHeight: '12px', textAlign: 'center', fontWeight: 700 }}>×</span>
          </div>
          <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.45, textAlign: 'center' }}>오늘의 첫 기록을<br />남겨볼까요?</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" data-modal-trigger="record" onClick={onRecord} aria-label="첫 기록 남기기" style={{ minWidth: 88, minHeight: 44, border: `2px solid ${COLOR.ink}`, background: COLOR.yellow, fontWeight: 700, fontSize: 15, color: COLOR.ink, cursor: 'pointer', fontFamily: 'inherit' }}>YES!</button>
              <button type="button" onClick={() => setLater(true)} style={{ minWidth: 88, minHeight: 44, border: `2px solid ${COLOR.ink}`, background: COLOR.white, fontSize: 15, color: COLOR.ink, cursor: 'pointer', fontFamily: 'inherit' }}>이따가</button>
            </div>
          </div>
        </div>
      )}

      {nextSlot && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transform: 'rotate(1.5deg)' }}>
          <span style={{ ...TAPE_SKY(0, 18), alignSelf: 'center', padding: '3px 12px' }}>다음 기록 시간 · {nextSlot}</span>
          <span style={{ fontSize: 14, color: COLOR.inkSub }}>알림이 오면 사진 한 장, 한 줄이면 충분해</span>
        </div>
      )}

      {later && (
        <button type="button" data-modal-trigger="record" onClick={onRecord} style={{ ...BUTTON_SECONDARY, padding: '0 24px' }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          지금 기록하기
        </button>
      )}

      <Doodle kind="star" size={40} style={{ left: 8, top: 20, transform: 'rotate(-12deg)' }} />
      <Doodle kind="pinkStar" size={26} style={{ right: 18, top: 70, transform: 'rotate(16deg)' }} />
      <Doodle kind="heart" size={30} style={{ right: 28, bottom: 50 }} />
      <Doodle kind="wave" size={60} style={{ left: 18, bottom: 70 }} />
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
  const untilNext = nextSlot ? formatTime(minutesUntilSlot(nextSlot, settings.startTime)) : null;
  const isEmpty = sorted.length === 0 && !isWrapped;

  return (
    <div style={{ flex: 1, padding: '52px 22px 0', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={TAPE_GREEN()}>오늘의 하꾸</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: FONT_HAND, fontWeight: 700, fontSize: 72, lineHeight: 1, color: COLOR.red, letterSpacing: '-1px' }}>
              {month}·{day}
            </span>
            <span style={{ fontSize: 17, fontWeight: 700, color: COLOR.navy }}>{dateWeekday}</span>
          </div>
        </div>
        {!isEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'rotate(6deg)', background: COLOR.white, border: `2px solid ${COLOR.ink}`, borderRadius: 14, padding: '6px 12px' }}>
            <span style={{ fontSize: 13, color: COLOR.inkSub }}>기록</span>
            <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: COLOR.red }}>{records.length}</span>
          </div>
        )}
      </div>

      {isEmpty ? (
        <EmptyState onRecord={onRecord} nextSlot={nextSlot} />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, position: 'relative' }}>
          <div style={{ position: 'relative', padding: '16px 0 8px', display: 'flex', flexDirection: 'column', gap: 22 }}>
            {sorted.length > 0 && <div aria-hidden="true" style={STAR_TAPE} />}
            {sorted.map((record, i) => <TimelineRow key={record.id} record={record} index={i} />)}
            {untilNext && (
              <div style={{ marginLeft: 88, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '8px 16px', boxSizing: 'border-box', border: '2px dashed #8EA7C9', borderRadius: 12, background: 'rgba(255,255,255,0.7)', fontSize: 15, color: '#3B557A' }}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M5 3 2 6" /><path d="m22 6-3-3" /></svg>
                다음 기록까지 {untilNext}
              </div>
            )}
          </div>
          {sorted.length > 0 && (
            <>
              <Doodle kind="star" size={34} style={{ right: 2, top: 22, transform: 'rotate(14deg)' }} />
              <Doodle kind="pinkStar" size={22} style={{ right: 30, top: 280, transform: 'rotate(-10deg)' }} />
            </>
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
      ) : !isEmpty && (
        <div style={{ padding: '8px 0 12px', display: 'flex', gap: 10 }}>
          <button data-modal-trigger="record" onClick={onRecord} style={{ ...BUTTON_SECONDARY, flex: 1 }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
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
