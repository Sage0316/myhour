import { useState } from 'react';
import { useApp } from '../appContext';
import { getDateStrings, getSessionDate, TYPE_LABELS } from '../store';
import type { MyRecord } from '../store';
import { useMediaSrc } from '../useMediaSrc';
import TabBar from '../components/TabBar';
import { useDialogFocus } from '../accessibility/useDialogFocus';
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, COLOR, SCREEN, TAPE_GREEN, TAPE_SKY, TITLE,
} from '../design';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface TodayScreenProps {
  onTabChange: (tab: Tab) => void;
  onWrapUp: () => void;
}

function AudioBars() {
  const heights = [12, 26, 18, 34, 20, 28, 14];
  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 4, height: 36 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ width: 4, height: h, borderRadius: 2, background: COLOR.ink }} />
      ))}
    </div>
  );
}

function RecordTile({ record, onDelete }: { record: MyRecord; onDelete: () => void }) {
  // 사진·짤 원본은 IDB에 있고, 영상은 content에 썸네일 data URL이 들어 있다
  const mediaSrc = useMediaSrc(record);
  const thumbSrc = record.type === 'video'
    ? (record.content.startsWith('data:') ? record.content : null)
    : mediaSrc;
  const isVisual = record.type === 'photo' || record.type === 'meme' || record.type === 'video';

  return (
    <div
      data-testid={`record-${record.id}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <div style={{
        ...CARD, borderRadius: 14, width: '100%', aspectRatio: '3/4', boxSizing: 'border-box', overflow: 'hidden', position: 'relative',
        background: isVisual ? COLOR.beige : COLOR.white,
        display: 'flex', alignItems: record.type === 'text' ? 'flex-start' : 'center', justifyContent: record.type === 'text' ? 'flex-start' : 'center',
      }}>
        {isVisual && thumbSrc ? (
          <img src={thumbSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : record.type === 'text' ? (
          <div style={{ padding: '40px 14px 14px', fontSize: 14, lineHeight: 1.6, color: COLOR.ink, overflow: 'hidden', maxHeight: '100%', boxSizing: 'border-box', wordBreak: 'keep-all' }}>
            {record.content}
          </div>
        ) : record.type === 'audio' ? (
          <AudioBars />
        ) : null}

        {record.type === 'video' && thumbSrc && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: COLOR.white, border: `1.5px solid ${COLOR.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill={COLOR.navy}><path d="M7 4.5v15l12.5-7.5z" /></svg>
            </div>
          </div>
        )}

        <span style={{ ...TAPE_SKY(0, 15), position: 'absolute', top: 8, left: 8, padding: '0 7px' }}>{record.slotTime}</span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`${record.slotTime} ${TYPE_LABELS[record.type]} 기록 삭제`}
          style={{ position: 'absolute', top: 0, right: 0, width: 44, height: 44, border: 0, background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
        >
          <span style={{ width: 26, height: 26, borderRadius: 13, background: COLOR.white, border: `1.5px solid ${COLOR.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill={COLOR.ink}><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </span>
        </button>
      </div>

      <div style={{ paddingLeft: 2, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.caption
            ? record.caption
            : record.type === 'text'
              ? record.content
              : TYPE_LABELS[record.type] + ' 기록'}
        </div>
        <div style={{ fontSize: 11, color: COLOR.inkMuted, marginTop: 1 }}>{TYPE_LABELS[record.type]}</div>
      </div>
    </div>
  );
}

export default function TodayScreen({ onTabChange, onWrapUp }: TodayScreenProps) {
  const { records, deleteRecord, settings, isWrapped } = useApp();
  const sessionDate = getSessionDate(settings.startTime);
  const { dateShort, dateWeekday } = getDateStrings(sessionDate);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const deleteDialogRef = useDialogFocus<HTMLDivElement>(
    pendingDelete !== null,
    () => setPendingDelete(null),
  );
  const sortedRecords = [...records].sort(
    (left, right) => left.capturedAt.localeCompare(right.capturedAt),
  );

  function confirmDelete() {
    if (pendingDelete) { deleteRecord(pendingDelete); setPendingDelete(null); }
  }

  return (
    <div style={SCREEN}>
      <div style={{ padding: '58px 22px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={TAPE_GREEN()}>{dateShort} {dateWeekday}</span>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h1 style={TITLE}>오늘</h1>
          <span style={{ ...CARD, borderRadius: 12, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>
            {records.length}개
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 22px 0', minHeight: 0 }}>
        {sortedRecords.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 14, color: COLOR.inkMuted, textAlign: 'center', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {isWrapped ? '오늘은 마감했어요.\n아카이브에서 영상을 볼 수 있어요.' : '아직 기록이 없어요'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px 12px' }}>
            {sortedRecords.map(record => (
              <RecordTile key={record.id} record={record} onDelete={() => setPendingDelete(record.id)} />
            ))}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      {records.length > 0 && !isWrapped && (
        <div style={{ padding: '10px 22px 12px' }}>
          <button data-modal-trigger="wrapup" onClick={onWrapUp} style={{ ...BUTTON_PRIMARY, width: '100%' }}>
            하루 마감하고 영상 만들기
          </button>
        </div>
      )}

      <TabBar active="today" onTabChange={onTabChange} />

      {pendingDelete && (
        <div
          role="presentation"
          style={{ position: 'fixed', inset: 0, background: 'rgba(43,38,34,0.38)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setPendingDelete(null)}
        >
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-record-title"
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', background: COLOR.paper, borderRadius: '24px 24px 0 0', borderTop: `1.5px solid ${COLOR.ink}`, padding: '24px 22px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div id="delete-record-title" style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>이 기록을 삭제할까요?</div>
            <button onClick={confirmDelete} style={{ ...BUTTON_PRIMARY, width: '100%' }}>
              삭제하기
            </button>
            <button onClick={() => setPendingDelete(null)} style={{ ...BUTTON_SECONDARY, width: '100%' }}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
