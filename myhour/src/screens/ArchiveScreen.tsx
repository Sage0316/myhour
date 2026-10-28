import { useEffect, useMemo, useState } from 'react';
import { loadArchive, guessMood, generateTitle, TYPE_COLORS, TYPE_LABELS, hasMedia, loadVideoFromIDB, loadVideoBlobFromIDB, archiveVideoKey, removeFromArchive, deleteVideoFromIDB, sweepArchive, needsTrimNotice, daysUntilTrim, getSessionDate, loadSettings } from '../store';
import type { MyRecord, ArchiveEntry } from '../store';
import { useMediaSrc } from '../useMediaSrc';
import TabBar from '../components/TabBar';
import { useDialogFocus } from '../accessibility/useDialogFocus';
import { shareFileNative } from '../native/shareFile';
import { canShareToReels, shareToReels } from '../native/instagramReels';
import { isNativeApp } from '../notifications/localReminders';
import {
  BUTTON_PRIMARY, CARD, COLOR, FONT_BODY, PILL_BUTTON, SCREEN, TAPE_GREEN, TITLE, tape, topPad,
} from '../design';

// 화면용 바탕색. TYPE_COLORS는 영상 렌더링에도 쓰이므로 여기서만 종이 톤으로 바꾼다.
const THUMB_BG: Record<MyRecord['type'], string> = {
  photo: COLOR.beige, meme: COLOR.beige, video: COLOR.beige, text: COLOR.white, audio: COLOR.white,
};
const TAPE_COLORS: [string, string][] = [
  [COLOR.sky, COLOR.skyInk], ['#F2B6B4', '#6A1F1F'], [COLOR.green, COLOR.greenInk],
];

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface ArchiveScreenProps {
  /** 아카이브 항목으로 영상 만들기 — 마감 화면을 그 항목 모드로 연다 */
  onMakeVideo: (entry: ArchiveEntry) => void;
  onTabChange: (tab: Tab) => void;
  initialArchiveId?: string | null;
}


function dateLabel(iso: string) {
  const [, m, d] = iso.split('-');
  return `${Number(m)}.${Number(d)}`;
}

function monthLabel(iso: string) {
  const [y, m] = iso.split('-');
  return `${y}.${Number(m)}`;
}

function RecordThumb({ record }: { record: MyRecord }) {
  const bg = THUMB_BG[record.type];
  // 원본은 IDB(mediaId)이거나 구버전 기록의 content data URL이다 — 두 경로 다 훅이 처리한다
  const mediaSrc = useMediaSrc(record);

  if ((record.type === 'photo' || record.type === 'meme') && mediaSrc) {
    return (
      <img
        src={mediaSrc}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    );
  }
  if (record.type === 'video' && record.content.startsWith('data:')) {
    return (
      <>
        <img src={record.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(1px)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: COLOR.white, border: `1.5px solid ${COLOR.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill={COLOR.navy}><path d="M7 4.5v15l12.5-7.5z" /></svg>
          </div>
        </div>
      </>
    );
  }
  if (record.type === 'text') {
    return (
      <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, boxSizing: 'border-box' }}>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: COLOR.ink, textAlign: 'center', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
          {record.content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      {[10, 22, 14, 30, 18, 26, 12, 28, 16, 20].map((h, i) => (
        <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: COLOR.ink }} />
      ))}
    </div>
  );
}

function VideoFullscreen({ url, blob, filename, onClose }: { url: string; blob: Blob | null; filename: string; onClose: () => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);
  // iOS는 영상 프레임을 길게 누르면 화면에 박힌 글자를 Live Text로 선택해버려서 저장을 방해한다
  const noCallout: React.CSSProperties = { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' };
  // 앱: [인스타 릴스] + [저장·공유](공유 시트 — 사진 저장, 스레드, X 등) / 웹: [다운로드]
  const native = isNativeApp();
  const actionStyle: React.CSSProperties = {
    ...PILL_BUTTON, minHeight: 44, padding: '0 18px', fontSize: 14,
    cursor: blob ? 'pointer' : 'default', opacity: blob ? 1 : 0.5,
    ...noCallout,
  };

  // mp4로 만든 뒤엔 navigator.share(files)가 iOS에서 한 번에 시스템 공유 시트(동영상 저장 포함)를
  // 띄워준다 — 이전엔 webm이라 공유 자체가 안 되는 형식이었던 게 진짜 원인이었다.
  // blob은 미리 들고 있어야 한다: share() 앞에 await가 하나라도 끼면 iOS가 제스처 신뢰를 잃는다.
  // 인스타 릴스: 영상을 담은 채로 릴스 편집 화면을 바로 연다 (앱 전용)
  function handleReels(e: React.MouseEvent) {
    e.stopPropagation();
    if (!blob) return;
    shareToReels(blob).catch(error => alert(error instanceof Error ? error.message : '인스타그램을 열지 못했어요.'));
  }

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (!blob) return;
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    if (isNativeApp()) {
      // iOS 앱: 공유 시트의 "동영상 저장"으로 사진 앱에 넣는다
      shareFileNative(blob, `${filename}.${ext}`).catch(() => alert('영상을 저장하지 못했어요. 다시 시도해 주세요.'));
      return;
    }
    const file = new File([blob], `${filename}.${ext}`, { type: blob.type || 'video/mp4' });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file] }).catch(() => { /* 공유 시트 취소 등 — 조용히 무시 */ });
      return;
    }
    // 공유가 막힌 환경(데스크톱 브라우저 등)에서는 파일 저장으로 대체
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${ext}`;
    link.click();
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="생성된 하루 영상"
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <video
        src={url}
        controls
        autoPlay
        playsInline
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', ...noCallout }}
        onClick={e => e.stopPropagation()}
      />
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: 20, display: 'flex', gap: 8 }}>
        {native && canShareToReels() && (
          <button
            onClick={handleReels}
            disabled={!blob}
            aria-label="인스타 릴스로 공유"
            style={{ ...actionStyle, background: COLOR.yellow }}
          >인스타 릴스</button>
        )}
        <button
          onClick={handleSave}
          disabled={!blob}
          aria-label={native ? '저장하거나 다른 앱으로 공유' : '영상 다운로드'}
          style={actionStyle}
        >{native ? '저장·공유' : '다운로드'}</button>
      </div>
      <button
        onClick={onClose}
        aria-label="영상 닫기"
        style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 20,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff', fontSize: 16, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', lineHeight: 1,
        }}
      >✕</button>
    </div>
  );
}

// 아카이브 항목의 개별 기록을 열람하는 시트 — 영상이 만들어져도 원본 기록은 남는다
function DetailRow({ record }: { record: MyRecord }) {
  // 사진·짤·음성 원본은 훅이 IDB와 구버전 data URL 둘 다 처리한다
  const mediaSrc = useMediaSrc(record);
  // 영상 클립만 별도 — 썸네일(content)과 원본(mediaId/videoKey)이 따로 있다
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  useEffect(() => {
    if (record.type !== 'video') return;
    const mediaKey = record.mediaId ?? record.videoKey;
    if (!mediaKey) return;
    let active = true;
    let createdUrl: string | null = null;
    loadVideoFromIDB(mediaKey).then(url => {
      if (!active) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      createdUrl = url;
      setClipUrl(url);
    });
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [record]);

  return (
    <div style={{ ...CARD, borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...tape(COLOR.sky, COLOR.skyInk, 0, 15), padding: '0 7px' }}>{record.slotTime}</span>
        <span style={{ fontSize: 12, color: COLOR.inkMuted }}>{TYPE_LABELS[record.type]}</span>
      </div>
      {record.type === 'text' && (
        <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{record.content}</div>
      )}
      {(record.type === 'photo' || record.type === 'meme') && (
        mediaSrc
          ? <img src={mediaSrc} alt={record.caption ?? `${record.slotTime} 사진 기록`} style={{ width: '100%', borderRadius: 10, display: 'block' }} />
          : <div style={{ fontSize: 12, color: COLOR.inkMuted }}>미디어를 불러오지 못했어요</div>
      )}
      {record.type === 'audio' && (
        mediaSrc
          ? <audio src={mediaSrc} controls style={{ width: '100%', height: 36 }} />
          : <div style={{ fontSize: 12, color: COLOR.inkMuted }}>미디어를 불러오지 못했어요</div>
      )}
      {record.type === 'video' && (
        clipUrl
          ? <video src={clipUrl} controls playsInline style={{ width: '100%', borderRadius: 10, display: 'block' }} />
          : record.content.startsWith('data:')
            ? <img src={record.content} alt="" style={{ width: '100%', borderRadius: 10, display: 'block', opacity: 0.7 }} />
            : <div style={{ fontSize: 12, color: COLOR.inkMuted }}>미디어를 불러오지 못했어요</div>
      )}
      {record.caption && (
        <div style={{ fontSize: 13, color: COLOR.inkSub }}>{record.caption}</div>
      )}
    </div>
  );
}

function DayDetailSheet({ entry, onClose }: { entry: ArchiveEntry; onClose: () => void }) {
  const sorted = [...entry.records].sort((a, b) => a.createdAt - b.createdAt);
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${dateLabel(entry.date)}의 기록`}
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, background: 'rgba(43,38,34,0.38)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', background: COLOR.paper, borderTop: `1.5px solid ${COLOR.ink}`, borderRadius: '24px 24px 0 0', maxHeight: '82vh', display: 'flex', flexDirection: 'column', fontFamily: FONT_BODY, color: COLOR.ink }}
      >
        <div style={{ padding: '14px 20px 12px', borderBottom: `1.5px dashed ${COLOR.dash}`, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLOR.dash, margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{dateLabel(entry.date)}의 기록</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, color: COLOR.inkMuted }}>{entry.records.length}개</div>
              <button type="button" onClick={onClose} aria-label="기록 상세 닫기" style={{ width: 44, height: 44, marginRight: -10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLOR.ink} strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '12px 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(r => <DetailRow key={r.id} record={r} />)}
        </div>
      </div>
    </div>
  );
}

function ArchiveCard({ entry, onDelete, onMakeVideo, initialOpen = false }: { entry: ArchiveEntry; onDelete: () => void; onMakeVideo: (entry: ArchiveEntry) => void; initialOpen?: boolean }) {
  const mood = guessMood(entry.records);
  // 영상에 실제로 들어간 제목을 우선 — 없으면(구버전 항목) 기록에서 만들어 쓴다
  const title = entry.title?.trim() || generateTitle(entry.records);
  const [genState, setGenState] = useState<'idle' | 'generating' | 'done'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    // blob까지 들고 있어야 다운로드(공유) 버튼이 await 없이 바로 share()를 부를 수 있다
    loadVideoBlobFromIDB(archiveVideoKey(entry)).then(blob => {
      if (blob) {
        setVideoUrl(URL.createObjectURL(blob));
        setVideoBlob(blob);
        setGenState('done');
        // 하루 마감 직후에는 기록 상세가 아니라 방금 만든 영상을 바로 보여준다.
        if (initialOpen) setFullscreen(true);
      } else if (initialOpen) {
        // 영상 없이 마감한 날의 딥 링크만 기록 상세를 연다.
        setShowDetail(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, entry.date, initialOpen]);

  // 남은 날짜는 카드가 그려질 때 계산한다. 자정을 넘겨 앱을 켜둬도 다음 렌더에서 갱신된다.
  const trimNotice = (() => {
    if (!needsTrimNotice(entry)) return null;
    const left = daysUntilTrim(entry, getSessionDate(loadSettings().startTime));
    if (left <= 0) return { text: '사진과 음성이 곧 정리돼요. 남기려면 오늘 영상으로 만들어 주세요.', urgent: true };
    if (left === 1) return { text: '내일이면 사진과 음성이 정리돼요.', urgent: true };
    return { text: `${left}일 뒤 사진과 음성이 정리돼요. 글은 남아요.`, urgent: false };
  })();

  const lead = entry.records.find(r => (r.type === 'photo' || r.type === 'meme') && hasMedia(r))
    ?? entry.records.find(r => r.type === 'video' && hasMedia(r))
    ?? entry.records.find(r => r.type === 'text')
    ?? entry.records[0];

  const fallbackBg = lead ? THUMB_BG[lead.type] : COLOR.beige;
  const [tapeBg, tapeInk] = TAPE_COLORS[Number(entry.date.slice(-2)) % TAPE_COLORS.length];

  return (
    <>
      {fullscreen && videoUrl && (
        <VideoFullscreen url={videoUrl} blob={videoBlob} filename={`하꾸-${entry.date}`} onClose={() => setFullscreen(false)} />
      )}
      {showDetail && (
        <DayDetailSheet entry={entry} onClose={() => setShowDetail(false)} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div style={{ position: 'relative', background: COLOR.white, border: `1.5px solid ${COLOR.ink}`, borderRadius: 6, padding: '6px 6px 8px', transform: `rotate(${Number(entry.date.slice(-2)) % 2 ? 1.5 : -1.5}deg)` }}>
        <span style={{ ...tape(tapeBg, tapeInk, -3, 16), position: 'absolute', top: -12, left: 12, zIndex: 2, padding: '0 9px' }}>{entry.date.slice(5).replace('-', '.')}</span>
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '3/4',
          overflow: 'hidden',
          background: fallbackBg,
        }}>
          {lead ? <RecordThumb record={lead} /> : (
            <div style={{ width: '100%', height: '100%', background: fallbackBg }} />
          )}

          <div style={{
            position: 'absolute', bottom: 6, right: 6,
            background: COLOR.ink, borderRadius: 8,
            padding: '1px 7px', fontSize: 11, fontWeight: 700, color: COLOR.white,
          }}>
            {entry.records.length}
          </div>

          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            aria-label={`${dateLabel(entry.date)} 기록 삭제`}
            style={{
              position: 'absolute', top: 0, right: 0, width: 44, height: 44,
              background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0,
              alignItems: 'center', justifyContent: 'center', zIndex: 1,
            }}
          >
            <span style={{ width: 24, height: 24, borderRadius: 12, background: COLOR.white, border: `1.5px solid ${COLOR.ink}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={COLOR.ink} strokeWidth="3.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </span>
          </button>

          {entry.records.length > 1 && (
            <div style={{ position: 'absolute', bottom: 6, left: 6, display: 'flex', gap: 3 }}>
              {[...new Set(entry.records.map(r => r.type))].map(t => (
                <div key={t} style={{ width: 8, height: 8, borderRadius: 4, background: TYPE_COLORS[t], border: `1px solid ${COLOR.ink}` }} />
              ))}
            </div>
          )}

          {genState === 'done' && videoUrl && (
            <button
              type="button"
              aria-label="생성된 영상 전체 화면으로 보기"
              onClick={() => setFullscreen(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(31,58,107,0.22)', cursor: 'pointer' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 22, background: COLOR.white, border: `1.5px solid ${COLOR.ink}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={COLOR.navy}><path d="M7 4.5v15l12.5-7.5z" /></svg>
              </div>
            </button>
          )}

        </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            aria-label={`${dateLabel(entry.date)} 기록 보기`}
            style={{ width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FONT_BODY, color: COLOR.ink }}
          >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '1px 8px', borderRadius: 50, border: `1px solid ${COLOR.ink}`,
              background: mood.color, fontSize: 11, fontWeight: 600,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
              {mood.mood}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ fontSize: 12, color: COLOR.inkMuted, marginTop: 1 }}>
            {[...new Set(entry.records.map(r => TYPE_LABELS[r.type]))].join(' · ')}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: '#3B557A', marginTop: 3 }}>기록 보기 ›</div>
          </button>

          {/* 정리 예고. 푸시는 쓰지 않으므로 이 배지가 유일한 알림 수단이다 —
              앱을 열면 반드시 보이도록 버튼 바로 위에 둔다. */}
          {genState === 'idle' && trimNotice && (
            <div style={{
              marginTop: 8, padding: '6px 9px', borderRadius: 10,
              background: trimNotice.urgent ? COLOR.redSoft : COLOR.wash,
              color: trimNotice.urgent ? COLOR.redInk : COLOR.inkSub,
              fontSize: 11, lineHeight: 1.45, fontWeight: trimNotice.urgent ? 600 : 400,
            }}>
              {trimNotice.text}
            </div>
          )}

          {/* 영상이 아직 없는 항목에서만 보인다. 이미 만든 날은 버튼 자체가 없다 —
              한 날짜의 영상은 한 번만 만든다는 정책이라 "다시 만들기"는 두지 않는다. */}
          {genState === 'idle' && !entry.trimmed && (
            <button onClick={() => onMakeVideo(entry)} style={{
              ...BUTTON_PRIMARY, marginTop: 8, width: '100%', minHeight: 44, borderRadius: 12, fontSize: 13,
            }}>영상 만들기</button>
          )}

        </div>
      </div>
    </>
  );
}

export default function ArchiveScreen({ onTabChange, initialArchiveId, onMakeVideo }: ArchiveScreenProps) {
  const [entries, setEntries] = useState<ArchiveEntry[]>(() => { sweepArchive(); return loadArchive(); });

  function handleDelete(entry: ArchiveEntry) {
    if (!confirm('이 항목의 기록과 영상을 삭제할까요?\n삭제하면 되돌릴 수 없어요.')) return;
    removeFromArchive(entry);
    deleteVideoFromIDB(archiveVideoKey(entry));
    setEntries(loadArchive());
  }

  const months = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const e of entries) {
      const ml = monthLabel(e.date);
      if (!seen.has(ml)) { seen.add(ml); result.push(ml); }
    }
    return result;
  }, [entries]);

  const [activeMonth, setActiveMonth] = useState(months[0] ?? '');
  // 삭제로 달이 사라졌으면 첫 달로 이동
  useEffect(() => {
    if (activeMonth && !months.includes(activeMonth)) setActiveMonth(months[0] ?? '');
  }, [months, activeMonth]);
  const filtered = entries.filter(e => monthLabel(e.date) === activeMonth);

  if (entries.length === 0) {
    return (
      <div style={SCREEN}>
        <div style={{ padding: `${topPad(58)} 22px 12px`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={TAPE_GREEN()}>모아둔 하루</span>
          <h1 style={TITLE}>아카이브</h1>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', lineHeight: 1.7 }}>
            아직 저장된 하루가 없어요<br />
            <span style={{ fontSize: 13, fontWeight: 400, color: COLOR.inkMuted }}>하루를 마무리하면 여기에 쌓여요</span>
          </div>
        </div>
        <TabBar active="archive" onTabChange={onTabChange} />
      </div>
    );
  }

  return (
    <div style={SCREEN}>
      <div style={{ padding: `${topPad(58)} 22px 12px`, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={TAPE_GREEN()}>모아둔 하루</span>
        <h1 style={TITLE}>아카이브</h1>
        {months.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {months.map(m => (
              <button key={m} onClick={() => setActiveMonth(m)} style={{
                minHeight: 36, padding: '0 14px', borderRadius: 18,
                background: activeMonth === m ? COLOR.ink : COLOR.white,
                color: activeMonth === m ? COLOR.white : COLOR.ink,
                border: `1.5px solid ${COLOR.ink}`,
                fontSize: 13, fontWeight: activeMonth === m ? 700 : 400,
                cursor: 'pointer', fontFamily: FONT_BODY,
              }}>{m}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{
        flex: 1, overflow: 'auto', padding: '18px 22px 24px',
        display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        columnGap: 14, rowGap: 28, alignContent: 'start',
      }}>
        {filtered.map(entry => (
          <ArchiveCard key={entry.id} entry={entry} initialOpen={entry.id === initialArchiveId} onDelete={() => handleDelete(entry)} onMakeVideo={onMakeVideo} />
        ))}
      </div>

      <TabBar active="archive" onTabChange={onTabChange} />
    </div>
  );
}
