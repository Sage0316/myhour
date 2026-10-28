// 첫 장면(제목) — 공책 표지. 2026-10-28 펌킨이 고른 핀터레스트 분위기(빨간 깅엄 표지·하트 체크 컴포지션북 —
// 패치워크는 사용자 요청으로 마지막 장면으로 옮겼다)를 사진 없이 캔버스로 그렸다. 마지막 장면처럼 날짜마다 차례로 돌아간다.
import { W, H, HAND, seededRnd } from './scenes';
import { C, noShadow, rotateAround, softShadow, wrapWords } from './scenesDakku';

export interface CoverOpts {
  title: string;
  /** 화면에 쓰는 날짜 ("10월 28일 수요일") */
  dateStr: string;
  count: number;
  /** 장면을 고르는 날짜 (YYYY-MM-DD) */
  date?: string;
  /** 미리보기용: 라벨 모양을 직접 고른다 (LABEL_SHAPES 번호) */
  labelShape?: number;
}

function ease(t: number, dur = 0.3) { return Math.min(1, t / dur); }

export function weave(ctx: CanvasRenderingContext2D, x = 0, y = 0, w = W, h = H, alpha = 0.06) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1);
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.7})`;
  for (let xx = x; xx < x + w; xx += 3) ctx.fillRect(xx, y, 1, h);
}

export function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20);
  ctx.beginPath(); ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-14, -4, -8, -16, 0, -8); ctx.bezierCurveTo(8, -16, 14, -4, 0, 6);
  ctx.restore();
}

export function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5 + rot;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** 금박 별 스티커 */
export function goldStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, '#F3D77E'); g.addColorStop(0.5, '#C9A13B'); g.addColorStop(1, '#E8C665');
  ctx.fillStyle = g; starPath(ctx, x, y, r, rot * Math.PI / 180); ctx.fill();
  ctx.restore();
}

/** 손글씨 문장을 가운데 정렬로 (넘치면 글자를 줄인다) */
function centerHand(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, size: number, color: string) {
  ctx.font = `${size}px ${HAND}`;
  while (size > 22 && ctx.measureText(text).width > maxW) { size -= 2; ctx.font = `${size}px ${HAND}`; }
  ctx.fillStyle = color; ctx.textAlign = 'center';
  ctx.fillText(text, cx, y, maxW);
  ctx.textAlign = 'left';
}

/** 타원 라벨 위쪽 테두리를 따라 휘어진 글자 ("composition book" 자리) */
function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, rx: number, ry: number, color: string, size = 22) {
  ctx.font = `${size}px ${HAND}`;
  ctx.fillStyle = color;
  const chars = [...text];
  const spread = 0.9; // 라디안
  chars.forEach((ch, i) => {
    const a = -Math.PI / 2 - spread / 2 + (spread * (i + 0.5)) / chars.length;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
}

// ─── 라벨 4종 (날짜마다 표지와 따로 랜덤으로 고른다) ─────────────────────────

type LabelShape = 'oval' | 'hex' | 'bracket' | 'sparkle';
export const LABEL_SHAPES: LabelShape[] = ['oval', 'hex', 'bracket', 'sparkle'];

/** 손으로 그린 타원 (조금 삐뚤게) */
function ovalPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, seed: string) {
  const rnd = seededRnd(seed);
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const wob = 1 + Math.sin(a * 3 + rnd()) * 0.008;
    ctx.lineTo(cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob);
  }
  ctx.closePath();
}

/** 위아래가 살짝 뾰족한 육각 라벨 (라벤더 깅엄 레퍼런스) */
function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, r = 18) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, peak = 24;
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0 + peak);
  ctx.quadraticCurveTo(cx, y0 - peak * 0.3, x1 - r, y0 + peak);
  ctx.quadraticCurveTo(x1, y0 + peak + 4, x1, y0 + peak + r);
  ctx.lineTo(x1, y1 - peak - r);
  ctx.quadraticCurveTo(x1, y1 - peak - 4, x1 - r, y1 - peak);
  ctx.quadraticCurveTo(cx, y1 + peak * 0.3, x0 + r, y1 - peak);
  ctx.quadraticCurveTo(x0, y1 - peak - 4, x0, y1 - peak - r);
  ctx.lineTo(x0, y0 + peak + r);
  ctx.quadraticCurveTo(x0, y0 + peak + 4, x0 + r, y0 + peak);
  ctx.closePath();
}

/** 옛날 컴포지션북 라벨 — 양옆이 오목하게 파이고 위아래 가운데가 둥글게 솟은 모양 */
function bracketPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, bump = 26, notch = 22;
  ctx.beginPath();
  ctx.moveTo(x0 + notch, y0);
  ctx.lineTo(cx - 60, y0);
  ctx.quadraticCurveTo(cx, y0 - bump * 2, cx + 60, y0);
  ctx.lineTo(x1 - notch, y0);
  ctx.quadraticCurveTo(x1 - notch, y0 + notch, x1, y0 + notch);
  ctx.quadraticCurveTo(x1 - notch * 1.6, cy, x1, y1 - notch);
  ctx.quadraticCurveTo(x1 - notch, y1 - notch, x1 - notch, y1);
  ctx.lineTo(cx + 60, y1);
  ctx.quadraticCurveTo(cx, y1 + bump * 2, cx - 60, y1);
  ctx.lineTo(x0 + notch, y1);
  ctx.quadraticCurveTo(x0 + notch, y1 - notch, x0, y1 - notch);
  ctx.quadraticCurveTo(x0 + notch * 1.6, cy, x0, y0 + notch);
  ctx.quadraticCurveTo(x0 + notch, y0 + notch, x0 + notch, y0);
  ctx.closePath();
}

function tinySparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r * 0.6, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r * 0.6, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** 줄 세 개 위에 제목·날짜·기록 수 */
function labelLines(ctx: CanvasRenderingContext2D, o: CoverOpts, cx: number, cy: number, ink: string, half: number) {
  const lines = [[-half, half, -8], [-half - 20, half + 20, 50], [-half + 40, half - 40, 108]] as const;
  ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const [x1, x2, y] of lines) {
    ctx.beginPath(); ctx.moveTo(cx + x1, cy + y + 2); ctx.quadraticCurveTo(cx, cy + y - 3, cx + x2, cy + y); ctx.stroke();
  }
  ctx.font = `44px ${HAND}`;
  const title = wrapWords(ctx, o.title, half * 2 - 10, 1)[0] ?? o.title;
  centerHand(ctx, title, cx, cy - 18, half * 2, 44, C.ink);
  centerHand(ctx, o.dateStr, cx, cy + 40, half * 2 + 30, 30, C.ink);
  centerHand(ctx, `오늘의 기록 ${o.count}개`, cx, cy + 98, half * 2 - 80, 24, 'rgba(43,38,34,0.7)');
}

/** 표지 가운데 흰 라벨. 모양은 날짜로 고르고, 안에는 늘 제목·날짜·기록 수가 들어간다 */
function coverLabel(ctx: CanvasRenderingContext2D, o: CoverOpts, cx: number, cy: number, ink: string, t: number) {
  const e = ease(t);
  const shape = LABEL_SHAPES[o.labelShape ?? labelShapeIndex(o.date, o.dateStr)];
  const seed = `label-${o.date ?? o.dateStr}`;
  ctx.save();
  ctx.globalAlpha = e;
  rotateAround(ctx, cx, cy, shape === 'sparkle' ? 0 : -2);
  ctx.translate(0, (1 - e) * 14);
  if (shape === 'oval') {
    ovalPath(ctx, cx, cy + 10, 215, 140, seed);
    softShadow(ctx); ctx.fillStyle = '#FFFFFF'; ctx.fill(); noShadow(ctx);
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
    arcText(ctx, 'hakku diary', cx, cy + 10, 181, 110, ink, 24);
  } else if (shape === 'hex') {
    hexPath(ctx, cx, cy + 34, 420, 290, 22);
    softShadow(ctx); ctx.fillStyle = '#F5F2EC'; ctx.fill(); noShadow(ctx);
    hexPath(ctx, cx, cy + 34, 394, 262, 18);
    ctx.strokeStyle = 'rgba(120,100,80,0.8)'; ctx.lineWidth = 3; ctx.stroke();
    centerHand(ctx, 'hakku diary', cx, cy - 58, 200, 24, 'rgba(120,100,80,0.9)');
  } else if (shape === 'bracket') {
    bracketPath(ctx, cx, cy + 40, 410, 250);
    softShadow(ctx); ctx.fillStyle = '#FFFFFF'; ctx.fill(); noShadow(ctx);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
    ctx.font = `bold 20px Georgia, 'Times New Roman', serif`;
    ctx.fillStyle = C.ink; ctx.textAlign = 'center';
    ctx.fillText('HAKKU DIARY', cx, cy - 56);
    ctx.textAlign = 'left';
  } else {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(cx, cy + 44, 220, 92, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill(); ctx.stroke();
    tinySparkle(ctx, cx - 190, cy - 40, 14, '#7FB2E5');
    tinySparkle(ctx, cx + 200, cy + 130, 14, '#4B3A8C');
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    for (const [x, y] of [[cx + 170, cy - 46], [cx + 186, cy - 34]]) {
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
    }
  }
  if (shape === 'sparkle') {
    // 얇은 타원 안에는 제목·날짜만 (줄 없이)
    ctx.font = `44px ${HAND}`;
    const title = wrapWords(ctx, o.title, 360, 1)[0] ?? o.title;
    centerHand(ctx, title, cx, cy + 34, 370, 44, C.ink);
    centerHand(ctx, `${o.dateStr} · 기록 ${o.count}개`, cx, cy + 82, 370, 26, 'rgba(43,38,34,0.75)');
  } else {
    labelLines(ctx, o, cx, cy, ink === C.ink ? C.ink : ink, shape === 'oval' ? 150 : 155);
  }
  ctx.restore();
}

// ─── 표지 공용 ──────────────────────────────────────────────────────────────

/** 왼쪽 책등 천 테이프 */
function spine(ctx: CanvasRenderingContext2D, color: string, width = 56, seed = 'spine') {
  ctx.fillStyle = color; ctx.fillRect(0, 0, width, H);
  const rnd = seededRnd(seed);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 260; i++) ctx.fillRect(rnd() * width, rnd() * H, 3, 1.5);
  ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(width - 4, 0, 4, H);
}

function dots(ctx: CanvasRenderingContext2D, x0: number, color: string, step: number, r: number, jitter = 0, seed = 'dots') {
  const rnd = seededRnd(seed);
  ctx.fillStyle = color;
  for (let y = step / 2, row = 0; y < H + step; y += step * 0.86, row++) {
    for (let x = x0 + (row % 2 ? step / 2 : 0) + step / 4; x < W + step; x += step) {
      ctx.beginPath(); ctx.arc(x + (rnd() - 0.5) * jitter, y + (rnd() - 0.5) * jitter, r, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ─── 1. 빨간 깅엄 표지 ──────────────────────────────────────────────────────

function coverRedGingham(ctx: CanvasRenderingContext2D, o: CoverOpts, t: number) {
  ctx.fillStyle = '#F4EAD5'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(212,38,38,0.55)';
  for (let x = 0; x < W; x += 72) ctx.fillRect(x, 0, 36, H);
  for (let y = 0; y < H; y += 72) ctx.fillRect(0, y, W, 36);
  weave(ctx);
  coverLabel(ctx, o, W / 2, H * 0.4, C.ink, t);
}

// ─── 2. 하트 체크 컴포지션북 ────────────────────────────────────────────────

function coverHeartComposition(ctx: CanvasRenderingContext2D, o: CoverOpts, t: number) {
  const sw = 56;
  ctx.fillStyle = '#F3E1BF'; ctx.fillRect(sw, 0, W - sw, H);
  ctx.fillStyle = 'rgba(70,72,110,0.6)';
  for (let x = sw; x < W; x += 92) ctx.fillRect(x, 0, 40, H);
  for (let y = 0; y < H; y += 92) ctx.fillRect(sw, y, W - sw, 40);
  ctx.fillStyle = 'rgba(50,52,90,0.75)';
  for (let x = sw + 60; x < W; x += 92) { ctx.fillRect(x, 0, 3, H); ctx.fillRect(x + 8, 0, 3, H); }
  for (let y = 60; y < H; y += 92) { ctx.fillRect(sw, y, W - sw, 3); ctx.fillRect(sw, y + 8, W - sw, 3); }
  ctx.fillStyle = '#B3262E';
  for (let y = 20, r = 0; y < H + 40; y += 92, r++) for (let x = sw + (r % 2 ? 90 : 44); x < W; x += 92) {
    heartPath(ctx, x, y + 46, 20); ctx.fill();
  }
  spine(ctx, '#8D93B5', sw);
  coverLabel(ctx, o, W / 2 + sw / 2, H * 0.36, '#3A3D5C', t);
}

// ─── 3. 네이비 도트 천 ──────────────────────────────────────────────────────

function coverNavyDots(ctx: CanvasRenderingContext2D, o: CoverOpts, t: number) {
  ctx.fillStyle = '#2C3E66'; ctx.fillRect(0, 0, W, H);
  weave(ctx, 0, 0, W, H, 0.025);
  dots(ctx, 0, 'rgba(226,210,170,0.85)', 34, 2.6, 8, 'navy-dots');
  coverLabel(ctx, o, W / 2, H * 0.4, C.ink, t);
}

// ─── 4. 라벤더 깅엄 + 책등 ──────────────────────────────────────────────────

function coverLavenderGingham(ctx: CanvasRenderingContext2D, o: CoverOpts, t: number) {
  const sw = 56;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(150,135,185,0.42)';
  for (let x = sw; x < W; x += 52) ctx.fillRect(x, 0, 22, H);
  for (let y = 0; y < H; y += 52) ctx.fillRect(sw, y, W - sw, 22);
  spine(ctx, '#A091BC', sw, 'lavender');
  coverLabel(ctx, o, W / 2 + sw / 2, H * 0.36, '#5C5070', t);
}

// ─── 5. 민트 + 브라운 도트 ──────────────────────────────────────────────────

function coverMintDots(ctx: CanvasRenderingContext2D, o: CoverOpts, t: number) {
  ctx.fillStyle = '#BFE3D6'; ctx.fillRect(0, 0, W, H);
  dots(ctx, 0, '#7A5A4E', 44, 5.5, 0, 'mint');
  coverLabel(ctx, o, W / 2, H * 0.4, '#5A4038', t);
}

// ─── 6. 크림 니트 + 검정 책등 + 분홍 반짝이 별 ──────────────────────────────

function knitStitches(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let x = x0; x < x1; x += 14) for (let y = 0; y < H; y += 10) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5, y + 8); ctx.moveTo(x + 12, y); ctx.lineTo(x + 7, y + 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,135,120,0.25)';
    ctx.beginPath(); ctx.moveTo(x + 1, y + 2); ctx.lineTo(x + 6, y + 10); ctx.stroke();
  }
}

function cable(ctx: CanvasRenderingContext2D, cx: number, w: number) {
  // 꽈배기 — 두 가닥이 번갈아 위로 올라오며 엇갈린다
  for (let y = -60, i = 0; y < H + 60; y += 110, i++) {
    for (const side of i % 2 ? [1, -1] : [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - side * w / 2, y);
      ctx.bezierCurveTo(cx - side * w / 2, y + 50, cx + side * w / 2, y + 60, cx + side * w / 2, y + 110);
      ctx.lineWidth = w * 0.55; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(160,145,130,0.35)'; ctx.stroke();
      ctx.lineWidth = w * 0.45; ctx.strokeStyle = '#EFEAE4'; ctx.stroke();
      ctx.restore();
    }
  }
}

function coverCableKnit(ctx: CanvasRenderingContext2D, o: CoverOpts, t: number) {
  const sw = 48;
  ctx.fillStyle = '#E6DFD8'; ctx.fillRect(0, 0, W, H);
  knitStitches(ctx, sw, W);
  cable(ctx, sw + 100, 70);
  cable(ctx, W - 90, 70);
  spine(ctx, '#151515', sw, 'black');
  const pink = (x: number, y: number, r: number, rot: number) => {
    ctx.save(); ctx.globalAlpha *= 0.85;
    ctx.fillStyle = '#D98AA6'; starPath(ctx, x, y, r, rot); ctx.fill();
    const rnd = seededRnd(`glitter-${x}`);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 30; i++) ctx.fillRect(x + (rnd() - 0.5) * r * 1.3, y + (rnd() - 0.5) * r * 1.3, 1.6, 1.6);
    ctx.restore();
  };
  pink(160, 700, 46, 0.2);
  pink(W - 80, H - 90, 50, -0.15);
  coverLabel(ctx, o, W / 2 + sw / 2, H * 0.34, C.ink, t);
}

// ─── 7. 연노랑 + 버블 글씨 ──────────────────────────────────────────────────

function bubbleWord(ctx: CanvasRenderingContext2D, word: string, cx: number, y: number, size: number) {
  const colors = ['#E8743B', '#F2B544', '#F3DC7A', '#8DBBE8', '#F2B544', '#B8C95A'];
  ctx.font = `${size}px ${HAND}`;
  ctx.lineJoin = 'round';
  const chars = [...word];
  const widths = chars.map(ch => ctx.measureText(ch).width + size * 0.12);
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2;
  chars.forEach((ch, i) => {
    const wob = Math.sin(i * 1.7) * 6;
    ctx.strokeStyle = C.ink; ctx.lineWidth = size * 0.2; ctx.strokeText(ch, x, y + wob);
    ctx.strokeStyle = colors[i % colors.length]; ctx.lineWidth = size * 0.15; ctx.strokeText(ch, x, y + wob);
    ctx.fillStyle = colors[i % colors.length]; ctx.fillText(ch, x, y + wob);
    x += widths[i];
  });
}

function coverBubbleYellow(ctx: CanvasRenderingContext2D, o: CoverOpts, t: number) {
  const sw = 48;
  ctx.fillStyle = '#F4F9D9'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFF59A'; ctx.fillRect(0, 0, sw, H);
  const e = ease(t);
  ctx.save(); ctx.globalAlpha = e;
  bubbleWord(ctx, 'hakku', W / 2 + sw / 2, H * 0.27 + (1 - e) * 10, 140);
  ctx.restore();
  coverLabel(ctx, o, W / 2 + sw / 2, H * 0.42, C.ink, t);
}

export const COVER_VARIANTS = [
  { name: '빨간 깅엄 표지', draw: coverRedGingham },
  { name: '하트 체크 컴포지션북', draw: coverHeartComposition },
  { name: '네이비 도트 천', draw: coverNavyDots },
  { name: '라벤더 깅엄', draw: coverLavenderGingham },
  { name: '민트 도트', draw: coverMintDots },
  { name: '크림 니트 + 분홍 별', draw: coverCableKnit },
  { name: '연노랑 버블 글씨', draw: coverBubbleYellow },
] as const;

function dayNumber(date: string | undefined, dateStr: string): number {
  const match = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match
    ? Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000)
    : [...dateStr].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

/** 표지는 날짜 순서대로 — 연속 이틀 같은 표지가 나오지 않는다 */
export function coverVariantIndex(date: string | undefined, dateStr: string): number {
  const n = COVER_VARIANTS.length;
  return ((dayNumber(date, dateStr) % n) + n) % n;
}

/** 라벨 모양은 날짜를 씨앗으로 랜덤 — 같은 날 다시 만들면 같은 모양 */
export function labelShapeIndex(date: string | undefined, dateStr: string): number {
  const rnd = seededRnd(`label-shape-${dayNumber(date, dateStr)}`); rnd(); rnd();
  return Math.floor(rnd() * LABEL_SHAPES.length) % LABEL_SHAPES.length;
}

export function drawTitleScene(ctx: CanvasRenderingContext2D, opts: CoverOpts, t: number) {
  COVER_VARIANTS[coverVariantIndex(opts.date, opts.dateStr)].draw(ctx, opts, t);
}
