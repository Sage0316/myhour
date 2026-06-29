import { useState } from 'react';
import { useApp } from '../context';
import { TYPE_COLORS, MOOD_LIST, guessMood, generateTitle, generateClosing, getDateStrings } from '../store';
import type { MoodItem } from '../store';

interface WrapUpScreenProps {
  onClose: () => void;
  onSave: () => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const EMOJIS = ['😌', '🤪', '🥹', '😵', '😤'];

export default function WrapUpScreen({ onClose, onSave }: WrapUpScreenProps) {
  const { records } = useApp();
  const { dateShort } = getDateStrings();

  const autoMood = guessMood(records);
  const [selectedMood, setSelectedMood] = useState<MoodItem>(autoMood);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(0);
  const [calmness, setCalmness] = useState(72);

  const title = generateTitle(records);
  const closing = generateClosing(records);

  const clipColors = records.length > 0
    ? records.slice(0, 5).map(r => TYPE_COLORS[r.type])
    : ['#F0D9C8', '#D9EAD9', '#E4DBF5', '#F4ECD9', '#F0D9C8'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ flex: 1, padding: '58px 22px 0', display: 'flex', flexDirection: 'column', gap: 13, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>
            Wrap up · {dateShort}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(26,26,26,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ fontSize: 23, fontWeight: 600, letterSpacing: '-0.5px', lineHeight: 1.25 }}>
          오늘을 영상으로 정리했어요
        </div>

        <div>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.45)', marginBottom: 9 }}>
            Today's clips · {records.length || 5}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {clipColors.map((bg, i) => (
              <div key={i} style={{ width: 34, height: 46, borderRadius: 7, background: `repeating-linear-gradient(135deg, rgba(26,26,26,0.06) 0 5px, rgba(26,26,26,0) 5px 10px), ${bg}` }} />
            ))}
            <div style={{ color: 'rgba(26,26,26,0.35)', fontSize: 18, margin: '0 2px' }}>→</div>
            <div style={{ width: 34, height: 46, borderRadius: 7, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderLeft: '8px solid #fff', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 2 }} />
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 18, padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.45)' }}>오늘의 기록</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 50, background: selectedMood.color, fontSize: 12, fontWeight: 500 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: selectedMood.dot, display: 'inline-block' }} />
                {selectedMood.mood}
              </span>
              <span onClick={() => setShowMoodPicker(v => !v)} style={{ fontSize: 12, color: '#7C5CC4', textDecoration: 'underline', cursor: 'pointer' }}>바꾸기</span>
            </div>
          </div>

          {showMoodPicker && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MOOD_LIST.map(m => (
                <button key={m.mood} onClick={() => { setSelectedMood(m); setShowMoodPicker(false); }} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 50, background: m.color,
                  fontSize: 12, fontWeight: selectedMood.mood === m.mood ? 600 : 400,
                  border: selectedMood.mood === m.mood ? `2px solid ${m.dot}` : '2px solid transparent',
                  cursor: 'pointer',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, display: 'inline-block' }} />
                  {m.mood}
                </button>
              ))}
            </div>
          )}

          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.35 }}>{title}</div>
            <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.6)', marginTop: 7, lineHeight: 1.5 }}>"{closing}"</div>
          </div>

          <div style={{ height: 1, background: 'rgba(26,26,26,0.08)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.4)' }}>더 정확하게 · 선택</div>
            <div style={{ display: 'flex', gap: 7 }}>
              {EMOJIS.map((emoji, i) => (
                <button key={i} onClick={() => setSelectedEmoji(i)} style={{
                  flex: 1, height: 38, borderRadius: 11,
                  background: selectedEmoji === i ? '#F0F0EE' : '#FFFFFF',
                  border: selectedEmoji === i ? '1.5px solid #1A1A1A' : '1px solid rgba(26,26,26,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, cursor: 'pointer',
                  opacity: selectedEmoji === i ? 1 : 0.45,
                }}>{emoji}</button>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(26,26,26,0.55)' }}>
                <span>차분함</span><span style={MONO}>{calmness}</span>
              </div>
              <input type="range" min={0} max={100} value={calmness} onChange={e => setCalmness(Number(e.target.value))} style={{ width: '100%', marginTop: 8, accentColor: '#1A1A1A' }} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 80, position: 'relative', borderRadius: 20, overflow: 'hidden', background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 10px, rgba(255,255,255,0) 10px 20px), #1E2240', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 0, borderLeft: '13px solid #1E2240', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', marginLeft: 3 }} />
          </div>
          <div style={{ position: 'absolute', left: 14, top: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '1.2px', color: 'rgba(255,255,255,0.7)' }}>미리보기 · PREVIEW</div>
        </div>
      </div>

      <div style={{ padding: '12px 22px 30px', display: 'flex', gap: 9 }}>
        <button onClick={onSave} style={{ flex: 1.5, height: 52, borderRadius: 50, background: '#1A1A1A', color: '#FFFFFF', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>영상 저장하기</button>
        <button onClick={onClose} style={{ flex: 1, height: 52, borderRadius: 50, background: '#FFFFFF', border: '1px solid rgba(26,26,26,0.18)', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>다시 편집</button>
      </div>
    </div>
  );
}
