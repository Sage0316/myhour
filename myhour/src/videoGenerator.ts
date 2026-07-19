import type { MyRecord } from './store';
import { TYPE_COLORS, MOOD_LIST, guessMood, generateTitle, generateClosing, loadVideoFromIDB } from './store';
import {
  W, H, PAPER,
  drawCover, drawVideoCover,
  fallbackEmojisFor, splitEmojis, ensureDiaryFont,
  drawTitleScene, drawDiaryScene, drawPhotoScene, drawAudioScene, drawVideoOverlay, drawClosingScene,
} from './scenes';

const FPS = 24;

// Safari는 fetch(dataURL)이 불안정해서 base64를 직접 디코딩한다
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// Safari 구버전은 콜백형 decodeAudioData만 동작하는 경우가 있어 둘 다 지원
function decodeAudioCompat(ctx: AudioContext, raw: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((res, rej) => {
    try {
      const p = ctx.decodeAudioData(raw, res, rej);
      if (p && typeof (p as Promise<AudioBuffer>).then === 'function') {
        (p as Promise<AudioBuffer>).then(res, rej);
      }
    } catch (e) { rej(e); }
  });
}

// 녹음의 진폭 엔벨로프 추출 — 음성 장면의 실제 파형용
function computeEnvelope(buf: AudioBuffer, buckets = 44): number[] {
  const ch = buf.getChannelData(0);
  const per = Math.max(1, Math.floor(ch.length / buckets));
  const env: number[] = [];
  let max = 0;
  for (let i = 0; i < buckets; i++) {
    let sum = 0, count = 0;
    const start = i * per;
    for (let j = 0; j < per; j += 16) { sum += Math.abs(ch[start + j] ?? 0); count++; }
    const v = count > 0 ? sum / count : 0;
    env.push(v);
    if (v > max) max = v;
  }
  return env.map(v => (max > 0 ? v / max : 0));
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

type DrawFn = (t: number, frame: number) => void;

async function renderSegment(duration: number, draw: DrawFn, onFrame?: () => void) {
  const frames = Math.round(duration * FPS);
  const frameMs = 1000 / FPS;
  for (let f = 0; f < frames; f++) {
    draw(f / frames, f);
    onFrame?.();
    await new Promise<void>(r => setTimeout(r, frameMs));
  }
}

// Render a video clip by actually playing it on canvas — gives true motion
async function renderVideoClip(
  ctx: CanvasRenderingContext2D,
  blobUrl: string,
  duration: number,
  record: MyRecord,
  tick: () => void,
): Promise<void> {
  const vid = document.createElement('video');
  vid.muted = true;
  vid.playsInline = true;
  vid.loop = true;

  const loaded = await new Promise<boolean>(res => {
    const timeout = setTimeout(() => res(false), 10_000);
    vid.onloadeddata = () => { clearTimeout(timeout); res(true); };
    vid.onerror = () => { clearTimeout(timeout); res(false); };
    vid.src = blobUrl;
    vid.load();
  });

  if (!loaded || !vid.videoWidth) {
    // Fallback: color block with play icon
    await renderSegment(duration, () => {
      ctx.fillStyle = TYPE_COLORS['video'];
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 44, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1A1A1A';
      ctx.beginPath();
      ctx.moveTo(W / 2 - 12, H / 2 - 18);
      ctx.lineTo(W / 2 + 20, H / 2);
      ctx.lineTo(W / 2 - 12, H / 2 + 18);
      ctx.closePath(); ctx.fill();
    }, tick);
    return;
  }

  await vid.play().catch(() => {});

  const frameMs = 1000 / FPS;
  const totalFrames = Math.round(duration * FPS);

  for (let f = 0; f < totalFrames; f++) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (vid.readyState >= 2) {
      drawVideoCover(ctx, vid);
      const grd = ctx.createLinearGradient(0, H * 0.55, 0, H);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    drawVideoOverlay(ctx, record);

    tick();
    await new Promise<void>(r => setTimeout(r, frameMs));
  }

  vid.pause();
}

export async function generateVideo(
  records: MyRecord[],
  dateStr: string,
  onProgress?: (pct: number) => void,
  overrides?: { title?: string; closing?: string; bgmUrl?: string; emojis?: string; mood?: string; captions?: string[]; diaryEmojis?: string[] },
  onWarn?: (msg: string) => void,
): Promise<Blob> {
  // 레이아웃 좌표계는 540×960을 유지하되 실제 픽셀은 2배(1080×1920)로 렌더링
  const SCALE = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // AudioContext는 사용자 탭 제스처가 살아있는 동안(다른 await보다 먼저) 만들어야 한다.
  // 늦게 만들면 iOS에서 suspended 상태로 생성돼 BGM 디코딩이 멈출 수 있다.
  const needAudio = !!overrides?.bgmUrl || records.some(r => r.type === 'audio' || r.type === 'video');
  let audioCtx: AudioContext | null = null;
  if (needAudio) {
    try {
      type AC = typeof AudioContext;
      const Ctor: AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: AC }).webkitAudioContext;
      audioCtx = new Ctor();
      audioCtx.resume().catch(() => {});
    } catch { audioCtx = null; }
  }

  // 손글씨 폰트 — 최대 4초만 기다리고, 안 되면 폴백 폰트로 진행
  await Promise.race([
    ensureDiaryFont(),
    new Promise<void>(r => setTimeout(r, 4000)),
  ]);

  // Preload images for photos; blob URLs for videos; decoded buffers for voice memos
  const imgMap = new Map<string, HTMLImageElement | null>();
  const blobUrlMap = new Map<string, string>(); // videoId → blob URL
  const voiceBufMap = new Map<string, AudioBuffer>();
  const clipDurMap = new Map<string, number>(); // videoId → 클립 길이(초)

  const loadClipDuration = (url: string): Promise<number | null> => new Promise(res => {
    const v = document.createElement('video');
    const timeout = setTimeout(() => res(null), 5000);
    v.onloadedmetadata = () => {
      clearTimeout(timeout);
      res(Number.isFinite(v.duration) ? v.duration : null);
    };
    v.onerror = () => { clearTimeout(timeout); res(null); };
    v.src = url;
  });

  const decodeWithTimeout = (raw: ArrayBuffer): Promise<AudioBuffer> => Promise.race([
    decodeAudioCompat(audioCtx!, raw),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('decode timeout')), 8000)),
  ]);

  await Promise.all(records.map(async r => {
    if (r.type === 'photo') {
      if (r.content.startsWith('data:')) imgMap.set(r.id, await loadImage(r.content));
    } else if (r.type === 'video') {
      if (r.videoKey) {
        const url = await loadVideoFromIDB(r.videoKey);
        if (url) {
          blobUrlMap.set(r.id, url);
          const d = await loadClipDuration(url);
          if (d) clipDurMap.set(r.id, d);
          return;
        }
      }
      // fallback thumbnail
      if (r.content.startsWith('data:')) imgMap.set(r.id, await loadImage(r.content));
    } else if (r.type === 'audio') {
      if (!audioCtx) { onWarn?.(`음성(${r.slotTime}): 오디오 컨텍스트 없음`); return; }
      if (!r.content.startsWith('data:')) { onWarn?.(`음성(${r.slotTime}): 데이터 형식 이상 (${r.content.slice(0, 20)})`); return; }
      try {
        voiceBufMap.set(r.id, await decodeWithTimeout(dataUrlToArrayBuffer(r.content)));
      } catch (e) {
        const mime = r.content.slice(5, r.content.indexOf(';'));
        onWarn?.(`음성(${r.slotTime}) 디코딩 실패 [${mime}]: ${e instanceof Error ? (e.name + ' ' + e.message) : String(e)}`);
      }
    }
  }));

  const title = overrides?.title ?? generateTitle(records);
  const closing = overrides?.closing ?? generateClosing(records);
  const moodName = overrides?.mood ?? guessMood(records).mood;
  const moodColor = MOOD_LIST.find(m => m.mood === moodName)?.dot ?? '#7C5CC4';
  const emojiSet = overrides?.emojis
    ? splitEmojis(overrides.emojis)
    : fallbackEmojisFor(moodName);

  if (typeof MediaRecorder === 'undefined') throw new Error('이 브라우저는 영상 생성을 지원하지 않아요');

  const mimeType = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ].find(t => MediaRecorder.isTypeSupported(t));

  if (!mimeType) throw new Error('이 브라우저는 영상 생성을 지원하지 않아요\n(Chrome 또는 Android에서 시도해 보세요)');

  const stream = canvas.captureStream(FPS);

  // 오디오 믹싱 그래프: BGM과 음성 메모가 하나의 destination으로 합쳐진다
  let audioDest: MediaStreamAudioDestinationNode | null = null;
  if (audioCtx) {
    try {
      audioDest = audioCtx.createMediaStreamDestination();
      for (const track of audioDest.stream.getAudioTracks()) stream.addTrack(track);
    } catch { audioDest = null; }
  }

  // BGM: decode the track and mix it into the recording stream.
  // Any failure (decode timeout 포함) falls back — 음성 메모 믹싱은 유지된다.
  const BGM_LEVEL = 0.55;
  let bgmGain: GainNode | null = null;
  let bgmSource: AudioBufferSourceNode | null = null;
  if (overrides?.bgmUrl && audioCtx && audioDest) {
    try {
      const raw = await fetch(overrides.bgmUrl).then(r => {
        if (!r.ok) throw new Error(`bgm ${r.status}`);
        return r.arrayBuffer();
      });
      const audioBuf = await Promise.race([
        decodeAudioCompat(audioCtx, raw),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('bgm decode timeout')), 8000)),
      ]);
      bgmSource = audioCtx.createBufferSource();
      bgmSource.buffer = audioBuf;
      bgmSource.loop = true;
      bgmGain = audioCtx.createGain();
      bgmGain.gain.setValueAtTime(0, audioCtx.currentTime);
      bgmGain.gain.linearRampToValueAtTime(BGM_LEVEL, audioCtx.currentTime + 1);
      bgmSource.connect(bgmGain);
      bgmGain.connect(audioDest);
      // 곡의 랜덤 지점에서 시작 — 같은 곡이라도 매번 다른 구간이 깔린다 (루프라 끝나면 처음으로)
      const startOffset = Math.random() * Math.max(0, audioBuf.duration - 5);
      bgmSource.start(0, startOffset);
    } catch {
      bgmGain = null; bgmSource = null;
    }
  }

  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 7_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(200);
  await new Promise<void>(r => setTimeout(r, 100));

  const TITLE_DUR = 2;
  const RECORD_DUR = 3;
  const CLOSE_DUR = 2;
  const MEDIA_MAX = 5; // 영상·음성 장면 상한 — 몽타주 리듬 유지
  const segDurations = records.map(r => {
    if (r.type === 'audio') {
      const buf = voiceBufMap.get(r.id);
      return buf ? Math.min(Math.max(buf.duration + 0.3, RECORD_DUR), MEDIA_MAX) : RECORD_DUR;
    }
    if (r.type === 'video') {
      const d = clipDurMap.get(r.id);
      return d ? Math.min(Math.max(d, RECORD_DUR), MEDIA_MAX) : RECORD_DUR;
    }
    return RECORD_DUR;
  });
  const totalFrames = Math.round((TITLE_DUR + segDurations.reduce((a, b) => a + b, 0) + CLOSE_DUR) * FPS);
  let framesDone = 0;
  const tick = () => { framesDone++; onProgress?.(Math.min(framesDone / totalFrames, 0.99)); };

  await renderSegment(TITLE_DUR, (t) => {
    drawTitleScene(ctx, { title, dateStr, count: records.length, types: records.map(r => r.type) }, t);
  }, tick);

  // Each record — AI 자막은 사용자가 캡션을 직접 쓰지 않은 기록에만 들어가고,
  // 글 기록에서는 본문과 겹치는 자막이면 아예 뺀다
  const norm = (s: string) => s.replace(/[\s.,!?~'"“”‘’…]/g, '');
  for (let ri = 0; ri < records.length; ri++) {
    let aiCaption = overrides?.captions?.[ri]?.trim();
    if (aiCaption && records[ri].type === 'text') {
      const a = norm(aiCaption), b = norm(records[ri].content);
      if (!a || (b && (a.includes(b) || b.includes(a)))) aiCaption = undefined;
    }
    const record = !records[ri].caption && aiCaption
      ? { ...records[ri], caption: aiCaption }
      : records[ri];

    if (record.type === 'video') {
      const blobUrl = blobUrlMap.get(record.id);
      if (blobUrl) {
        const dur = segDurations[ri];
        // 클립의 원본 소리를 믹스에 얹는다 (best-effort — 디코딩 실패 시 무음 진행)
        let clipSrc: AudioBufferSourceNode | null = null;
        if (audioCtx && audioDest) {
          try {
            const raw = await fetch(blobUrl).then(r => r.arrayBuffer());
            const clipBuf = await decodeWithTimeout(raw);
            clipSrc = audioCtx.createBufferSource();
            clipSrc.buffer = clipBuf;
            clipSrc.loop = true; // 화면의 클립도 루프되므로 소리도 함께 돈다
            const cGain = audioCtx.createGain();
            const now = audioCtx.currentTime;
            cGain.gain.setValueAtTime(1, now);
            // 장면이 끝나며 잘릴 때 뚝 끊기지 않게 페이드아웃
            cGain.gain.setValueAtTime(1, now + Math.max(0, dur - 0.4));
            cGain.gain.linearRampToValueAtTime(0, now + dur);
            clipSrc.connect(cGain);
            cGain.connect(audioDest);
            if (bgmGain) {
              bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
              bgmGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
            }
            clipSrc.start();
          } catch { clipSrc = null; }
        }
        await renderVideoClip(ctx, blobUrl, dur, record, tick);
        try { clipSrc?.stop(); } catch { /* already ended */ }
        if (clipSrc && bgmGain && audioCtx) {
          bgmGain.gain.setValueAtTime(bgmGain.gain.value, audioCtx.currentTime);
          bgmGain.gain.linearRampToValueAtTime(BGM_LEVEL, audioCtx.currentTime + 0.4);
        }
      } else {
        // Fallback: thumbnail image or color block
        const img = imgMap.get(record.id) ?? null;
        await renderSegment(RECORD_DUR, () => {
          if (img) {
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
            drawCover(ctx, img);
            const grd = ctx.createLinearGradient(0, H * 0.55, 0, H);
            grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.65)');
            ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
            drawVideoOverlay(ctx, record);
          } else {
            // 썸네일조차 없으면 밝은 배경 — 흰 오버레이 대신 어두운 글자로
            ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
            ctx.font = `bold 13px "Courier New", monospace`;
            ctx.fillStyle = 'rgba(26,26,26,0.4)';
            ctx.fillText(record.slotTime, 44, H - (record.caption ? 100 : 56));
            if (record.caption) {
              ctx.font = `600 26px system-ui, sans-serif`;
              ctx.fillStyle = 'rgba(26,26,26,0.85)';
              ctx.fillText(record.caption, 44, H - 60);
            }
          }
        }, tick);
      }

    } else if (record.type === 'photo') {
      const img = imgMap.get(record.id) ?? null;
      await renderSegment(RECORD_DUR, (t) => {
        drawPhotoScene(ctx, record, img, emojiSet, t);
      }, tick);

    } else if (record.type === 'text') {
      const contentEmoji = overrides?.diaryEmojis?.[ri]?.trim() || null;
      await renderSegment(RECORD_DUR, (t) => {
        drawDiaryScene(ctx, record, emojiSet, t, contentEmoji);
      }, tick);

    } else if (record.type === 'audio') {
      const dur = segDurations[ri];
      // 녹음된 목소리를 재생하고, 그동안 BGM은 낮춘다 (ducking)
      const buf = voiceBufMap.get(record.id);
      let voiceSrc: AudioBufferSourceNode | null = null;
      if (buf && audioCtx && audioDest) {
        try {
          voiceSrc = audioCtx.createBufferSource();
          voiceSrc.buffer = buf;
          const vGain = audioCtx.createGain();
          const now = audioCtx.currentTime;
          vGain.gain.setValueAtTime(1, now);
          // 녹음이 장면보다 길어 잘릴 때 뚝 끊기지 않게 페이드아웃
          if (buf.duration > dur) {
            vGain.gain.setValueAtTime(1, now + Math.max(0, dur - 0.4));
            vGain.gain.linearRampToValueAtTime(0, now + dur);
          }
          voiceSrc.connect(vGain);
          vGain.connect(audioDest);
          if (bgmGain) {
            bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
            bgmGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
          }
          voiceSrc.start();
        } catch { voiceSrc = null; }
      }
      const envelope = buf ? computeEnvelope(buf) : null;
      await renderSegment(dur, (t) => {
        // 진행률은 실제 재생 위치 기준 — 녹음이 장면보다 길면 잘리는 지점까지만 차오른다
        const progress = buf ? Math.min((t * dur) / buf.duration, 1) : t;
        drawAudioScene(ctx, record, t, envelope, progress, moodColor);
      }, tick);
      try { voiceSrc?.stop(); } catch { /* already ended */ }
      if (bgmGain && audioCtx) {
        bgmGain.gain.setValueAtTime(bgmGain.gain.value, audioCtx.currentTime);
        bgmGain.gain.linearRampToValueAtTime(BGM_LEVEL, audioCtx.currentTime + 0.4);
      }
    }
  }

  await renderSegment(CLOSE_DUR, (t) => {
    drawClosingScene(ctx, { closing, dateStr }, t);
  }, tick);

  // Fade the BGM out over the last moments, then stop recording
  if (audioCtx && bgmGain) {
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, audioCtx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
    await new Promise<void>(r => setTimeout(r, 850));
  }

  onProgress?.(1);
  recorder.stop();
  await new Promise<void>(res => { recorder.onstop = () => res(); });

  bgmSource?.stop();
  audioCtx?.close().catch(() => {});

  // Cleanup blob URLs
  for (const url of blobUrlMap.values()) URL.revokeObjectURL(url);

  return new Blob(chunks, { type: mimeType });
}
