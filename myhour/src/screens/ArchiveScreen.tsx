import { useEffect, useMemo, useState } from 'react';
import { loadArchive, guessMood, generateTitle, TYPE_COLORS, TYPE_LABELS, loadVideoFromIDB, saveVideoToIDB } from '../store';
import type { MyRecord, ArchiveEntry } from '../store';
import { generateVideo } from '../videoGenerator';
import TabBar from '../components/TabBar';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface ArchiveScreenProps {
  onTabChange: (tab: Tab) => void;
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
  const hasMedia = record.content.startsWith('data:');

  if (record.type === 'photo' && hasMedia) {
    return (
      <img
        src={record.content}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    );
  }
  if (record.type === 'video' && hasMedia) {
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

function ArchiveCard({ entry }: { entry: ArchiveEntry }) {
  const mood = guessMood(entry.records);
  const title = generateTitle(entry.records);
  const [genState, setGenState] = useState<'idle' | 'generating' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    loadVideoFromIDB(`wrapped_${entry.date}`).then(url => {
      if (url) { setVideoUrl(url); setGenState('done'); }
    });
  }, [entry.date]);

  const lead = entry.records.find(r => r.type === 'photo' && r.content.startsWith('data:'))
    ?? entry.records.find(r => r.type === 'video' && r.content.startsWith('data:'))
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
      saveVideoToIDB(`wrapped_${entry.date}`, blob);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setGenState('done');
      setShowPlayer(true);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : '오류가 발생했어요');
      setGenState('idle');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {showPlayer && videoUrl ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
          <video
            src={videoUrl}
            controls
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
      ) : (
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

          {entry.records.length > 1 && (
            <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 3 }}>
              {[...new Set(entry.records.map(r => r.type))].map(t => (
                <div key={t} style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[t], border: '1px solid rgba(255,255,255,0.6)' }} />
              ))}
            </div>
          )}

          {/* Video exists overlay — show play icon */}
          {genState === 'done' && videoUrl && (
            <div
              onClick={() => setShowPlayer(true)}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.22)', cursor: 'pointer' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 0, height: 0, borderLeft: '13px solid #1A1A1A', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', marginLeft: 3 }} />
              </div>
            </div>
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
      )}

      <div>
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

        {genState === 'idle' && (
          <button onClick={handleGenerate} style={{
            marginTop: 8, width: '100%', padding: '8px 0', borderRadius: 10,
            background: '#1A1A1A', color: '#fff', border: 'none',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>영상 생성하기</button>
        )}

        {genState === 'done' && !showPlayer && (
          <button onClick={() => setShowPlayer(true)} style={{
            marginTop: 8, width: '100%', padding: '8px 0', borderRadius: 10,
            background: '#7C5CC4', color: '#fff', border: 'none',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>영상 보기 ▶</button>
        )}

        {genState === 'done' && showPlayer && (
          <a
            href={videoUrl ?? ''}
            download={`myhour-${entry.date}.webm`}
            style={{
              display: 'block', marginTop: 8, width: '100%', padding: '8px 0', borderRadius: 10,
              background: '#3FA37B', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box',
            }}
          >영상 저장하기 ↓</a>
        )}

        {genError && (
          <div style={{ marginTop: 6, fontSize: 10, color: '#E5533C', lineHeight: 1.4 }}>{genError}</div>
        )}
      </div>
    </div>
  );
}

export default function ArchiveScreen({ onTabChange }: ArchiveScreenProps) {
  const entries = useMemo(() => loadArchive(), []);

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
        {filtered.map(entry => <ArchiveCard key={entry.date} entry={entry} />)}
      </div>

      <TabBar active="archive" onTabChange={onTabChange} />
    </div>
  );
}
