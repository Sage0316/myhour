import { useState, useRef } from 'react';
import type { RecordType } from '../store';
import { useApp } from '../context';

interface RecordScreenProps {
  onClose: () => void;
  onSave: (type: RecordType, content: string) => void;
}

type Mode = '영상' | '사진' | '음성' | '글';
const MODES: Mode[] = ['영상', '사진', '음성', '글'];
const MODE_TYPE: Record<Mode, RecordType> = { 영상: 'video', 사진: 'photo', 음성: 'audio', 글: 'text' };
const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 900;
      const ratio = Math.min(max / img.width, max / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function videoThumbnail(file: File): Promise<string> {
  return new Promise(resolve => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('loadeddata', () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) * 0.1);
    });
    video.addEventListener('seeked', () => {
      const w = 300, h = 533;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(0, 0, w, h);
      const vr = video.videoWidth / video.videoHeight;
      const cr = w / h;
      if (vr > cr) {
        const dw = h * vr;
        ctx.drawImage(video, (w - dw) / 2, 0, dw, h);
      } else {
        const dh = w / vr;
        ctx.drawImage(video, 0, (h - dh) / 2, w, dh);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(url);
    });
    video.load();
  });
}

function TextRecordMode({ onSave }: { onSave: (c: string) => void }) {
  const [text, setText] = useState('');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 22px 30px', gap: 16 }}>
      <div style={{ flex: 1, borderRadius: 20, background: 'rgba(255,255,255,0.06)', padding: 18 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="지금 이 순간을 짧게 남겨보세요"
          autoFocus
          style={{ width: '100%', height: '100%', background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 16, lineHeight: 1.6, fontFamily: 'Inter, sans-serif', resize: 'none' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{text.length}자</div>
        <button
          onClick={() => text.trim() && onSave(text.trim())}
          disabled={!text.trim()}
          style={{ height: 46, padding: '0 28px', borderRadius: 50, background: text.trim() ? '#fff' : 'rgba(255,255,255,0.2)', color: text.trim() ? '#16161A' : 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 600, border: 'none', cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif' }}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

function PhotoRecordMode({ onSave }: { onSave: (c: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const compressed = await compressImage(file);
    setPreview(compressed);
    setLoading(false);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '16px 22px 30px', gap: 12 }}>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>처리 중…</div>
        </div>
      )}
      {!loading && preview && (
        <>
          <div style={{ flex: 1, borderRadius: 24, overflow: 'hidden' }}>
            <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={() => { setPreview(null); inputRef.current && (inputRef.current.value = ''); }} style={{ flex: 1, height: 46, borderRadius: 50, background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>다시 찍기</button>
            <button onClick={() => onSave(preview)} style={{ flex: 1.5, height: 46, borderRadius: 50, background: '#fff', color: '#16161A', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>저장하기</button>
          </div>
        </>
      )}
      {!loading && !preview && (
        <>
          <div onClick={() => inputRef.current?.click()} style={{ flex: 1, borderRadius: 24, background: '#23232B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, cursor: 'pointer' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.8)', borderRadius: '50%' }} />
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>탭해서 사진 찍기</div>
          </div>
          <button onClick={() => inputRef.current?.click()} style={{ height: 50, borderRadius: 50, background: '#fff', color: '#16161A', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>카메라 열기</button>
        </>
      )}
    </div>
  );
}

function AudioRecordMode({ onSave }: { onSave: (c: string) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'done'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => { setAudioUrl(reader.result as string); setPhase('done'); };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      recorderRef.current = mr;
      setPhase('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      alert('마이크 접근 권한이 필요해요.\n브라우저 설정에서 허용해주세요.');
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  }

  function reset() {
    setAudioUrl(null);
    setPhase('idle');
    setSeconds(0);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  if (phase === 'done' && audioUrl) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 22px 30px', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.4px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>녹음 완료 · {mm}:{ss}</div>
        <audio src={audioUrl} controls style={{ width: '100%', borderRadius: 12 }} />
        <div style={{ display: 'flex', gap: 9, width: '100%' }}>
          <button onClick={reset} style={{ flex: 1, height: 46, borderRadius: 50, background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>다시 녹음</button>
          <button onClick={() => onSave(audioUrl)} style={{ flex: 1.5, height: 46, borderRadius: 50, background: '#fff', color: '#16161A', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>저장하기</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '0 22px 30px' }}>
      {phase === 'recording' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60 }}>
            {[12, 28, 18, 40, 22, 35, 16, 44, 20, 30, 14, 38].map((h, i) => (
              <div key={i} style={{ width: 4, height: h, borderRadius: 2, background: 'rgba(255,255,255,0.65)' }} />
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...MONO, fontSize: 32, color: '#fff', letterSpacing: 3 }}>{mm}:{ss}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>녹음 중</div>
          </div>
          <button onClick={stop} style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', cursor: 'pointer' }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, background: '#E5533C' }} />
          </button>
        </>
      ) : (
        <>
          <div style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            마이크로 이 순간을<br />짧게 남겨보세요
          </div>
          <button onClick={start} style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E5533C' }} />
          </button>
        </>
      )}
    </div>
  );
}

function VideoRecordMode({ onSave }: { onSave: (c: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const thumb = await videoThumbnail(file);
    setThumbnail(thumb);
    setLoading(false);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '16px 22px 30px', gap: 12 }}>
      <input ref={inputRef} type="file" accept="video/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>썸네일 생성 중…</div>
        </div>
      )}
      {!loading && thumbnail && (
        <>
          <div style={{ flex: 1, borderRadius: 24, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderLeft: '18px solid #fff', borderTop: '11px solid transparent', borderBottom: '11px solid transparent', marginLeft: 4 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={() => { setThumbnail(null); inputRef.current && (inputRef.current.value = ''); }} style={{ flex: 1, height: 46, borderRadius: 50, background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>다시 찍기</button>
            <button onClick={() => onSave(thumbnail)} style={{ flex: 1.5, height: 46, borderRadius: 50, background: '#fff', color: '#16161A', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>저장하기</button>
          </div>
        </>
      )}
      {!loading && !thumbnail && (
        <>
          <div onClick={() => inputRef.current?.click()} style={{ flex: 1, borderRadius: 24, background: '#23232B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, cursor: 'pointer' }}>
            <div style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E5533C' }} />
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>탭해서 영상 찍기</div>
          </div>
          <button onClick={() => inputRef.current?.click()} style={{ height: 50, borderRadius: 50, background: '#fff', color: '#16161A', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>카메라 열기</button>
        </>
      )}
    </div>
  );
}

export default function RecordScreen({ onClose, onSave }: RecordScreenProps) {
  const { currentSlot: slot, settings } = useApp();
  const defaultMode: Mode = settings.captureMode === 'fixed'
    ? (Object.entries({ 영상: 'video', 사진: 'photo', 음성: 'audio', 글: 'text' } as Record<Mode, RecordType>).find(([, v]) => v === settings.defaultType)?.[0] as Mode ?? '글')
    : '글';
  const [mode, setMode] = useState<Mode>(defaultMode);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#16161A', color: '#fff' }}>
      <div style={{ padding: '58px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff', border: 'none', cursor: 'pointer' }}>✕</button>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1px', color: 'rgba(255,255,255,0.6)' }}>SLOT {slot}</div>
        <div style={{ width: 34 }} />
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

      {mode === '글' && <TextRecordMode onSave={c => onSave(MODE_TYPE[mode], c)} />}
      {mode === '사진' && <PhotoRecordMode onSave={c => onSave(MODE_TYPE[mode], c)} />}
      {mode === '음성' && <AudioRecordMode onSave={c => onSave(MODE_TYPE[mode], c)} />}
      {mode === '영상' && <VideoRecordMode onSave={c => onSave(MODE_TYPE[mode], c)} />}
    </div>
  );
}
