import type { MyRecord } from './store';
import { TYPE_COLORS, generateTitle, generateClosing } from './store';

const W = 540;
const H = 960;
const FPS = 24;

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Capture first available frame from a video data URL
// Waits for loadeddata (first frame decoded) before drawing to canvas
async function loadVideoFrame(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const vid = document.createElement('video');
    vid.muted = true;
    vid.playsInline = true;
    const timer = setTimeout(() => resolve(null), 10_000);

    const capture = () => {
      clearTimeout(timer);
      if (!vid.videoWidth || !vid.videoHeight) { resolve(null); return; }
      const c = document.createElement('canvas');
      c.width = vid.videoWidth;
      c.height = vid.videoHeight;
      c.getContext('2d')!.drawImage(vid, 0, 0);
      loadImage(c.toDataURL('image/jpeg', 0.85)).then(resolve);
    };

    vid.onloadeddata = capture;
    vid.onerror = () => { clearTimeout(timer); resolve(null); };
    vid.src = src;
    vid.load();
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, scale = 1) {
  const ia = img.naturalWidth / img.naturalHeight;
  const ca = W / H;
  let sw: number, sh: number;
  if (ia > ca) { sh = H * scale; sw = sh * ia; }
  else { sw = W * scale; sh = sw / ia; }
  ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  let line = '', cy = y;
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy); line = ch; cy += lh;
    } else { line = test; }
  }
  if (line) { ctx.fillText(line, x, cy); cy += lh; }
  return cy;
}

function roundBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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

export async function generateVideo(
  records: MyRecord[],
  dateStr: string,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Preload: photos and video first-frames in parallel
  const imgMap = new Map<string, HTMLImageElement | null>();
  await Promise.all(records.map(async r => {
    if (!r.content.startsWith('data:')) return;
    if (r.type === 'photo') imgMap.set(r.id, await loadImage(r.content));
    if (r.type === 'video') imgMap.set(r.id, await loadVideoFrame(r.content));
  }));

  const title = generateTitle(records);
  const closing = generateClosing(records);

  if (typeof MediaRecorder === 'undefined') throw new Error('이 브라우저는 영상 생성을 지원하지 않아요');

  const mimeType = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ].find(t => MediaRecorder.isTypeSupported(t));

  if (!mimeType) throw new Error('이 브라우저는 영상 생성을 지원하지 않아요\n(Chrome 또는 Android에서 시도해 보세요)');

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(200);
  await new Promise<void>(r => setTimeout(r, 100));

  const TITLE_DUR = 2;
  const RECORD_DUR = 3;
  const CLOSE_DUR = 2;
  const totalFrames = Math.round((TITLE_DUR + records.length * RECORD_DUR + CLOSE_DUR) * FPS);
  let framesDone = 0;
  const tick = () => { framesDone++; onProgress?.(Math.min(framesDone / totalFrames, 0.99)); };

  // Title card
  await renderSegment(TITLE_DUR, (_t) => {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#D5EADC'); grad.addColorStop(0.52, '#E2DBF0'); grad.addColorStop(1, '#EFE2D5');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.font = `bold 26px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(26,26,26,0.45)';
    ctx.fillText('MYHOUR', 40, H * 0.32);
    ctx.font = `300 24px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(26,26,26,0.5)';
    ctx.fillText(dateStr, 40, H * 0.32 + 46);
    ctx.font = `600 46px system-ui, sans-serif`;
    ctx.fillStyle = '#1A1A1A';
    wrapText(ctx, title, 40, H * 0.48, W - 80, 62);
    ctx.font = `400 24px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(26,26,26,0.5)';
    ctx.fillText(`${records.length}개의 순간`, 40, H * 0.72);
  }, tick);

  // Each record
  for (const record of records) {
    const bg = TYPE_COLORS[record.type];
    const img = imgMap.get(record.id) ?? null;

    await renderSegment(RECORD_DUR, (t) => {
      if (record.type === 'text') {
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.font = `bold 22px "Courier New", monospace`;
        ctx.fillStyle = 'rgba(26,26,26,0.4)';
        ctx.fillText(record.slotTime, 40, 70);
        ctx.font = `400 38px system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(26,26,26,0.85)';
        wrapText(ctx, record.content, 40, H * 0.38, W - 80, 56);
        if (record.caption) {
          ctx.font = `500 26px system-ui, sans-serif`;
          ctx.fillStyle = 'rgba(26,26,26,0.5)';
          ctx.fillText(record.caption, 40, H - 70);
        }

      } else if (record.type === 'photo' || record.type === 'video') {
        if (img) {
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
          // Photos get a subtle zoom; video frame stays still
          const scale = record.type === 'photo' ? 1 + t * 0.04 : 1;
          ctx.save();
          ctx.translate(W / 2, H / 2); ctx.scale(scale, scale); ctx.translate(-W / 2, -H / 2);
          drawCover(ctx, img);
          ctx.restore();
          const grd = ctx.createLinearGradient(0, H * 0.55, 0, H);
          grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.65)');
          ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
        } else {
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        }
        if (record.type === 'video' && !img) {
          // fallback play icon when frame extraction failed
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath(); ctx.arc(W / 2, H / 2, 44, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1A1A1A';
          ctx.beginPath();
          ctx.moveTo(W / 2 - 10, H / 2 - 18);
          ctx.lineTo(W / 2 + 20, H / 2);
          ctx.lineTo(W / 2 - 10, H / 2 + 18);
          ctx.closePath(); ctx.fill();
        }
        const dark = !!img;
        ctx.font = `bold 22px "Courier New", monospace`;
        ctx.fillStyle = dark ? 'rgba(255,255,255,0.8)' : 'rgba(26,26,26,0.4)';
        ctx.fillText(record.slotTime, 30, H - (record.caption ? 74 : 46));
        if (record.caption) {
          ctx.font = `500 30px system-ui, sans-serif`;
          ctx.fillStyle = dark ? '#fff' : 'rgba(26,26,26,0.7)';
          ctx.fillText(record.caption, 30, H - 36);
        }

      } else if (record.type === 'audio') {
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.font = `bold 22px "Courier New", monospace`;
        ctx.fillStyle = 'rgba(26,26,26,0.4)';
        ctx.fillText(record.slotTime, 40, 70);
        const bars = 22, bW = 16, gap = 10;
        const totalBW = bars * (bW + gap) - gap;
        const bx = (W - totalBW) / 2, cy = H / 2;
        for (let i = 0; i < bars; i++) {
          const phase = (i / bars) * Math.PI * 3 + t * Math.PI * 6;
          const bh = 24 + Math.abs(Math.sin(phase)) * 160;
          ctx.fillStyle = 'rgba(124,92,196,0.55)';
          roundBar(ctx, bx + i * (bW + gap), cy - bh / 2, bW, bh, 4);
          ctx.fill();
        }
        if (record.caption) {
          ctx.font = `500 26px system-ui, sans-serif`;
          ctx.fillStyle = 'rgba(26,26,26,0.5)';
          ctx.fillText(record.caption, 40, H - 70);
        }
      }
    }, tick);
  }

  // Closing card
  await renderSegment(CLOSE_DUR, (_t) => {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#EFE2D5'); grad.addColorStop(0.5, '#E2DBF0'); grad.addColorStop(1, '#D5EADC');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.font = `300 32px Georgia, serif`;
    ctx.fillStyle = 'rgba(26,26,26,0.72)';
    wrapText(ctx, `"${closing}"`, 40, H * 0.42, W - 80, 50);
    ctx.font = `bold 22px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(26,26,26,0.28)';
    ctx.fillText('MYHOUR', 40, H - 52);
  }, tick);

  onProgress?.(1);
  recorder.stop();
  await new Promise<void>(res => { recorder.onstop = () => res(); });
  return new Blob(chunks, { type: mimeType });
}
