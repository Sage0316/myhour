import { useState, useRef, useEffect } from 'react';
import {
  BUTTON_DISABLED, BUTTON_PRIMARY, CARD, COLOR, FONT_BODY, PILL_BUTTON, SCREEN, TAPE_SKY, topPad,
} from '../design';
import type { MyRecord, RecordType } from '../store';
import { H, W, ensureDiaryFont } from '../scenes';
import { drawDiaryScene } from '../scenesDakku';
import { LONG_TEXT_CHARS } from '../videoGenerator';
import { deleteVideoFromIDB, loadVideoBlobFromIDB, saveVideoToIDB } from '../store';
import { useApp, type RecordMedia } from '../appContext';
import { createStableId } from '../domain/model';
import { assertCaptureCapacity } from '../media/capabilities';
import { useDialogFocus } from '../accessibility/useDialogFocus';
import { noAutofill } from '../noAutofill';
import { saveCaptureToPhotos } from '../native/saveToPhotos';

interface RecordScreenProps {
  onClose: () => void;
  onSave: (type: RecordType, content: string, caption?: string, media?: RecordMedia) => void;
}

type Mode = '영상' | '사진' | '음성' | '글';
const MODES: Mode[] = ['영상', '사진', '음성', '글'];
const MODE_TYPE: Record<Mode, RecordType> = { 영상: 'video', 사진: 'photo', 음성: 'audio', 글: 'text' };
const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

/** 뷰파인더 네 모서리 표시 */
function ViewfinderCorners({ color, bottom = 18 }: { color: string; bottom?: number }) {
  const corner = (d: string, pos: React.CSSProperties) => (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 26 26" style={{ position: 'absolute', ...pos }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
  return (
    <>
      {corner('M2 12V2h10', { top: 18, left: 18 })}
      {corner('M14 2h10v10', { top: 18, right: 18 })}
      {corner('M2 14v10h10', { bottom, left: 18 })}
      {corner('M24 14v10H14', { bottom, right: 18 })}
    </>
  );
}

/** 빨간 녹화·촬영 버튼. 녹화 중이면 네모(정지)로 바뀐다 */
function RecordButton({ onClick, label, recording, light }: { onClick: () => void; label: string; recording: boolean; light?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{ width: 74, height: 74, borderRadius: 37, boxSizing: 'border-box', border: `3px solid ${light ? COLOR.white : COLOR.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: light ? 'rgba(0,0,0,0.25)' : COLOR.white, cursor: 'pointer', padding: 0 }}
    >
      <span style={recording
        ? { width: 26, height: 26, borderRadius: 5, background: COLOR.red }
        : { width: 54, height: 54, borderRadius: 27, background: COLOR.red }} />
    </button>
  );
}

interface PreparedImage {
  preview: string;
  blob: Blob;
}

function prepareImage(file: File): Promise<PreparedImage> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1600;
      const ratio = Math.min(max / img.width, max / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error('사진을 처리하지 못했어요.'));
          return;
        }
        const previewCanvas = document.createElement('canvas');
        const previewRatio = Math.min(360 / canvas.width, 360 / canvas.height, 1);
        previewCanvas.width = Math.max(1, Math.round(canvas.width * previewRatio));
        previewCanvas.height = Math.max(1, Math.round(canvas.height * previewRatio));
        previewCanvas.getContext('2d')!.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
        resolve({ preview: previewCanvas.toDataURL('image/jpeg', 0.68), blob });
      }, 'image/jpeg', 0.82);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('지원하지 않는 사진 형식이에요.'));
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

function CameraVideoMode({ onCapture }: { onCapture: (thumb: string, media: RecordMedia) => void }) {
  const maxRecordingSeconds = 30;
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
    timerRef.current = setInterval(() => setSeconds(current => {
      const next = current + 1;
      if (next >= maxRecordingSeconds) queueMicrotask(stopRecording);
      return next;
    }), 1000);
    setPhase('recording');
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    const mr = recorderRef.current;
    if (!mr) return;
    setPhase('processing');
    mr.onstop = async () => {
      try {
        const mimeType = mr.mimeType || 'video/webm';
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await assertCaptureCapacity('video', blob);
        const file = new File([blob], `video.${ext}`, { type: mimeType });
        const videoKey = createStableId('media');
        const [thumb] = await Promise.all([videoThumbnail(file), saveVideoToIDB(videoKey, file)]);
        streamRef.current?.getTracks().forEach(t => t.stop());
        onCapture(thumb, { key: videoKey, type: file.type, size: file.size });
      } catch {
        setPhase('error');
      }
    };
    mr.stop();
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  if (phase === 'error') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
      <div style={{ ...CARD, padding: '20px 22px', fontSize: 15, fontWeight: 700, textAlign: 'center', lineHeight: 1.6 }}>
        카메라 접근 권한이 필요해요<br />
        <span style={{ fontSize: 13, fontWeight: 400, color: COLOR.inkMuted }}>설정에서 카메라를 허용해 주세요</span>
      </div>
    </div>
  );

  if (phase === 'processing') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: COLOR.inkMuted }}>처리 중…</div>
    </div>
  );

  return (
    <div style={{ flex: 1, position: 'relative', margin: '20px 22px 34px', borderRadius: 22, overflow: 'hidden', background: '#2F2B33', border: `1.5px solid ${COLOR.ink}` }}>
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
      {phase === 'preview' && <ViewfinderCorners color={COLOR.white} bottom={138} />}
      {phase === 'starting' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>카메라 준비 중…</div>
        </div>
      )}
      {phase === 'recording' && (
        <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,0.5)', borderRadius: 50, padding: '6px 14px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR.red }} />
            <span style={{ ...MONO, fontSize: 13, color: seconds >= 5 ? 'rgba(255,255,255,0.45)' : '#fff' }}>{mm}:{ss}</span>
          </div>
          {seconds >= 5 && (
            <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 50, padding: '5px 14px', fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
              이 이후에 녹화되는 건 영상에 들어가지 않아요
            </div>
          )}
        </div>
      )}
      {phase === 'preview' && (
        <div style={{ position: 'absolute', bottom: 112, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: '4px 12px', fontSize: 12, fontWeight: 500, color: COLOR.ink }}>
            하루 요약 영상에는 앞 5초만 담겨요
          </div>
        </div>
      )}
      {(phase === 'preview' || phase === 'recording') && (
        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <RecordButton
            onClick={phase === 'preview' ? startRecording : stopRecording}
            label={phase === 'preview' ? '영상 녹화 시작' : '영상 녹화 중지'}
            recording={phase === 'recording'}
            light
          />
        </div>
      )}
    </div>
  );
}

// 영상에서 글 기록 하나는 3초 보인다. 25자였다가 펌킨 요청으로 50자 (그림일기 두 레이아웃 모두 4~5줄로 들어간다)
const TEXT_MAX = 50;

/** 실제 영상 장면(그림일기)을 그대로 그린 미리보기. 무드 스티커는 마감할 때 정해져서 여기선 뺀다 */
function DiaryPreview({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => { void ensureDiaryFont().then(() => setFontReady(true)); }, []);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawDiaryScene(ctx, { id: 'preview', slotTime: currentClock(), type: 'text', content: text, createdAt: 0 } as MyRecord, null, 1);
  }, [text, fontReady]);
  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      aria-hidden="true"
      style={{ height: '100%', maxHeight: 300, aspectRatio: '9 / 16', border: `1.5px solid ${COLOR.ink}`, borderRadius: 14, boxSizing: 'border-box' }}
    />
  );
}

function currentClock(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function TextRecordMode({ onSave }: { onSave: (c: string) => void }) {
  const [text, setText] = useState('');
  const ready = text.trim().length > 0;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 22px 34px', gap: 14, minHeight: 0 }}>
      <label style={{
        // 50자가 세 줄로 다 보이는 높이 — 글이 늘어도 칸이 커지지 않고, 안에서 스크롤되지도 않게
        flexShrink: 0, height: 144, display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
        ...CARD, borderRadius: 18, padding: '14px 18px 10px',
      }}>
        <textarea
          // 아이폰이 주소·연락처 입력칸으로 착각해 키보드 위에 자동완성을 띄우지 않게 한다
          {...noAutofill('text')}
          value={text}
          rows={3}
          maxLength={TEXT_MAX}
          onChange={e => setText(e.target.value.slice(0, TEXT_MAX))}
          placeholder="지금 이 순간을 한 줄로"
          aria-label="글 기록"
          autoFocus
          style={{
            flex: 1, width: '100%', border: 'none', outline: 'none', color: COLOR.ink, fontSize: 18, fontWeight: 500, lineHeight: '32px', fontFamily: FONT_BODY, resize: 'none', padding: 0,
            // 줄노트: 글줄마다 바로 아래에 연한 줄을 긋는다
            background: 'linear-gradient(transparent 31px, rgba(142,167,201,0.45) 31px, rgba(142,167,201,0.45) 32px) 0 0 / 100% 32px local',
          }}
        />
        <span style={{ alignSelf: 'flex-end', fontSize: 12, color: text.length >= TEXT_MAX ? COLOR.red : COLOR.inkMuted }}>{text.length}/{TEXT_MAX}자</span>
      </label>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: COLOR.inkSub }}>
          영상에서는 {text.trim().length > LONG_TEXT_CHARS ? 6 : 3}초 동안 이런 그림일기로 보여요
        </span>
        <DiaryPreview text={ready ? text.trim() : '여기 쓴 한 줄'} />
      </div>

      <button
        onClick={() => ready && onSave(text.trim())}
        disabled={!ready}
        style={{ ...BUTTON_PRIMARY, width: '100%', flexShrink: 0, ...(ready ? {} : BUTTON_DISABLED) }}
      >
        저장하기
      </button>
    </div>
  );
}

// 음성 메모는 WAV(PCM)로 녹음한다.
// iOS MediaRecorder가 만드는 audio/mp4는 사파리 자신의 decodeAudioData조차
// 거부하는 경우가 있어 영상 믹싱이 조용히 실패한다. WAV는 어디서나 디코딩된다.
function AudioRecordMode({ onCapture }: { onCapture: (blob: Blob) => void }) {
  const maxRecordingSeconds = 60;
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
      timerRef.current = setInterval(() => setSeconds(current => {
        const next = current + 1;
        if (next >= maxRecordingSeconds) queueMicrotask(stop);
        return next;
      }), 1000);
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

    onCapture(new Blob([wav], { type: 'audio/wav' }));
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 22px 34px', minHeight: 0 }}>
    <div style={{ flex: 1, ...CARD, borderRadius: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      {phase === 'recording' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60 }}>
            {[12, 28, 18, 40, 22, 35, 16, 44, 20, 30, 14, 38].map((h, i) => (
              // 5초가 지나면 파형도 회색으로 — 영상 촬영 화면과 같은 신호
              <div key={i} style={{ width: 4, height: h, borderRadius: 2, background: seconds >= 5 ? '#D6CFC3' : COLOR.ink, transition: 'background 0.6s ease' }} />
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...MONO, fontSize: 32, color: seconds >= 5 ? COLOR.inkMuted : COLOR.ink, letterSpacing: 3 }}>{mm}:{ss}</div>
            <div style={{ fontSize: 13, color: COLOR.inkMuted, marginTop: 8 }}>
              {seconds >= 5 ? '이 이후에 녹음되는 건 영상에 들어가지 않아요' : '녹음 중'}
            </div>
          </div>
          <RecordButton onClick={stop} label="음성 녹음 중지" recording />
        </>
      ) : (
        <>
          <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 5, height: 60 }}>
            {[12, 28, 18, 40, 22, 34, 16, 44, 20, 30, 14, 38].map((h, i) => (
              <div key={i} style={{ width: 4, height: h, borderRadius: 2, background: '#D6CFC3' }} />
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5 }}>마이크로 이 순간을<br />짧게 남겨보세요</div>
            <div style={{ fontSize: 12, color: COLOR.inkMuted, marginTop: 8 }}>하루 요약 영상에는 앞 5초만 담겨요</div>
          </div>
          <RecordButton onClick={start} label="음성 녹음 시작" recording={false} />
        </>
      )}
    </div>
    </div>
  );
}

// 사진/영상 자막은 영상에서 한 줄이라 이 이상은 화면을 벗어난다
const CAPTION_MAX = 20;

function CaptionStep({ content, type, onSave, onRetake }: {
  content: string;
  type: RecordType;
  onSave: (caption: string) => void;
  onRetake?: () => void;
}) {
  const [text, setText] = useState('');
  const isMedia = type === 'photo' || type === 'video' || type === 'meme';

  return (
    <div className="scroll-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 22px 34px', gap: 14, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
      {/* 미리보기 */}
      {isMedia && (
        // 미리보기는 남는 공간만 쓴다. 예전엔 최대 42vh까지 커져서, 세로로 긴 영상 썸네일이면
        // 아래 저장 버튼이 밀려 스크롤이 생겼다(정사각형에 가까운 사진은 괜찮아서 영상만 그랬다)
        <div style={{ borderRadius: 20, overflow: 'hidden', flex: '1 1 0', minHeight: 140, position: 'relative', border: `1.5px solid ${COLOR.ink}`, background: COLOR.beige }}>
          <img src={content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {type === 'video' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: COLOR.white, border: `1.5px solid ${COLOR.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={COLOR.navy}><path d="M7 4.5v15l12.5-7.5z" /></svg>
              </div>
            </div>
          )}
          {onRetake && (
            <button
              onClick={onRetake}
              style={{ ...PILL_BUTTON, position: 'absolute', top: 10, right: 10, minHeight: 36 }}
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
              {type === 'meme' ? '다시 고르기' : '다시 찍기'}
            </button>
          )}
        </div>
      )}
      {type === 'audio' && (
        <div style={{ ...CARD, padding: '14px 16px', flexShrink: 0 }}>
          <audio src={content} controls style={{ width: '100%', height: 36 }} />
        </div>
      )}

      {/* 문구 입력 */}
      <div style={{ ...(isMedia ? { height: 120 } : { flex: 1, minHeight: 100 }), ...CARD, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: COLOR.inkSub }}>한 줄 남기기 (선택)</span>
        <textarea
          // 아이폰이 주소·연락처 입력칸으로 착각해 키보드 위에 자동완성을 띄우지 않게 한다
          {...noAutofill('caption')}
          value={text}
          maxLength={CAPTION_MAX}
          onChange={e => setText(e.target.value.slice(0, CAPTION_MAX))}
          placeholder={type === 'meme' ? '딱 이 기분이었음 ㅋㅋ' : '점심 도시락, 오후 산책...'}
          autoFocus
          aria-label="한 줄 남기기"
          style={{ flex: 1, width: '100%', minHeight: 60, background: 'none', border: 'none', outline: 'none', color: COLOR.ink, fontSize: 16, lineHeight: 1.6, fontFamily: FONT_BODY, resize: 'none', padding: 0 }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, paddingLeft: 4 }}>
        <div style={{ fontSize: 12, color: COLOR.inkMuted }}>
          {type === 'meme' ? '이 문구가 하루 요약 영상에 손글씨로 들어가요' : ''}
        </div>
        <div style={{ fontSize: 12, color: text.length >= CAPTION_MAX ? COLOR.red : COLOR.inkMuted }}>{text.length}/{CAPTION_MAX}자</div>
      </div>

      {/* 버튼 — 문구는 선택사항: 비워두고 저장하면 문구 없이 저장된다 */}
      <div style={{ flexShrink: 0 }}>
        <button
          onClick={() => onSave(text.trim())}
          style={{ ...BUTTON_PRIMARY, width: '100%' }}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

export default function RecordScreen({ onClose, onSave }: RecordScreenProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);
  const { currentSlot: slot, settings } = useApp();
  const defaultMode: Mode = settings.captureMode === 'fixed'
    ? (Object.entries({ 영상: 'video', 사진: 'photo', 음성: 'audio', 글: 'text' } as Record<Mode, RecordType>).find(([, v]) => v === settings.defaultType)?.[0] as Mode ?? '사진')
    : '사진';

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [capturedContent, setCapturedContent] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  // 사진 모드는 촬영/앨범 두 갈래 — 촬영은 photo(풀스크린 장면), 앨범은 meme(폴라로이드/스크랩북 장면)
  const photoSourceRef = useRef<'camera' | 'album'>('camera');
  const pendingMediaRef = useRef<RecordMedia | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);
  // 카메라로 찍은 원본 사진 — 기록을 저장할 때 사진첩(앱)에도 넣는다
  const cameraOriginalRef = useRef<File | null>(null);
  const temporaryUrlRef = useRef<string | null>(null);
  const [retakeKey, setRetakeKey] = useState(0);

  useEffect(() => () => {
    if (temporaryUrlRef.current) URL.revokeObjectURL(temporaryUrlRef.current);
    const media = pendingMediaRef.current;
    if (media) void deleteVideoFromIDB(media.key);
  }, []);

  function clearPendingMedia() {
    if (temporaryUrlRef.current) {
      URL.revokeObjectURL(temporaryUrlRef.current);
      temporaryUrlRef.current = null;
    }
    if (pendingMediaRef.current) {
      void deleteVideoFromIDB(pendingMediaRef.current.key);
      pendingMediaRef.current = null;
    }
    pendingBlobRef.current = null;
    cameraOriginalRef.current = null;
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('사진이 너무 커요. 25MB 이하 파일을 선택해주세요.');
      return;
    }
    setLoading(true);
    try {
      const prepared = await prepareImage(file);
      await assertCaptureCapacity('photo', prepared.blob);
      pendingBlobRef.current = prepared.blob;
      cameraOriginalRef.current = photoSourceRef.current === 'camera' ? file : null;
      setCapturedContent(prepared.preview);
    } catch (error) {
      alert(error instanceof Error ? error.message : '사진을 처리하지 못했어요.');
    } finally {
      setLoading(false);
    }
    e.target.value = '';
  }

  function switchMode(m: Mode) {
    clearPendingMedia();
    setMode(m);
    setCapturedContent(null);
  }

  // 사진 모드의 실제 기록 타입 — 앨범에서 고른 건 meme
  const photoType: RecordType = mode === '사진' && photoSourceRef.current === 'album'
    ? 'meme'
    : MODE_TYPE[mode];

  function retake() {
    clearPendingMedia();
    setCapturedContent(null);
    if (mode === '사진') {
      if (photoSourceRef.current === 'album') albumInputRef.current?.click();
      else photoInputRef.current?.click();
    } else if (mode === '영상') setRetakeKey(k => k + 1);
  }

  async function handleCaptionSave(caption: string) {
    const type = photoType;
    let media = pendingMediaRef.current;
    if (!media && pendingBlobRef.current) {
      const blob = pendingBlobRef.current;
      await assertCaptureCapacity(type === 'text' ? 'photo' : type, blob);
      const key = createStableId('media');
      await saveVideoToIDB(key, blob);
      media = { key, type: blob.type, size: blob.size };
    }
    // 사진첩 저장은 기다리지 않는다 — 실패해도 기록은 그대로 저장된다
    const cameraOriginal = cameraOriginalRef.current;
    if (type === 'photo' && cameraOriginal) void saveCaptureToPhotos(cameraOriginal, 'photo');
    if (type === 'video' && media) {
      void loadVideoBlobFromIDB(media.key).then(blob => blob && saveCaptureToPhotos(blob, 'video'));
    }
    pendingMediaRef.current = null;
    pendingBlobRef.current = null;
    cameraOriginalRef.current = null;
    onSave(type, type === 'audio' ? '' : capturedContent!, caption || undefined, media ?? undefined);
  }

  function renderContent() {
    if (capturedContent) {
      return (
        <CaptionStep
          content={capturedContent}
          type={photoType}
          onSave={handleCaptionSave}
          onRetake={mode !== '음성' ? retake : undefined}
        />
      );
    }
    if (loading) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 14, color: COLOR.inkMuted }}>처리 중…</div>
        </div>
      );
    }
    if (mode === '글') return <TextRecordMode onSave={c => onSave('text', c)} />;
    if (mode === '음성') return <AudioRecordMode onCapture={blob => {
      clearPendingMedia();
      pendingBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      temporaryUrlRef.current = url;
      setCapturedContent(url);
    }} />;
    if (mode === '영상') return (
      <CameraVideoMode
        key={retakeKey}
        onCapture={(thumb, media) => { pendingMediaRef.current = media; setCapturedContent(thumb); }}
      />
    );

    // 사진 — 촬영/앨범 두 갈래 선택 (앨범에서 고른 건 meme 장면으로 들어간다)
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '22px 22px 34px', minHeight: 0 }}>
        <button
          type="button"
          onClick={() => { photoSourceRef.current = 'camera'; photoInputRef.current?.click(); }}
          aria-label="지금 촬영하기"
          style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: COLOR.white, border: `1.5px solid ${COLOR.ink}`, borderRadius: 6, padding: '12px 12px 0', cursor: 'pointer', boxSizing: 'border-box', fontFamily: FONT_BODY }}
        >
          <span aria-hidden="true" style={{ position: 'absolute', top: -10, left: '50%', width: 76, height: 20, marginLeft: -38, background: COLOR.green, transform: 'rotate(-3deg)' }} />
          <span style={{ position: 'relative', flex: 1, width: '100%', background: '#EFE9DC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ViewfinderCorners color={COLOR.ink} bottom={18} />
            <span style={{ fontSize: 13, color: COLOR.inkMuted }}>카메라로 이 순간을 담아요</span>
          </span>
          <span style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <span style={{ width: 58, height: 58, borderRadius: 29, border: `2px solid ${COLOR.ink}`, background: COLOR.white, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              <span style={{ width: 44, height: 44, borderRadius: 22, background: COLOR.red }} />
            </span>
            <span style={{ fontSize: 17, fontWeight: 700, color: COLOR.ink }}>지금 촬영</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => { photoSourceRef.current = 'album'; albumInputRef.current?.click(); }}
          aria-label="앨범에서 선택하기"
          style={{ flexShrink: 0, minHeight: 72, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', ...CARD, textAlign: 'left', cursor: 'pointer', fontFamily: FONT_BODY }}
        >
          <span style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 12, background: '#EFE9DC', border: `1.5px solid ${COLOR.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLOR.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="15" height="14" rx="2" /><path d="M7 2h12a2 2 0 0 1 2 2v12" /><circle cx="8" cy="10" r="1.5" /><path d="M18 16l-4-4-8 7" /></svg>
          </span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLOR.ink }}>앨범에서 선택</span>
            <span style={{ fontSize: 12, color: COLOR.inkMuted }}>기분에 맞는 짤·사진도 좋아요</span>
          </span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLOR.inkSub} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="새 기록" style={SCREEN}>
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} style={{ display: 'none' }} />
      {/* 앨범 선택은 capture 속성 없이 — iOS에서 사진 보관함이 열린다 */}
      <input ref={albumInputRef} type="file" accept="image/*" onChange={handlePhotoFile} style={{ display: 'none' }} />

      <div style={{ padding: `${topPad(52)} 18px 0`, display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr) 44px', alignItems: 'center' }}>
        <button onClick={onClose} aria-label="기록 화면 닫기" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLOR.ink} strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <span style={{ ...TAPE_SKY(-2, 21), justifySelf: 'center', alignSelf: 'center', padding: '2px 14px' }}>{slot} 기록</span>
        <span />
      </div>

      <div style={{ padding: '14px 22px 0' }}>
        <div role="group" aria-label="기록 방식" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, background: COLOR.wash, borderRadius: 14, padding: 4 }}>
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              style={{
                minHeight: 40, borderRadius: 10, boxSizing: 'border-box',
                background: mode === m ? COLOR.white : 'none',
                color: mode === m ? COLOR.ink : COLOR.inkSub,
                fontSize: 14, fontWeight: mode === m ? 700 : 400,
                border: mode === m ? `1.5px solid ${COLOR.ink}` : '1.5px solid transparent',
                cursor: 'pointer', fontFamily: FONT_BODY,
              }}
            >{m}</button>
          ))}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
