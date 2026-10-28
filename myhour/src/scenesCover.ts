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

/**
 * 손으로 그린 흰 타원 라벨: 제목(첫 줄), 날짜(둘째 줄), 기록 수(셋째 줄).
 * 줄은 살짝 삐뚤게 — 펜으로 그은 느낌.
 */
function ovalLabel(ctx: CanvasRenderingContext2D, o: CoverOpts, cx: number, cy: number, ink: string, t: number) {
  const e = ease(t);
  const rx = 215, ry = 140;
  ctx.save();
  ctx.globalAlpha = e;
  rotateAround(ctx, cx, cy, -2);
  ctx.translate(0, (1 - e) * 14);
  // 흰 타원 + 펜 테두리 (조금 삐뚤게)
  const rnd = seededRnd(`oval-${o.date ?? o.dateStr}`);
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const wob = 1 + Math.sin(a * 3 + rnd()) * 0.008;
    ctx.lineTo(cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob);
  }
  ctx.closePath();
  softShadow(ctx); ctx.fillStyle = '#FFFFFF'; ctx.fill(); noShadow(ctx);
  ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();

  arcText(ctx, 'hakku diary', cx, cy, rx - 34, ry - 30, ink, 24);

  // 펜 줄 세 개 (마지막 줄은 짧게)
  const lines = [[-150, 150, -8], [-170, 170, 50], [-110, 110, 108]] as const;
  ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const [x1, x2, y] of lines) {
    ctx.beginPath(); ctx.moveTo(cx + x1, cy + y + 2); ctx.quadraticCurveTo(cx, cy + y - 3, cx + x2, cy + y); ctx.stroke();
  }
  // 줄 위 글씨
  ctx.font = `44px ${HAND}`;
  const title = wrapWords(ctx, o.title, 290, 1)[0] ?? o.title;
  centerHand(ctx, title, cx, cy - 18, 300, 44, C.ink);
  centerHand(ctx, o.dateStr, cx, cy + 40, 320, 30, C.ink);
  centerHand(ctx, `오늘의 기록 ${o.count}개`, cx, cy + 98, 210, 24, 'rgba(43,38,34,0.7)');
  ctx.restore();
}

// ─── 1. 빨간 깅엄 표지 ──────────────────────────────────────────────────────

function coverRedGingham(ctx: CanvasRenderingContext2D, o: CoverOpts, t: number) {
  ctx.fillStyle = '#F4EAD5'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(212,38,38,0.55)';
  for (let x = 0; x < W; x += 72) ctx.fillRect(x, 0, 36, H);
  for (let y = 0; y < H; y += 72) ctx.fillRect(0, y, W, 36);
  weave(ctx);
  ovalLabel(ctx, o, W / 2, H * 0.42, C.ink, t);
}

// ─── 2. 하트 체크 컴포지션북 ────────────────────────────────────────────────

function coverHeartComposition(ctx: CanvasRenderingContext2D, o: CoverOpts, t: number) {
  const spine = 56;
  ctx.fillStyle = '#F3E1BF'; ctx.fillRect(spine, 0, W - spine, H);
  ctx.fillStyle = 'rgba(70,72,110,0.6)';
  for (let x = spine; x < W; x += 92) ctx.fillRect(x, 0, 40, H);
  for (let y = 0; y < H; y += 92) ctx.fillRect(spine, y, W - spine, 40);
  ctx.fillStyle = 'rgba(50,52,90,0.75)';
  for (let x = spine + 60; x < W; x += 92) { ctx.fillRect(x, 0, 3, H); ctx.fillRect(x + 8, 0, 3, H); }
  for (let y = 60; y < H; y += 92) { ctx.fillRect(spine, y, W - spine, 3); ctx.fillRect(spine, y + 8, W - spine, 3); }
  ctx.fillStyle = '#B3262E';
  for (let y = 20, r = 0; y < H + 40; y += 92, r++) for (let x = spine + (r % 2 ? 90 : 44); x < W; x += 92) {
    heartPath(ctx, x, y + 46, 20); ctx.fill();
  }
  // 등(스파인) 천 테이프
  ctx.fillStyle = '#8D93B5'; ctx.fillRect(0, 0, spine, H);
  const rnd = seededRnd('spine');
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 260; i++) ctx.fillRect(rnd() * spine, rnd() * H, 3, 1.5);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(spine - 4, 0, 4, H);
  ovalLabel(ctx, o, W / 2 + spine / 2, H * 0.36, '#3A3D5C', t);
}

export const COVER_VARIANTS = [
  { name: '빨간 깅엄 표지', draw: coverRedGingham },
  { name: '하트 체크 컴포지션북', draw: coverHeartComposition },
] as const;

export function coverVariantIndex(date: string | undefined, dateStr: string): number {
  const match = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const day = match
    ? Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000)
    : [...dateStr].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return ((day % COVER_VARIANTS.length) + COVER_VARIANTS.length) % COVER_VARIANTS.length;
}

export function drawTitleScene(ctx: CanvasRenderingContext2D, opts: CoverOpts, t: number) {
  COVER_VARIANTS[coverVariantIndex(opts.date, opts.dateStr)].draw(ctx, opts, t);
}
