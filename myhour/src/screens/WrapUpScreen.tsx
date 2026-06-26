import { useState } from 'react';

interface WrapUpScreenProps {
  onClose: () => void;
  onSave: () => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const CLIP_COLORS = ['#F0D9C8', '#D9EAD9', '#E4DBF5', '#F4ECD9', '#F0D9C8'];
const EMOJIS = ['😌', '🤪', '🥹', '😵', '😤'];

export default function WrapUpScreen({ onClose, onSave }: WrapUpScreenProps) {
  const [selectedEmoji, setSelectedEmoji] = useState(0);
  const [calmness, setCalmness] = useState(72);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ flex: 1, padding: '58px 22px 0', display: 'flex', flexDirection: 'column', gap: 13, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>
            Wrap up · 6.25
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(26,26,26,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, border: 'none', cursor: 'pointer',
          }}>✕</button>
        </div>

        <div style={{ fontSize: 23, fontWeight: 600, letterSpacing: '-0.5px', lineHeight: 1.25 }}>
          오늘을 영상으로 정리했어요
        </div>

        {/* Clip strip */}
        <div>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.45)', marginBottom: 9 }}>
            Today's clips · 5
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {CLIP_COLORS.map((bg, i) => (
              <div key={i} style={{
                width: 34, height: 46, borderRadius: 7,
                background: `repeating-linear-gradient(135deg, rgba(26,26,26,0.06) 0 5px, rgba(26,26,26,0) 5px 10px), ${bg}`,
              }} />
            ))}
            <div style={{ color: 'rgba(26,26,26,0.35)', fontSize: 18, margin: '0 2px' }}>→</div>
            <div style={{
              width: 34, height: 46, borderRadius: 7, background: '#1A1A1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 0, height: 0, borderLeft: '8px solid #fff', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 2 }} />
            </div>
          </div>
        </div>

        {/* AI Summary card */}
        <div style={{
          background: '#fff', border: '1px solid rgba(26,26,26,0.07)',
          borderRadius: 18, padding: 15, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.45)' }}>
              AI가 정리한 오늘
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 50, background: '#CDEBDD',
                fontSize: 12, fontWeight: 500,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3FA37B', display: 'inline-block' }} />
                잔잔함
              </span>
              <span style={{ fontSize: 12, color: '#7C5CC4', textDecoration: 'underline', cursor: 'pointer' }}>바꾸기</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.35 }}>
              버스에서 노을까지,<br />평범하게 좋았던 하루
            </div>
            <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.6)', marginTop: 7, lineHeight: 1.5 }}>
              "별일 없었지만, 이런 하루가 제일 오래 남더라."
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(26,26,26,0.08)' }} />

          {/* Feedback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.4)' }}>
              더 정확하게 · 선택
            </div>
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
                <span>차분함</span>
                <span style={MONO}>{calmness}</span>
              </div>
              <input
                type="range"
                min={0} max={100}
                value={calmness}
                onChange={e => setCalmness(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8, accentColor: '#1A1A1A' }}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{
          flex: 1, position: 'relative', borderRadius: 20, overflow: 'hidden',
          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 10px, rgba(255,255,255,0) 10px 20px), #1E2240',
          display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0,
        }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 0, borderLeft: '13px solid #1E2240', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', marginLeft: 3 }} />
          </div>
          <div style={{
            position: 'absolute', left: 14, top: 14,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: '1.2px', color: 'rgba(255,255,255,0.7)',
          }}>미리보기 · PREVIEW</div>
          <div style={{
            position: 'absolute', left: 14, right: 14, bottom: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 0, height: 0, borderLeft: '8px solid #fff', borderTop: '5px solid transparent', borderBottom: '5px solid transparent' }} />
            <div style={{ flex: 1, height: 3, borderRadius: 50, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              <div style={{ width: '6%', height: '100%', background: '#fff' }} />
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>0:00 / 0:52</div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '12px 22px 30px', display: 'flex', gap: 9 }}>
        <button onClick={onSave} style={{
          flex: 1.5, height: 52, borderRadius: 50,
          background: '#1A1A1A', color: '#FFFFFF',
          fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}>영상 저장하기</button>
        <button onClick={onClose} style={{
          flex: 1, height: 52, borderRadius: 50,
          background: '#FFFFFF', border: '1px solid rgba(26,26,26,0.18)',
          fontSize: 15, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}>다시 편집</button>
      </div>
    </div>
  );
}
