import { useState } from 'react';
import TabBar from '../components/TabBar';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface ArchiveScreenProps {
  onTabChange: (tab: Tab) => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

interface ArchiveItem {
  date: string;
  mood: string;
  moodColor: string;
  moodDot: string;
  title: string;
  bg: string;
  duration: string;
}

const months = ['2026.6', '2026.5', '2026.4'];

const archiveItems: ArchiveItem[] = [
  { date: '6.25', mood: '잔잔함', moodColor: '#CDEBDD', moodDot: '#3FA37B', title: '버스와 노을 사이', bg: '#D5EADC', duration: '0:52' },
  { date: '6.23', mood: '뿌듯함', moodColor: '#E7F0BE', moodDot: '#7FA02B', title: '마감 완료', bg: '#DDE9C2', duration: '0:51' },
  { date: '6.22', mood: '감성', moodColor: '#E4DBF5', moodDot: '#7C5CC4', title: '한강 산책', bg: '#E4DBF5', duration: '0:44' },
  { date: '6.21', mood: '웃김', moodColor: '#F6D7C6', moodDot: '#D9743F', title: '친구들과', bg: '#F6D7C6', duration: '0:37' },
  { date: '6.20', mood: '잔잔함', moodColor: '#CDEBDD', moodDot: '#3FA37B', title: '비 오는 하루', bg: '#CDEBDD', duration: '0:48' },
  { date: '6.19', mood: '정신없음', moodColor: '#FAD9E3', moodDot: '#C4567A', title: '야근의 기억', bg: '#FAD9E3', duration: '0:39' },
];

export default function ArchiveScreen({ onTabChange }: ArchiveScreenProps) {
  const [activeMonth, setActiveMonth] = useState('2026.6');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '60px 22px 12px' }}>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>Archive</div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.7px', marginTop: 7 }}>아카이브</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
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
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '0 22px',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 14, alignContent: 'start',
      }}>
        {archiveItems.map(item => (
          <div key={item.date} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Thumbnail */}
            <div style={{
              position: 'relative', width: '100%', aspectRatio: '3/4',
              borderRadius: 16, overflow: 'hidden',
              background: `repeating-linear-gradient(135deg, rgba(26,26,26,0.06) 0 9px, rgba(26,26,26,0) 9px 18px), ${item.bg}`,
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
                {item.duration}
              </div>
            </div>
            {/* Meta */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ ...MONO, fontSize: 10, color: 'rgba(26,26,26,0.5)' }}>{item.date}</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 50,
                  background: item.moodColor, fontSize: 10, fontWeight: 500,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: item.moodDot, display: 'inline-block' }} />
                  {item.mood}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 3 }}>{item.title}</div>
            </div>
          </div>
        ))}
      </div>

      <TabBar active="archive" onTabChange={onTabChange} />
    </div>
  );
}
