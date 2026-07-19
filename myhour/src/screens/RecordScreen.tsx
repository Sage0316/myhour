import { useState, useRef, useEffect } from 'react';
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

function CameraVideoMode({ onCapture }: { onCapture: (thumb: string, key: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [phase, setPhase] = useState<'starting' | 'preview' | 'recording' | 'processing' | 'error'>('starting');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        try {
          await stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] });
        } catch { /* torch 미지원 기기는 무시 */ }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPhase('preview');
      } catch {
        if (!cancelled) setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startRecording() {
    if (!streamRef.current) return;
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t)) ?? '';
    const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start();
    recorderRef.current = mr;
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    setPhase('recording');
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    const mr = recorderRef.current;
    if (!mr) return;
    setPhase('processing');
    mr.onstop = async () => {
      const mimeType = mr.mimeType || 'video/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const file = new File([blob], `video.${ext}`, { type: mimeType });
      const videoKey = `video_${Date.now()}`;
      const [thumb] = await Promise.all([videoThumbnail(file), saveVideoToIDB(videoKey, file)]);
      streamRef.current?.getTracks().forEach(t => t.stop());
      onCapture(thumb, videoKey);
    };
    mr.stop();
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  if (phase === 'error') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.7 }}>
        카메라 접근 권한이 필요해요<br />
        <span style={{ fontSize: 12 }}>브라우저 설정에서 허용해주세요</span>
      </div>
    </div>
  );

  if (phase === 'processing') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>처리 중…</div>
    </div>
  );

  return (
    <div style={{ flex: 1, position: 'relative', margin: '16px 22px 30px', borderRadius: 24, overflow: 'hidden', background: '#23232B' }}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          // 5초가 지나면 미리보기를 회색으로 — 여기부터는 요약 영상에 안 담긴다는 신호
          // (녹화는 스트림에서 직접 따가므로 저장 영상은 컬러 그대로)
          filter: phase === 'recording' && seconds >= 5 ? 'grayscale(1) brightness(0.75)' : 'none',
          transition: 'filter 0.6s ease',
        }}
      />
      {phase === 'starting' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>카메라 준비 중…</div>
        </div>
      )}
      {phase === 'recording' && (
        <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,0.5)', borderRadius: 50, padding: '6px 14px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E5533C' }} />
            <span style={{ ...MONO, fontSize: 13, color: seconds >= 5 ? 'rgba(255,255,255,0.45)' : '#fff' }}>{mm}:{ss}</span>
          </div>
          {seconds >= 5 && (
            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 50, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
              영상에는 앞 5초만 담겨요
            </div>
          )}
        </div>
      )}
      {phase === 'preview' && (
        <div style={{ position: 'absolute', bottom: 112, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 50, padding: '5px 13px', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            하루 요약 영상에는 앞 5초만 담겨요
          </div>
        </div>
      )}
      {(phase === 'preview' || phase === 'recording') && (
        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={phase === 'preview' ? startRecording : stopRecording}
            style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}
          >
            {phase === 'preview'
              ? <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E5533C' }} />
              : <div style={{ width: 24, height: 24, borderRadius: 4, background: '#E5533C' }} />
            }
          </button>
        </div>
      )}
    </div>
  );
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

// 음성 메모는 WAV(PCM)로 녹음한다.
// iOS MediaRecorder가 만드는 audio/mp4는 사파리 자신의 decodeAudioData조차
// 거부하는 경우가 있어 영상 믹싱이 조용히 실패한다. WAV는 어디서나 디코딩된다.
function AudioRecordMode({ onCapture }: { onCapture: (url: string) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording'>('idle');
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const rateRef = useRef(44100);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      type AC = typeof AudioContext;
      const Ctor: AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: AC }).webkitAudioContext;
      const ctx = new Ctor();
      await ctx.resume().catch(() => {});
      rateRef.current = ctx.sampleRate;
      const src = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      samplesRef.current = [];
      proc.onaudioprocess = e => {
        samplesRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      // 스피커로 되돌아가 하울링이 나지 않게 무음 게인을 거쳐 연결
      const mute = ctx.createGain();
      mute.gain.value = 0;
      src.connect(proc);
      proc.connect(mute);
      mute.connect(ctx.destination);

      ctxRef.current = ctx;
      procRef.current = proc;
      streamRef.current = stream;
      setPhase('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      alert('마이크 접근 권한이 필요해요.\n브라우저 설정에서 허용해주세요.');
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    procRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current?.close().catch(() => {});

    // 수집한 샘플을 이어붙이고 16kHz 모노로 다운샘플 (음성용, 용량 절약)
    const chunks = samplesRef.current;
    const total = chunks.reduce((a, c) => a + c.length, 0);
    const all = new Float32Array(total);
    let off = 0;
    for (const c of chunks) { all.set(c, off); off += c.length; }

    const targetRate = 16000;
    const factor = Math.max(1, Math.round(rateRef.current / targetRate));
    const outRate = Math.round(rateRef.current / factor);
    const n = Math.floor(all.length / factor);
    const wav = new ArrayBuffer(44 + n * 2);
    const v = new DataView(wav);
    const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, outRate, true); v.setUint32(28, outRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    writeStr(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      // factor개 샘플 평균으로 다운샘플
      let sum = 0;
      for (let j = 0; j < factor; j++) sum += all[i * factor + j];
      const s = Math.max(-1, Math.min(1, sum / factor));
      v.setInt16(44 + i * 2, s * 0x7FFF, true);
    }

    const reader = new FileReader();
    reader.onload = () => onCapture(reader.result as string);
    reader.readAsDataURL(new Blob([wav], { type: 'audio/wav' }));
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
            <div style={{ ...MONO, fontSize: 32, color: seconds >= 5 ? 'rgba(255,255,255,0.45)' : '#fff', letterSpacing: 3 }}>{mm}:{ss}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
              {seconds >= 5 ? '영상에는 앞 5초만 담겨요' : '녹음 중'}
            </div>
          </div>
          <button onClick={stop} style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', cursor: 'pointer' }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, background: '#E5533C' }} />
          </button>
        </>
      ) : (
        <>
          <div style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            마이크로 이 순간을<br />짧게 남겨보세요
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>하루 요약 영상에는 앞 5초만 담겨요</div>
          </div>
          <button onClick={start} style={{ width: 74, height: 74, borderRadius: '50%', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E5533C' }} />
          </button>
        </>
      )}
    </div>
  );
}

function CaptionStep({ content, type, onSave, onRetake }: {
  content: string;
  type: RecordType;
  onSave: (caption: string) => void;
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

      {/* 버튼 — 문구는 선택사항: 비워두고 저장하면 문구 없이 저장된다 */}
      <div style={{ flexShrink: 0 }}>
        <button
          onClick={() => onSave(text.trim())}
          style={{ width: '100%', height: 50, borderRadius: 50, background: '#fff', color: '#16161A', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          저장하기
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
  const pendingVideoKeyRef = useRef<string | null>(null);
  const [retakeKey, setRetakeKey] = useState(0);

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const compressed = await compressImage(file);
    setLoading(false);
    setCapturedContent(compressed);
    e.target.value = '';
  }

  function switchMode(m: Mode) {
    setMode(m);
    setCapturedContent(null);
    pendingVideoKeyRef.current = null;
    if (m === '사진') photoInputRef.current?.click();
  }

  function retake() {
    setCapturedContent(null);
    if (mode === '사진') photoInputRef.current?.click();
    else if (mode === '영상') setRetakeKey(k => k + 1);
  }

  function handleCaptionSave(caption: string) {
    onSave(MODE_TYPE[mode], capturedContent!, caption || undefined, pendingVideoKeyRef.current ?? undefined);
    pendingVideoKeyRef.current = null;
  }

  function renderContent() {
    if (capturedContent) {
      return (
        <CaptionStep
          content={capturedContent}
          type={MODE_TYPE[mode]}
          onSave={handleCaptionSave}
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
    if (mode === '영상') return (
      <CameraVideoMode
        key={retakeKey}
        onCapture={(thumb, key) => { pendingVideoKeyRef.current = key; setCapturedContent(thumb); }}
      />
    );

    // 사진 — 카메라 미실행 상태
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 22px 30px' }}>
        <div
          onClick={() => photoInputRef.current?.click()}
          style={{ flex: 1, borderRadius: 24, background: '#23232B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, cursor: 'pointer' }}
        >
          <div style={{ width: 68, height: 68, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.8)', borderRadius: '50%' }} />
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>탭해서 카메라 열기</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#16161A', color: '#fff' }}>
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} style={{ display: 'none' }} />

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
