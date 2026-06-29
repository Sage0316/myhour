import { useState } from 'react';
import type { RecordType } from '../store';

interface RecordScreenProps {
  onClose: () => void;
  onSave: (type: RecordType, content: string) => void;
}

type Mode = '영상' | '사진' | '음성' | '글';
const MODES: Mode[] = ['영상', '사진', '음성', '글'];

const MODE_TYPE: Record<Mode, RecordType> = {
  영상: 'video', 사진: 'photo', 음성: 'audio', 글: 'text',
};

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

function TextRecordMode({ onSave }: { onSave: (content: string) => void }) {
  const [text, setText] = useState('');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 22px 30px', gap: 16 }}>
      <div style={{ flex: 1, borderRadius: 20, background: 'rgba(255,255,255,0.06)', padding: 18 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="지금 이 순간을 짧게 남겨보세요"
          autoFocus
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
          onClick={() => text.trim() && onSave(text.trim())}
          disabled={!text.trim()}
          style={{
            height: 46, padding: '0 28px', borderRadius: 50,
            background: text.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
            color: text.trim() ? '#16161A' : 'rgba(255,255,255,0.4)',
            fontSize: 15, fontWeight: 600, border: 'none',
            cursor: text.trim() ? 'pointer' : 'default',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

function MediaRecordMode({ mode, onSave }: { mode: '영상' | '사진' | '음성'; onSave: () => void }) {
  const isVideo = mode === '영상';
  const isAudio = mode === '음성';
  const modeLabel = { 영상: 'VIDEO', 사진: 'PHOTO', 음성: 'AUDIO' }[mode];

  return (
    <>
      {isAudio ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 22px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60 }}>
            {[12, 28, 18, 40, 22, 35, 16, 44, 20, 30, 14, 38].map((h, i) => (
              <div key={i} style={{ width: 4, height: h, borderRadius: 2, background: 'rgba(255,255,255,0.6)' }} />
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...MONO, fontSize: 28, color: '#fff', letterSpacing: 2 }}>00:08</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>녹음 중 (시뮬레이션)</div>
          </div>
          <button onClick={onSave} style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', cursor: 'pointer' }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, background: '#E5533C' }} />
          </button>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, margin: '16px 22px', borderRadius: 24, overflow: 'hidden', background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 10px, rgba(255,255,255,0) 10px 20px), #23232B', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isVideo && (
              <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E5533C' }} />
                <span style={{ ...MONO, fontSize: 11, letterSpacing: '1px', color: '#fff' }}>REC 00:08</span>
              </div>
            )}
            <div style={{ textAlign: 'center', ...MONO as React.CSSProperties, fontSize: 11, letterSpacing: '1.4px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
              CAMERA<br />{modeLabel} · 9:16
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 16, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              {isVideo ? '오늘의 한 컷을 짧게 남겨보세요' : '이 순간의 사진을 남겨보세요'}
            </div>
          </div>
          <div style={{ padding: '6px 30px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 46, height: 46, borderRadius: 11, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }} />
            <button onClick={onSave} style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', cursor: 'pointer' }}>
              {isVideo
                ? <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#E5533C' }} />
                : <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#fff' }} />
              }
            </button>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.7)', borderRadius: '50%', borderTopColor: 'transparent' }} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function RecordScreen({ onClose, onSave }: RecordScreenProps) {
  const [mode, setMode] = useState<Mode>('글');
  const currentSlot = '17:00';

  function handleSave(content: string) {
    onSave(MODE_TYPE[mode], content);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#16161A', color: '#fff' }}>
      <div style={{ padding: '58px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff', border: 'none', cursor: 'pointer' }}>✕</button>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1px', color: 'rgba(255,255,255,0.6)' }}>SLOT {currentSlot}</div>
        <div style={{ width: 34, height: 34 }} />
      </div>

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
        <TextRecordMode onSave={handleSave} />
      ) : (
        <MediaRecordMode
          mode={mode as '영상' | '사진' | '음성'}
          onSave={() => handleSave(mode + ' 기록')}
        />
      )}
    </div>
  );
}
