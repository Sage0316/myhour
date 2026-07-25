import { useEffect, useMemo, useState } from 'react';
import { loadArchive, guessMood, generateTitle, TYPE_COLORS, TYPE_LABELS, hasMedia, loadVideoFromIDB, loadVideoBlobFromIDB, saveVideoToIDB, archiveVideoKey, removeFromArchive, deleteVideoFromIDB, sweepArchive, markArchiveGenerated } from '../store';
import type { MyRecord, ArchiveEntry } from '../store';
import { generateVideo } from '../videoGenerator';
import { useMediaSrc } from '../useMediaSrc';
import TabBar from '../components/TabBar';
import { useDialogFocus } from '../accessibility/useDialogFocus';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface ArchiveScreenProps {
  onTabChange: (tab: Tab) => void;
  initialArchiveId?: string | null;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

function dateLabel(iso: string) {
  const [, m, d] = iso.split('-');
  return `${Number(m)}.${Number(d)}`;
}

function monthLabel(iso: string) {
  const [y, m] = iso.split('-');
  return `${y}.${Number(m)}`;
}

function RecordThumb({ record }: { record: MyRecord }) {
  const bg = TYPE_COLORS[record.type];
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
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 0, borderLeft: '8px solid #1A1A1A', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 2 }} />
          </div>
        </div>
      </>
    );
  }
  if (record.type === 'text') {
    return (
      <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
        <div style={{ fontSize: 11, lineHeight: 1.5, color: 'rgba(26,26,26,0.75)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
          {record.content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      {[10, 22, 14, 30, 18, 26, 12, 28, 16, 20].map((h, i) => (
        <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: 'rgba(124,92,196,0.5)' }} />
      ))}
    </div>
  );
}

function VideoFullscreen({ url, blob, filename, onClose }: { url: string; blob: Blob | null; filename: string; onClose: () => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);
  // iOS는 영상 프레임을 길게 누르면 화면에 박힌 글자를 Live Text로 선택해버려서 저장을 방해한다
  const noCallout: React.CSSProperties = { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' };

  // mp4로 만든 뒤엔 navigator.share(files)가 iOS에서 한 번에 시스템 공유 시트(동영상 저장 포함)를
  // 띄워준다 — 이전엔 webm이라 공유 자체가 안 되는 형식이었던 게 진짜 원인이었다.
  // blob은 미리 들고 있어야 한다: share() 앞에 await가 하나라도 끼면 iOS가 제스처 신뢰를 잃는다.
  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (!blob) return;
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
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
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: 20 }}>
        <button
          onClick={handleSave}
          disabled={!blob}
          aria-label="영상 다운로드"
          style={{
            height: 40, padding: '0 16px', borderRadius: 50,
            background: 'rgba(255,255,255,0.9)', border: 'none',
            color: '#1A1A1A', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: blob ? 'pointer' : 'default', opacity: blob ? 1 : 0.5,
            fontFamily: 'Inter, sans-serif', ...noCallout,
          }}
        >다운로드</button>
      </div>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 20,
          width: 40, height: 40, borderRadius: '50%',
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
    <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.45)' }}>{record.slotTime}</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 50, background: TYPE_COLORS[record.type], color: 'rgba(26,26,26,0.65)' }}>{TYPE_LABELS[record.type]}</span>
      </div>
      {record.type === 'text' && (
        <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{record.content}</div>
      )}
      {(record.type === 'photo' || record.type === 'meme') && (
        mediaSrc
          ? <img src={mediaSrc} alt={record.caption ?? `${record.slotTime} 사진 기록`} style={{ width: '100%', borderRadius: 10, display: 'block' }} />
          : <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.4)' }}>미디어를 불러오지 못했어요</div>
      )}
      {record.type === 'audio' && (
        mediaSrc
          ? <audio src={mediaSrc} controls style={{ width: '100%', height: 36 }} />
          : <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.4)' }}>미디어를 불러오지 못했어요</div>
      )}
      {record.type === 'video' && (
        clipUrl
          ? <video src={clipUrl} controls playsInline style={{ width: '100%', borderRadius: 10, display: 'block' }} />
          : record.content.startsWith('data:')
            ? <img src={record.content} alt="" style={{ width: '100%', borderRadius: 10, display: 'block', opacity: 0.7 }} />
            : <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.4)' }}>미디어를 불러오지 못했어요</div>
      )}
      {record.caption && (
        <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.55)' }}>{record.caption}</div>
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', background: '#F7F7F5', borderRadius: '24px 24px 0 0', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid rgba(26,26,26,0.07)', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(26,26,26,0.15)', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{dateLabel(entry.date)}의 기록</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.4)' }}>{entry.records.length}개</div>
              <button type="button" onClick={onClose} aria-label="기록 상세 닫기" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(26,26,26,0.06)' }}>✕</button>
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

function ArchiveCard({ entry, onDelete, initialOpen = false }: { entry: ArchiveEntry; onDelete: () => void; initialOpen?: boolean }) {
  const mood = guessMood(entry.records);
  // 영상에 실제로 들어간 제목을 우선 — 없으면(구버전 항목) 기록에서 만들어 쓴다
  const title = entry.title?.trim() || generateTitle(entry.records);
  const [genState, setGenState] = useState<'idle' | 'generating' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showDetail, setShowDetail] = useState(initialOpen);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    // blob까지 들고 있어야 다운로드(공유) 버튼이 await 없이 바로 share()를 부를 수 있다
    loadVideoBlobFromIDB(archiveVideoKey(entry)).then(blob => {
      if (blob) { setVideoUrl(URL.createObjectURL(blob)); setVideoBlob(blob); setGenState('done'); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, entry.date]);

  const lead = entry.records.find(r => (r.type === 'photo' || r.type === 'meme') && hasMedia(r))
    ?? entry.records.find(r => r.type === 'video' && hasMedia(r))
    ?? entry.records.find(r => r.type === 'text')
    ?? entry.records[0];

  const fallbackBg = lead ? TYPE_COLORS[lead.type] : '#E2DBF0';

  async function handleGenerate() {
    setGenState('generating');
    setProgress(0);
    setGenError(null);
    try {
      const [, m, d] = entry.date.split('-');
      const dateStr = `${Number(m)}월 ${Number(d)}일`;
      const blob = await generateVideo(entry.records, dateStr, (pct) => setProgress(pct));
      await saveVideoToIDB(archiveVideoKey(entry), blob);
      markArchiveGenerated(entry);
      setVideoUrl(URL.createObjectURL(blob));
      setVideoBlob(blob);
      setGenState('done');
      setFullscreen(true);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : '오류가 발생했어요');
      setGenState('idle');
    }
  }

  return (
    <>
      {fullscreen && videoUrl && (
        <VideoFullscreen url={videoUrl} blob={videoBlob} filename={`하꾸-${entry.date}`} onClose={() => setFullscreen(false)} />
      )}
      {showDetail && (
        <DayDetailSheet entry={entry} onClose={() => setShowDetail(false)} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '3/4',
          borderRadius: 16, overflow: 'hidden',
          background: fallbackBg,
        }}>
          {lead ? <RecordThumb record={lead} /> : (
            <div style={{ width: '100%', height: '100%', background: fallbackBg }} />
          )}

          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.45)', borderRadius: 8,
            padding: '2px 7px', ...MONO as React.CSSProperties,
            fontSize: 10, color: '#fff',
          }}>
            {entry.records.length}
          </div>

          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute', top: 8, right: 8, width: 24, height: 24,
              borderRadius: '50%', background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.9)',
              fontSize: 11, border: 'none', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1,
            }}
          >✕</button>

          {entry.records.length > 1 && (
            <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 3 }}>
              {[...new Set(entry.records.map(r => r.type))].map(t => (
                <div key={t} style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[t], border: '1px solid rgba(255,255,255,0.6)' }} />
              ))}
            </div>
          )}

          {genState === 'done' && videoUrl && (
            <button
              type="button"
              aria-label="생성된 영상 전체 화면으로 보기"
              onClick={() => setFullscreen(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.22)', cursor: 'pointer' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 0, height: 0, borderLeft: '13px solid #1A1A1A', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', marginLeft: 3 }} />
              </div>
            </button>
          )}

          {genState === 'generating' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>생성 중... {Math.round(progress * 100)}%</div>
              <div style={{ width: '70%', height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: '#fff', borderRadius: 2, transition: 'width 0.1s' }} />
              </div>
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            aria-label={`${dateLabel(entry.date)} 기록 보기`}
            style={{ width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}
          >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ ...MONO, fontSize: 10, color: 'rgba(26,26,26,0.5)' }}>{dateLabel(entry.date)}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 50,
              background: mood.color, fontSize: 10, fontWeight: 500,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
              {mood.mood}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ fontSize: 11, color: 'rgba(26,26,26,0.4)', marginTop: 1 }}>
            {[...new Set(entry.records.map(r => TYPE_LABELS[r.type]))].join(' · ')}
          </div>

          <div style={{ fontSize: 10, color: 'rgba(26,26,26,0.35)', marginTop: 3 }}>기록 보기 ›</div>
          </button>

          {genState === 'idle' && !entry.trimmed && (
            <button onClick={handleGenerate} style={{
              marginTop: 8, width: '100%', padding: '8px 0', borderRadius: 10,
              background: '#1A1A1A', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>영상 생성하기</button>
          )}

          {genState === 'done' && (
            <button
              type="button"
              onClick={() => {
                // 구버전 항목(trimmed)은 원본이 이미 정리돼서, 다시 만들면 그 자리가 빈 카드로 나온다
                const msg = entry.trimmed
                  ? '영상을 다시 만들까요?\n사진·음성·영상 원본이 정리된 항목이라, 그 자리는 빈 카드로 나와요.'
                  : '영상을 다시 만들까요?';
                if (confirm(msg)) handleGenerate();
              }}
              style={{
                marginTop: 6, background: 'none', border: 'none', padding: 0,
                fontSize: 10, color: 'rgba(26,26,26,0.35)', textDecoration: 'underline',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >다시 만들기</button>
          )}

          {genError && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#E5533C', lineHeight: 1.4 }}>{genError}</div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ArchiveScreen({ onTabChange, initialArchiveId }: ArchiveScreenProps) {
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
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
        <div style={{ padding: '60px 22px 12px' }}>
          <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>Archive</div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.7px', marginTop: 7 }}>아카이브</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.45 }}>
          <div style={{ fontSize: 14, color: 'rgba(26,26,26,0.6)', textAlign: 'center', lineHeight: 1.8 }}>
            아직 저장된 하루가 없어요<br />
            <span style={{ fontSize: 12 }}>하루를 마무리하면 여기에 쌓여요</span>
          </div>
        </div>
        <TabBar active="archive" onTabChange={onTabChange} />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '60px 22px 12px' }}>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>Archive</div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.7px', marginTop: 7 }}>아카이브</div>
        {months.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {months.map(m => (
              <button key={m} onClick={() => setActiveMonth(m)} style={{
                padding: '7px 14px', borderRadius: 50,
                background: activeMonth === m ? '#1A1A1A' : '#FFFFFF',
                color: activeMonth === m ? '#FFFFFF' : '#1A1A1A',
                border: activeMonth === m ? 'none' : '1px solid rgba(26,26,26,0.15)',
                fontSize: 13, fontWeight: activeMonth === m ? 500 : 400,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>{m}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{
        flex: 1, overflow: 'auto', padding: '4px 22px 24px',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 14, alignContent: 'start',
      }}>
        {filtered.map(entry => (
          <ArchiveCard key={entry.id} entry={entry} initialOpen={entry.id === initialArchiveId} onDelete={() => handleDelete(entry)} />
        ))}
      </div>

      <TabBar active="archive" onTabChange={onTabChange} />
    </div>
  );
}
