import { useState } from 'react';

interface RecordScreenProps {
  onClose: () => void;
}

type Mode = '영상' | '사진' | '음성' | '글';
const MODES: Mode[] = ['영상', '사진', '음성', '글'];

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

function TextRecordMode({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 22px 30px', gap: 16 }}>
      <div style={{ flex: 1, borderRadius: 20, background: 'rgba(255,255,255,0.06)', padding: 18 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="지금 이 순간을 짧게 남겨보세요"
          style={{
            width: '100%', height: '100%', background: 'none', border: 'none', outline: 'none',
            color: '#fff', fontSize: 16, lineHeight: 1.6, fontFamily: 'Inter, sans-serif',
            resize: 'none',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{text.length}자</div>
        <button
          onClick={onClose}
          disabled={!text.trim()}
          style={{
            height: 46, padding: '0 28px', borderRadius: 50,
            background: text.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
            color: text.trim() ? '#16161A' : 'rgba(255,255,255,0.4)',
            fontSize: 15, fontWeight: 600, border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

function AudioRecordMode() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 22px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60 }}>
        {[12, 28, 18, 40, 22, 35, 16, 44, 20, 30, 14, 38].map((h, i) => (
          <div key={i} style={{ width: 4, height: h, borderRadius: 2, background: 'rgba(255,255,255,0.6)' }} />
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...MONO, fontSize: 28, color: '#fff', letterSpacing: 2 }}>00:08</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>녹음 중</div>
      </div>
      <button style={{
        width: 74, height: 74, borderRadius: '50%',
        border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', cursor: 'pointer',
      }}>
        <div style={{ width: 22, height: 22, borderRadius: 4, background: '#E5533C' }} />
      </button>
    </div>
  );
}

function CameraViewfinder({ mode }: { mode: '영상' | '사진' }) {
  return (
    <div style={{
      flex: 1, margin: '16px 22px', borderRadius: 24, overflow: 'hidden',
      background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 10px, rgba(255,255,255,0) 10px 20px), #23232B',
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {mode === '영상' && (
        <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E5533C' }} />
          <span style={{ ...MONO, fontSize: 11, letterSpacing: '1px', color: '#fff' }}>REC 00:08</span>
        </div>
      )}
      <div style={{ textAlign: 'center', ...MONO as React.CSSProperties, fontSize: 11, letterSpacing: '1.4px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
        CAMERA<br />{mode === '영상' ? '9:16 · VIDEO' : '9:16 · PHOTO'}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 16, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
        {mode === '영상' ? '오늘의 한 컷을 짧게 남겨보세요' : '이 순간의 사진을 남겨보세요'}
      </div>
    </div>
  );
}

function CameraControls({ mode }: { mode: '영상' | '사진' }) {
  return (
    <div style={{ padding: '6px 30px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{
        width: 46, height: 46, borderRadius: 11,
        background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 6px, rgba(255,255,255,0) 6px 12px), #2E2E36',
        border: '1px solid rgba(255,255,255,0.12)',
      }} />
      {mode === '영상' ? (
        <div style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#E5533C' }} />
        </div>
      ) : (
        <div style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#fff' }} />
        </div>
      )}
      <div style={{
        width: 46, height: 46, borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.7)', borderRadius: '50%', borderTopColor: 'transparent' }} />
      </div>
    </div>
  );
}

export default function RecordScreen({ onClose }: RecordScreenProps) {
  const [mode, setMode] = useState<Mode>('영상');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#16161A', color: '#fff' }}>
      {/* Top bar */}
      <div style={{ padding: '58px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: '#fff', border: 'none', cursor: 'pointer',
        }}>✕</button>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1px', color: 'rgba(255,255,255,0.6)' }}>SLOT 17:00–19:00</div>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff' }} />)}
        </div>
      </div>

      {/* Mode switcher */}
      <div style={{ padding: '16px 22px 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'inline-flex', gap: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 50, padding: 4 }}>
          {MODES.map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '8px 16px', borderRadius: 50,
              background: mode === m ? '#fff' : 'none',
              color: mode === m ? '#16161A' : 'rgba(255,255,255,0.55)',
              fontSize: 13, fontWeight: mode === m ? 600 : 400,
              border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>{m}</button>
          ))}
        </div>
      </div>

      {mode === '글' ? (
        <TextRecordMode onClose={onClose} />
      ) : mode === '음성' ? (
        <AudioRecordMode />
      ) : (
        <>
          <CameraViewfinder mode={mode as '영상' | '사진'} />
          <CameraControls mode={mode as '영상' | '사진'} />
        </>
      )}
    </div>
  );
}
