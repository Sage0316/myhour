// 마지막 장면(마무리 문장) — 다꾸 스타일 여러 장. 날짜마다 돌아가며 써서 연속 이틀 같은 장면이 나오지 않는다.
// 2026-10-28 펌킨이 핀터레스트에서 고른 분위기(깅엄·데님 레이스·집게 메모지·하트 체크·패치워크 — 소용돌이 별밤은 시안에서 뺐고,
// 패치워크는 첫 장면 시안에서 옮겨 왔다)를
// 사진을 쓰지 않고 캔버스로 직접 그렸다. 모든 좌표는 540×960 논리 좌표계.
import { W, H, HAND, roundRectPath, seededRnd } from './scenes';
import { C, fitHand, heart, noShadow, rotateAround, softShadow, star, washi, wrapWords } from './scenesDakku';
import { goldStar, heartPath, starPath, weave as weaveRect } from './scenesCover';

export interface ClosingOpts {
  closing: string;
  /** 화면에 쓰는 날짜 ("10월 28일 수요일") */
  dateStr: string;
  /** 장면을 고르는 날짜 (YYYY-MM-DD). 없으면 dateStr로 고른다 */
  date?: string;
}

// ─── 공용 ───────────────────────────────────────────────────────────────────

function ease(t: number, dur = 0.3) { return Math.min(1, t / dur); }

/** 가운데 정렬 손글씨 문장 (최대 4줄, 길면 글자를 줄인다) */
function closingText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, color: string, base = 40) {
  let size = base;
  let lines: string[] = [];
  for (; size >= 26; size -= 2) {
    ctx.font = `${size}px ${HAND}`;
    lines = wrapWords(ctx, text, maxW, 4);
    if (lines.length <= 3 || size <= 28) break;
  }
  const lh = size * 1.35;
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, cx, cy + (i - (lines.length - 1) / 2) * lh));
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function footer(ctx: CanvasRenderingContext2D, dateStr: string, cx: number, y: number, color: string) {
  const size = fitHand(ctx, `하꾸 · ${dateStr}`, 24, W - 120);
  ctx.font = `${size}px ${HAND}`;
  ctx.fillStyle = color; ctx.textAlign = 'center';
  ctx.fillText(`하꾸 · ${dateStr}`, cx, y);
  ctx.textAlign = 'left';
}

/** 천 질감 — 아주 옅은 가로·세로 실선 */
function weave(ctx: CanvasRenderingContext2D, alpha = 0.06) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.7})`;
  for (let x = 0; x < W; x += 3) ctx.fillRect(x, 0, 1, H);
}

/** 깅엄 체크 — 바탕 + 같은 색 반투명 띠를 가로·세로로 겹친다 (겹친 칸이 더 진해진다) */
function gingham(ctx: CanvasRenderingContext2D, base: string, band: string, cell: number) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = band;
  for (let x = 0; x < W; x += cell * 2) ctx.fillRect(x, 0, cell, H);
  for (let y = 0; y < H; y += cell * 2) ctx.fillRect(0, y, W, cell);
}

/** 반짝이 스티커 별 — 색 + 흰 하이라이트 + 반짝이 점 */
function stickerStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rot: number, seed: string) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180);
  const path = new Path2D();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.48 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    path.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  path.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  ctx.fillStyle = color; ctx.fill(path);
  noShadow(ctx);
  ctx.save(); ctx.clip(path);
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
  const rnd = seededRnd(seed);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 10; i++) ctx.fillRect((rnd() - 0.5) * r * 1.4, (rnd() - 0.5) * r * 1.4, 1.6, 1.6);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke(path);
  ctx.restore();
}

/** 크림색 메모 카드 (살짝 기울임) */
function noteCard(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, rot: number, fill = '#FFFDF6') {
  ctx.save(); rotateAround(ctx, cx, cy, rot);
  softShadow(ctx);
  ctx.fillStyle = fill; roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, 10); ctx.fill();
  noShadow(ctx);
  ctx.restore();
}

// ─── 1. 핑크 깅엄 + 반짝이 별 스티커 ─────────────────────────────────────────

function closingGinghamStars(ctx: CanvasRenderingContext2D, o: ClosingOpts, t: number) {
  gingham(ctx, '#F2A7C3', 'rgba(150,20,45,0.5)', 40);
  weave(ctx);
  const colors = ['#E9C46A', '#F28DB2', '#7FB2E5', '#C9CCD3', '#A9C97E', '#D64545', '#F4A259', '#B5E3E0'];
  const rnd = seededRnd(`stars-${o.date ?? o.dateStr}`);
  // 격자에 흩뿌려 고르게 퍼지게 한다 (완전 랜덤이면 한쪽에 몰린다). 카드 뒤 칸은 비운다
  let n = 0;
  for (let row = 0; row < 9; row++) for (let col = 0; col < 4; col++) {
    const x = 50 + col * 147 + (rnd() - 0.5) * 70, y = 60 + row * 108 + (rnd() - 0.5) * 50;
    if (Math.abs(x - W / 2) < 215 && Math.abs(y - H / 2) < 185) continue;
    const pop = Math.min(1, Math.max(0, (t - n * 0.01) / 0.15));
    stickerStar(ctx, x, y, (18 + rnd() * 16) * pop, colors[n % colors.length], rnd() * 60 - 30, `s${n}`);
    n++;
  }
  const e = ease(t);
  ctx.globalAlpha = e;
  noteCard(ctx, W / 2, H / 2 + (1 - e) * 12, 400, 330, -2);
  washi(ctx, W / 2, H / 2 - 165, 140, 34, 3, '#FFFFFF', 'dot', 'rgba(214,69,69,0.5)');
  closingText(ctx, o.closing, W / 2, H / 2 - 20, 330, C.ink);
  footer(ctx, o.dateStr, W / 2, H / 2 + 125, 'rgba(43,38,34,0.55)');
  ctx.globalAlpha = 1;
}

// ─── 2. 수채화 노을 + 초승달 ────────────────────────────────────────────────
// 예전 '손그림 풍경 + 하늘색 별'은 레퍼런스(특정 작가 그림)와 구성이 너무 비슷해 2026-10-28 교체했다.

/** 수채화 번짐 — 같은 색 반투명 원을 겹쳐 가장자리가 고르지 않게 */
function watercolorBlot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, seed: string) {
  const rnd = seededRnd(seed);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + (rnd() - 0.5) * r * 0.7, y + (rnd() - 0.5) * r * 0.5, r * (0.5 + rnd() * 0.5), r * (0.3 + rnd() * 0.35), rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 붓으로 찍은 반짝임 (네 갈래) */
function paintedSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(255,248,225,0.9)';
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.15, y - r * 0.15, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.15, y + r * 0.15, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.15, y + r * 0.15, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.15, y - r * 0.15, x, y - r);
  ctx.fill();
}

function closingWatercolorDusk(ctx: CanvasRenderingContext2D, o: ClosingOpts, t: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#6E6A9E'); sky.addColorStop(0.45, '#C99BB4'); sky.addColorStop(0.8, '#F2C2A0'); sky.addColorStop(1, '#F6DDB8');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  // 번진 물감 얼룩
  watercolorBlot(ctx, 120, 260, 160, 'rgba(255,255,255,0.03)', 'w1');
  watercolorBlot(ctx, 420, 620, 180, 'rgba(255,214,170,0.10)', 'w2');
  watercolorBlot(ctx, 160, 840, 200, 'rgba(255,236,210,0.12)', 'w3');
  // 종이 결
  const rnd = seededRnd('paper-grain');
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 500; i++) ctx.fillRect(rnd() * W, rnd() * H, 2, 1);
  const e = ease(t);
  // 초승달 — 달 원 안에서 작은 원을 하늘색으로 덮는다 (지우면 하늘까지 뚫린다)
  ctx.save();
  ctx.globalAlpha = e;
  ctx.beginPath(); ctx.arc(410, 150, 62, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#FBE7A1'; ctx.fillRect(340, 80, 140, 140);
  ctx.globalAlpha = 1;
  ctx.fillStyle = sky; ctx.beginPath(); ctx.arc(436, 132, 56, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 붓 반짝임
  ctx.save(); ctx.globalAlpha = e;
  for (const [x, y, r] of [[90, 120, 12], [200, 80, 7], [300, 210, 9], [70, 330, 8], [480, 300, 10], [250, 340, 6]] as const) paintedSparkle(ctx, x, y, r);
  ctx.restore();
  // 아래 구름 띠
  ctx.fillStyle = 'rgba(255,240,226,0.55)';
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(40 + i * 80, H - 60 + Math.sin(i) * 14, 90, 46, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = e;
  noteCard(ctx, W / 2, H / 2 + 40 + (1 - e) * 12, 380, 300, -2, '#FFFBF3');
  washi(ctx, W / 2, H / 2 + 40 - 150, 130, 32, 3, '#C9B8E6', 'dot', 'rgba(255,255,255,0.7)');
  closingText(ctx, o.closing, W / 2, H / 2 + 20, 320, '#4B3F6B', 40);
  footer(ctx, o.dateStr, W / 2, H / 2 + 150, 'rgba(75,63,107,0.6)');
  ctx.globalAlpha = 1;
}

// ─── 3. 데님 + 레이스 + 버건디 도트 ─────────────────────────────────────────

function closingDenimLace(ctx: CanvasRenderingContext2D, o: ClosingOpts, t: number) {
  const split = 150;
  // 버건디 도트
  ctx.fillStyle = '#5A0E14'; ctx.fillRect(split, 0, W - split, H);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let y = 12; y < H; y += 26) for (let x = split + 14 + ((y / 26) % 2 ? 13 : 0); x < W; x += 26) {
    ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  // 데님
  ctx.fillStyle = '#5F6F87'; ctx.fillRect(0, 0, split, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  for (let i = -H; i < split; i += 4) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); }
  const rnd = seededRnd('denim');
  ctx.fillStyle = 'rgba(20,30,50,0.18)';
  for (let i = 0; i < 400; i++) ctx.fillRect(rnd() * split, rnd() * H, 1.5, 1.5);
  ctx.strokeStyle = '#C9A15A'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(split - 46, 0); ctx.lineTo(split - 46, H); ctx.stroke();
  ctx.setLineDash([]);
  // 레이스 — 물결 가장자리 + 꽃 무늬 구멍
  ctx.fillStyle = 'rgba(245,242,236,0.92)';
  ctx.beginPath(); ctx.moveTo(split - 26, 0);
  for (let y = 0; y <= H; y += 24) ctx.quadraticCurveTo(split + 30, y + 12, split + 8, y + 24);
  ctx.lineTo(split - 26, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(150,140,130,0.45)'; ctx.lineWidth = 1.2;
  for (let y = 18; y < H; y += 48) {
    for (const [dx, r] of [[0, 9], [-12, 5], [12, 5]] as const) {
      ctx.beginPath(); ctx.arc(split + dx - 4, y + (dx ? 14 : 0), r, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const e = ease(t);
  ctx.globalAlpha = e;
  const cx = split + (W - split) / 2 + 6;
  noteCard(ctx, cx, H / 2 + (1 - e) * 12, 320, 380, 2, '#FFF9EE');
  washi(ctx, cx - 110, H / 2 - 180, 100, 30, -30, '#E9C46A', 'plain');
  washi(ctx, cx + 110, H / 2 + 182, 100, 30, -30, '#E9C46A', 'plain');
  closingText(ctx, o.closing, cx, H / 2 - 20, 260, '#3A0A0E', 38);
  footer(ctx, o.dateStr, cx, H / 2 + 140, 'rgba(58,10,14,0.55)');
  heart(ctx, cx + 120, H / 2 - 150, 22, '#D64545', 12);
  ctx.globalAlpha = 1;
}

// ─── 4. 하늘 체크 + 집게 메모지 ─────────────────────────────────────────────

function binderClip(ctx: CanvasRenderingContext2D, x: number, y: number, flip = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, flip);
  const gold = ctx.createLinearGradient(-26, 0, 26, 0);
  gold.addColorStop(0, '#9C7A2E'); gold.addColorStop(0.5, '#F1D27A'); gold.addColorStop(1, '#9C7A2E');
  ctx.fillStyle = gold;
  ctx.fillRect(-26, -6, 52, 26);
  ctx.strokeStyle = '#B8902F'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-12, -40); ctx.quadraticCurveTo(0, -50, 12, -40); ctx.lineTo(16, -6); ctx.stroke();
  ctx.restore();
}

function closingClipNote(ctx: CanvasRenderingContext2D, o: ClosingOpts, t: number) {
  // 하늘색 타탄
  ctx.fillStyle = '#F4EFE2'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(150,199,236,0.45)';
  for (let x = 0; x < W; x += 36) ctx.fillRect(x, 0, 16, H);
  for (let y = 0; y < H; y += 36) ctx.fillRect(0, y, W, 16);
  ctx.fillStyle = 'rgba(230,150,170,0.35)';
  for (let x = 26; x < W; x += 72) ctx.fillRect(x, 0, 2, H);
  for (let y = 26; y < H; y += 72) ctx.fillRect(0, y, W, 2);
  weave(ctx, 0.05);
  const e = ease(t);
  ctx.globalAlpha = e;
  const nx = W / 2, ny = H / 2 + (1 - e) * 10, nw = 380, nh = 560;
  noteCard(ctx, nx, ny, nw, nh, 0, '#FFFFFF');
  ctx.strokeStyle = 'rgba(43,38,34,0.08)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(nx - nw / 2, ny); ctx.lineTo(nx + nw / 2, ny); ctx.stroke();
  binderClip(ctx, nx, ny - nh / 2 + 4);
  binderClip(ctx, nx, ny + nh / 2 - 4, -1);
  closingText(ctx, o.closing, nx, ny - 30, nw - 70, C.ink, 40);
  footer(ctx, o.dateStr, nx, ny + 150, 'rgba(43,38,34,0.5)');
  // 꾸밈 스티커: 꽃, 체크 테이프, 단추, 금별, 하트, 사과
  for (let i = 0; i < 6; i++) {
    ctx.save(); ctx.translate(70, 190); ctx.rotate((i * 60) * Math.PI / 180);
    ctx.fillStyle = i % 2 ? '#F4A6B8' : '#EE8B8B';
    ctx.beginPath(); ctx.ellipse(0, -30, 18, 32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#F6D36B'; ctx.beginPath(); ctx.arc(70, 190, 10, 0, Math.PI * 2); ctx.fill();
  washi(ctx, W - 150, 160, 130, 40, -20, '#F2B6B4', 'check', 'rgba(127,178,229,0.6)');
  ctx.fillStyle = '#F28DB2'; ctx.beginPath(); ctx.arc(W - 170, 200, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) { ctx.beginPath(); ctx.arc(W - 170 + dx, 200 + dy, 2.5, 0, Math.PI * 2); ctx.fill(); }
  stickerStar(ctx, W - 70, 220, 44, '#D9B44A', 14, 'gold1');
  stickerStar(ctx, 80, H - 150, 48, '#D9B44A', -10, 'gold2');
  heart(ctx, 130, H - 130, 34, '#C9D9F2', -14);
  ctx.fillStyle = '#C0392B'; ctx.beginPath(); ctx.arc(W - 80, H - 120, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(W - 94, H - 134, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6B4B2A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W - 80, H - 160); ctx.lineTo(W - 74, H - 176); ctx.stroke();
  ctx.fillStyle = '#7FA35A'; ctx.beginPath(); ctx.ellipse(W - 62, H - 170, 12, 6, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// ─── 5. 네이비 체크 + 빨간 하트 ─────────────────────────────────────────────

function closingHeartPlaid(ctx: CanvasRenderingContext2D, o: ClosingOpts, t: number) {
  ctx.fillStyle = '#EFE6D4'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(31,58,107,0.55)';
  for (let x = 0; x < W; x += 64) ctx.fillRect(x, 0, 26, H);
  for (let y = 0; y < H; y += 64) ctx.fillRect(0, y, W, 26);
  ctx.fillStyle = 'rgba(31,58,107,0.25)';
  for (let x = 40; x < W; x += 64) ctx.fillRect(x, 0, 6, H);
  for (let y = 40; y < H; y += 64) ctx.fillRect(0, y, W, 6);
  weave(ctx, 0.07);
  for (let y = 0, row = 0; y < H + 64; y += 64, row++) {
    for (let x = row % 2 ? 64 : 32; x < W + 32; x += 128) {
      ctx.save(); ctx.translate(x - 13 + 13, y + 45);
      ctx.scale(0.75, 0.75);
      ctx.fillStyle = '#C62828';
      ctx.beginPath(); ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-14, -4, -8, -16, 0, -8); ctx.bezierCurveTo(8, -16, 14, -4, 0, 6); ctx.fill();
      ctx.restore();
    }
  }
  const e = ease(t);
  ctx.globalAlpha = e;
  noteCard(ctx, W / 2, H / 2 + (1 - e) * 12, 400, 320, 1.5, '#FFF8EC');
  ctx.save(); rotateAround(ctx, W / 2, H / 2, 1.5);
  ctx.strokeStyle = '#C62828'; ctx.lineWidth = 2; ctx.setLineDash([9, 7]);
  roundRectPath(ctx, W / 2 - 184, H / 2 - 144, 368, 288, 8); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  closingText(ctx, o.closing, W / 2, H / 2 - 20, 320, '#1F3A6B', 40);
  footer(ctx, o.dateStr, W / 2, H / 2 + 110, 'rgba(31,58,107,0.6)');
  star(ctx, W / 2 + 170, H / 2 - 150, 20, C.yellow, 10);
  ctx.globalAlpha = 1;
}

// ─── 6. 패치워크 천 + 크라프트 종이 (첫 장면 시안 2번을 사용자 요청으로 옮김) ─────────────────────────────────────────

function closingPatchwork(ctx: CanvasRenderingContext2D, o: ClosingOpts, t: number) {
  const block = (x: number, y: number, w: number, h: number, draw: () => void) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); draw(); weaveRect(ctx, x, y, w, h, 0.07); ctx.restore();
  };
  // 왼쪽 위: 하트 체크
  block(0, 0, 330, 360, () => {
    ctx.fillStyle = '#F2EBCF'; ctx.fillRect(0, 0, 330, 360);
    ctx.fillStyle = 'rgba(31,40,70,0.55)';
    for (let x = 0; x < 330; x += 40) { ctx.fillRect(x, 0, 3, 360); ctx.fillRect(x + 7, 0, 2, 360); }
    for (let y = 0; y < 360; y += 40) { ctx.fillRect(0, y, 330, 3); ctx.fillRect(0, y + 7, 330, 2); }
    ctx.fillStyle = '#C62828';
    for (let y = 24, r = 0; y < 360; y += 40, r++) for (let x = r % 2 ? 44 : 24; x < 330; x += 40) { heartPath(ctx, x, y, 14); ctx.fill(); }
  });
  // 오른쪽 위: 네이비 줄무늬
  block(330, 0, W - 330, 520, () => {
    ctx.fillStyle = '#E9E0C8'; ctx.fillRect(330, 0, W - 330, 520);
    ctx.fillStyle = '#1F4A6E';
    for (let x = 330; x < W; x += 16) ctx.fillRect(x, 0, 9, 520);
  });
  // 왼쪽 아래: 흑백 다이아몬드
  block(0, 360, 110, 460, () => {
    ctx.fillStyle = '#F2EBDA'; ctx.fillRect(0, 360, 110, 460);
    ctx.fillStyle = '#1A1A1A';
    for (let y = 360, r = 0; y < 820; y += 22, r++) for (let x = r % 2 ? 11 : 0; x < 110; x += 22) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 11, y + 11); ctx.lineTo(x, y + 22); ctx.lineTo(x - 11, y + 11); ctx.closePath(); ctx.fill();
    }
  });
  // 오른쪽 가운데: 네이비 체크 + 빨간 별
  block(W - 110, 520, 110, 220, () => {
    ctx.fillStyle = '#E8E2D6'; ctx.fillRect(W - 110, 520, 110, 220);
    ctx.fillStyle = 'rgba(40,50,110,0.6)';
    ctx.fillRect(W - 110, 520, 40, 220); ctx.fillRect(W - 110, 600, 110, 40);
    ctx.fillStyle = '#B0284A';
    for (const y of [560, 650, 720]) { starPath(ctx, W - 40, y, 16); ctx.fill(); }
  });
  // 아래: 버건디 별 무늬 / 작은 깅엄 / 데님 점
  block(0, 820, 260, H - 820, () => {
    ctx.fillStyle = '#7A1622'; ctx.fillRect(0, 820, 260, H - 820);
    ctx.fillStyle = '#D9B44A';
    for (let y = 840, r = 0; y < H; y += 40, r++) for (let x = r % 2 ? 40 : 18; x < 260; x += 46) { starPath(ctx, x, y, 9); ctx.fill(); }
  });
  block(260, 740, W - 260, 120, () => {
    ctx.fillStyle = '#EFE6D6'; ctx.fillRect(260, 740, W - 260, 120);
    ctx.fillStyle = 'rgba(200,40,40,0.55)'; for (let x = 260; x < W; x += 14) ctx.fillRect(x, 740, 6, 120);
    ctx.fillStyle = 'rgba(40,50,110,0.45)'; for (let y = 740; y < 860; y += 14) ctx.fillRect(260, y, W - 260, 6);
  });
  block(260, 860, W - 260, H - 860, () => {
    ctx.fillStyle = '#34496A'; ctx.fillRect(260, 860, W - 260, H - 860);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let y = 870; y < H; y += 12) for (let x = 266; x < W; x += 12) ctx.fillRect(x, y, 1.5, 1.5);
  });
  // 가운데 크라프트 종이
  const e = ease(t);
  ctx.globalAlpha = e;
  const px = 90, py = 230 + (1 - e) * 12, pw = 370, ph = 560;
  ctx.save();
  rotateAround(ctx, px + pw / 2, py + ph / 2, -1);
  softShadow(ctx);
  ctx.fillStyle = '#E6E0D4'; ctx.fillRect(px, py, pw, ph);
  noShadow(ctx);
  const rnd = seededRnd('kraft');
  ctx.fillStyle = 'rgba(120,100,80,0.12)';
  for (let i = 0; i < 300; i++) ctx.fillRect(px + rnd() * pw, py + rnd() * ph, 1.5, 1.5);
  // 클립
  ctx.strokeStyle = '#4A4A4A'; ctx.lineWidth = 3;
  roundRectPath(ctx, px + pw - 70, py - 20, 22, 110, 11); ctx.stroke();
  roundRectPath(ctx, px + pw - 64, py - 8, 12, 80, 6); ctx.stroke();
  // 글: 마무리 문장 + 빨간 밑줄 + 날짜
  closingText(ctx, o.closing, px + pw / 2, py + ph * 0.42, pw - 80, C.ink, 40);
  ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const uy = py + ph * 0.56;
  ctx.beginPath(); ctx.moveTo(px + 90, uy); ctx.quadraticCurveTo(px + pw / 2, uy + 8, px + pw - 90, uy - 2); ctx.stroke();
  footer(ctx, o.dateStr, px + pw / 2, uy + 56, 'rgba(43,38,34,0.6)');
  ctx.textAlign = 'left';
  ctx.restore();
  goldStar(ctx, 110, 250, 70, -12);
  goldStar(ctx, W - 120, 760, 64, 18);
  ctx.globalAlpha = 1;
}

// ─── 고르기 ─────────────────────────────────────────────────────────────────

export const CLOSING_VARIANTS = [
  { name: '핑크 깅엄 + 별 스티커', draw: closingGinghamStars },
  { name: '수채화 노을 + 초승달', draw: closingWatercolorDusk },
  { name: '데님 + 레이스 + 도트', draw: closingDenimLace },
  { name: '하늘 체크 + 집게 메모지', draw: closingClipNote },
  { name: '네이비 체크 + 하트', draw: closingHeartPlaid },
  { name: '패치워크 천 + 종이', draw: closingPatchwork },
] as const;

/** 날짜를 일 단위 번호로 바꿔 차례로 고른다 — 연속 이틀은 같은 장면이 나오지 않는다 */
export function closingVariantIndex(date: string | undefined, dateStr: string): number {
  const match = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const day = match
    ? Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000)
    : [...dateStr].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return ((day % CLOSING_VARIANTS.length) + CLOSING_VARIANTS.length) % CLOSING_VARIANTS.length;
}

export function drawClosingScene(ctx: CanvasRenderingContext2D, opts: ClosingOpts, t: number) {
  CLOSING_VARIANTS[closingVariantIndex(opts.date, opts.dateStr)].draw(ctx, opts, t);
}
