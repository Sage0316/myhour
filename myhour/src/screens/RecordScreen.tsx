import { useState, useRef } from 'react';
import type { RecordType } from '../store';
import { saveVideoToIDB } from '../store';
import { useApp } from '../context';

interface RecordScreenProps {
  onClose: () => void;
  onSave: (type: RecordType, content: string, caption?: string, videoKey?: string) => void;
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

function AudioRecordMode({ onCapture }: { onCapture: (url: string) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording'>('idle');
  const [seconds, setSeconds] = useState(0);
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
        reader.onload = () => onCapture(reader.result as string);
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

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

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

function CaptionStep({ content, type, onSave, onSkip, onRetake }: {
  content: string;
  type: RecordType;
  onSave: (caption: string) => void;
  onSkip: () => void;
  onRetake?: () => void;
}) {
  const [text, setText] = useState('');
  const isMedia = type === 'photo' || type === 'video';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 22px 30px', gap: 14, minHeight: 0, overflowY: 'auto' }}>
      {/* 미리보기 */}
      {isMedia && (
        <div style={{ borderRadius: 20, overflow: 'hidden', maxHeight: '42vh', flexShrink: 0, position: 'relative' }}>
          <img src={content} alt="" style={{ width: '100%', objectFit: 'cover', maxHeight: '42vh', display: 'block' }} />
          {type === 'video' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 0, height: 0, borderLeft: '12px solid #fff', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', marginLeft: 3 }} />
              </div>
            </div>
          )}
          {onRetake && (
            <button
              onClick={onRetake}
              style={{ position: 'absolute', top: 10, right: 10, padding: '5px 12px', borderRadius: 50, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              다시 찍기
            </button>
          )}
        </div>
      )}
      {type === 'audio' && (
        <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.06)', padding: '14px 16px', flexShrink: 0 }}>
          <audio src={content} controls style={{ width: '100%', height: 36 }} />
        </div>
      )}

      {/* 문구 입력 */}
      <div style={{ flex: 1, borderRadius: 18, background: 'rgba(255,255,255,0.06)', padding: 16, minHeight: 100 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="점심 도시락, 오후 산책..."
          autoFocus
          style={{ width: '100%', height: '100%', minHeight: 80, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 15, lineHeight: 1.6, fontFamily: 'Inter, sans-serif', resize: 'none' }}
        />
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 9, flexShrink: 0 }}>
        <button
          onClick={onSkip}
          style={{ flex: 1, height: 50, borderRadius: 50, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          스킵
        </button>
        <button
          onClick={() => onSave(text.trim())}
          style={{ flex: 1.5, height: 50, borderRadius: 50, background: '#fff', color: '#16161A', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          문구 입력하기
        </button>
      </div>
    </div>
  );
}

export default function RecordScreen({ onClose, onSave }: RecordScreenProps) {
  const { currentSlot: slot, settings } = useApp();
  const defaultMode: Mode = settings.captureMode === 'fixed'
    ? (Object.entries({ 영상: 'video', 사진: 'photo', 음성: 'audio', 글: 'text' } as Record<Mode, RecordType>).find(([, v]) => v === settings.defaultType)?.[0] as Mode ?? '글')
    : '글';

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [capturedContent, setCapturedContent] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pendingVideoKeyRef = useRef<string | null>(null);

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const compressed = await compressImage(file);
    setLoading(false);
    setCapturedContent(compressed);
    e.target.value = '';
  }

  async function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const videoKey = `video_${Date.now()}`;
    const [thumb] = await Promise.all([
      videoThumbnail(file),
      saveVideoToIDB(videoKey, file),
    ]);
    pendingVideoKeyRef.current = videoKey;
    setLoading(false);
    setCapturedContent(thumb);
    e.target.value = '';
  }

  function switchMode(m: Mode) {
    setMode(m);
    setCapturedContent(null);
    pendingVideoKeyRef.current = null;
    if (m === '사진') photoInputRef.current?.click();
    else if (m === '영상') videoInputRef.current?.click();
  }

  function retake() {
    setCapturedContent(null);
    if (mode === '사진') photoInputRef.current?.click();
    else if (mode === '영상') videoInputRef.current?.click();
  }

  function handleCaptionSave(caption: string) {
    onSave(MODE_TYPE[mode], capturedContent!, caption || undefined, pendingVideoKeyRef.current ?? undefined);
    pendingVideoKeyRef.current = null;
  }

  function handleSkip() {
    onSave(MODE_TYPE[mode], capturedContent!, undefined, pendingVideoKeyRef.current ?? undefined);
    pendingVideoKeyRef.current = null;
  }

  function renderContent() {
    if (capturedContent) {
      return (
        <CaptionStep
          content={capturedContent}
          type={MODE_TYPE[mode]}
          onSave={handleCaptionSave}
          onSkip={handleSkip}
          onRetake={mode !== '음성' ? retake : undefined}
        />
      );
    }
    if (loading) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>처리 중…</div>
        </div>
      );
    }
    if (mode === '글') return <TextRecordMode onSave={c => onSave('text', c)} />;
    if (mode === '음성') return <AudioRecordMode onCapture={setCapturedContent} />;

    // 사진/영상 — 카메라 미실행 상태 (사용자가 취소했거나 다시 탭했을 때)
    const isPhoto = mode === '사진';
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 22px 30px' }}>
        <div
          onClick={() => isPhoto ? photoInputRef.current?.click() : videoInputRef.current?.click()}
          style={{ flex: 1, borderRadius: 24, background: '#23232B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, cursor: 'pointer' }}
        >
          {isPhoto ? (
            <>
              <div style={{ width: 68, height: 68, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.8)', borderRadius: '50%' }} />
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>탭해서 카메라 열기</div>
            </>
          ) : (
            <>
              <div style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E5533C' }} />
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>탭해서 카메라 열기</div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#16161A', color: '#fff' }}>
      {/* 숨겨진 파일 입력 */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} style={{ display: 'none' }} />
      <input ref={videoInputRef} type="file" accept="video/*" capture="environment" onChange={handleVideoFile} style={{ display: 'none' }} />

      <div style={{ padding: '58px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff', border: 'none', cursor: 'pointer' }}>✕</button>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1px', color: 'rgba(255,255,255,0.6)' }}>SLOT {slot}</div>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ padding: '16px 22px 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'inline-flex', gap: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 50, padding: 4 }}>
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                padding: '8px 16px', borderRadius: 50,
                background: mode === m ? '#fff' : 'none',
                color: mode === m ? '#16161A' : 'rgba(255,255,255,0.55)',
                fontSize: 13, fontWeight: mode === m ? 600 : 400,
                border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >{m}</button>
          ))}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
