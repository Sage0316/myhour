import { useMemo, useState } from 'react';
import { loadArchive, guessMood, generateTitle, TYPE_COLORS } from '../store';
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
          <div style={{ fontSize: 14, color: 'rgba(26,26,26,0.6)', textAlign: 'center', lineHeight: 1.6 }}>
            아직 저장된 하루가 없어요<br />
            <span style={{ fontSize: 12 }}>하루를 마감하거나 백업 파일을 가져오면<br />여기에 기록이 남아요</span>
          </div>
        </div>
        <TabBar active="archive" onTabChange={onTabChange} />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* Header */}
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

      {/* Grid */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '0 22px 24px',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 14, alignContent: 'start',
      }}>
        {filtered.map(entry => {
          const mood = guessMood(entry.records);
          const title = generateTitle(entry.records);
          const dominantColor = entry.records.length > 0
            ? TYPE_COLORS[entry.records[0].type]
            : '#E2DBF0';

          return (
            <div key={entry.date} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Thumbnail */}
              <div style={{
                position: 'relative', width: '100%', aspectRatio: '3/4',
                borderRadius: 16, overflow: 'hidden',
                background: `repeating-linear-gradient(135deg, rgba(26,26,26,0.06) 0 9px, rgba(26,26,26,0) 9px 18px), ${dominantColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 0, height: 0, borderLeft: '10px solid #1A1A1A', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 2 }} />
                </div>
                <div style={{ position: 'absolute', right: 9, bottom: 9, ...MONO as React.CSSProperties, fontSize: 9, color: 'rgba(26,26,26,0.55)' }}>
                  {entry.records.length}개
                </div>
              </div>
              {/* Meta */}
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
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 3 }}>{title}</div>
              </div>
            </div>
          );
        })}
      </div>

      <TabBar active="archive" onTabChange={onTabChange} />
    </div>
  );
}
