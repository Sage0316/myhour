// 다꾸 스타일 장면 — 글 기록(그림일기)과 앨범 사진(짤). 2026-10-28 펌킨이 시안에서 고름.
// 둘 다 A/B 두 스타일이 있고, 기록 id로 하나가 정해진다 (같은 기록은 다시 만들어도 같은 스타일).
// 색은 앱 화면(design.ts)과 같은 팔레트를 쓴다. 모든 좌표는 540×960 논리 좌표계.
import type { MyRecord } from './store';
import { W, H, HAND, pickContentEmoji, roundRectPath, seededRnd, wrapLines } from './scenes';
const C = {
  ink: '#2B2622', paper: '#FBF7EC', red: '#C9381F', sky: '#96C7EC', skyInk: '#173055',
  green: '#C9DE95', yellow: '#FFE27A', pink: '#F2B6B4', kraft: '#D8BF98', white: '#FFFFFF',
};

/** 기록 id → A/B. LCG 첫 값은 이웃 시드끼리 비슷해서 두 번 버리고 뽑는다 (scenes.seededRnd 주석 참고) */
function pickVariant(id: string): 'A' | 'B' {
  const rnd = seededRnd(id); rnd(); rnd();
  return rnd() < 0.5 ? 'A' : 'B';
}

// ─── 종이 배경 (프레임마다 선·점을 수백 개 그리지 않게 타일 패턴으로 캐시) ──────

const tileCache = new Map<string, CanvasPattern | null>();

function paperPattern(ctx: CanvasRenderingContext2D, kind: 'grid' | 'dot'): CanvasPattern | null {
  const scale = ctx.getTransform().a || 1;
  const key = `${kind}:${scale}`;
  if (!tileCache.has(key)) {
    const step = kind === 'grid' ? 24 : 22;
    const tile = document.createElement('canvas');
    tile.width = Math.round(step * scale); tile.height = Math.round(step * scale);
    const t = tile.getContext('2d');
    let pattern: CanvasPattern | null = null;
    if (t) {
      t.scale(scale, scale);
      t.fillStyle = C.paper; t.fillRect(0, 0, step, step);
      if (kind === 'grid') {
        t.fillStyle = 'rgba(120,150,110,0.16)';
        t.fillRect(step / 2, 0, 1, step); t.fillRect(0, step / 2, step, 1);
      } else {
        t.fillStyle = 'rgba(43,38,34,0.14)';
        t.beginPath(); t.arc(step / 2, step / 2, 1.3, 0, Math.PI * 2); t.fill();
      }
      pattern = ctx.createPattern(tile, 'repeat');
      pattern?.setTransform(new DOMMatrix().scale(1 / scale));
    }
    tileCache.set(key, pattern);
  }
  return tileCache.get(key) ?? null;
}

function paper(ctx: CanvasRenderingContext2D, kind: 'grid' | 'dot') {
  ctx.fillStyle = paperPattern(ctx, kind) ?? C.paper;
  ctx.fillRect(0, 0, W, H);
}

// ─── 소품 ───────────────────────────────────────────────────────────────────

type Pattern = 'plain' | 'stripe' | 'dot' | 'check';

/** 마스킹 테이프 — 양 끝이 톱니처럼 찢긴 반투명 띠 + 무늬 */
function washi(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, rot: number, base: string, pattern: Pattern = 'plain', patternColor = 'rgba(255,255,255,0.7)') {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180);
  const teeth = 6, tw = 5;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2);
  for (let i = 1; i <= teeth; i++) ctx.lineTo(w / 2 + (i % 2 ? -tw : 0), -h / 2 + (h * i) / teeth);
  ctx.lineTo(-w / 2, h / 2);
  for (let i = 1; i <= teeth; i++) ctx.lineTo(-w / 2 + (i % 2 ? tw : 0), h / 2 - (h * i) / teeth);
  ctx.closePath();
  ctx.globalAlpha *= 0.88;
  ctx.fillStyle = base; ctx.fill();
  ctx.clip();
  ctx.fillStyle = patternColor; ctx.strokeStyle = patternColor;
  if (pattern === 'stripe') {
    ctx.lineWidth = 6;
    for (let x = -w; x < w; x += 16) { ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x + h * 1.2, h); ctx.stroke(); }
  } else if (pattern === 'dot') {
    for (let x = -w / 2 + 8; x < w / 2; x += 14) for (let y = -h / 2 + 7; y < h / 2; y += 12) {
      ctx.beginPath(); ctx.arc(x + ((y / 12) % 2 ? 7 : 0), y, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  } else if (pattern === 'check') {
    for (let x = -w / 2; x < w / 2; x += 12) for (let y = -h / 2; y < h / 2; y += 12) {
      if ((Math.round((x + w) / 12) + Math.round((y + h) / 12)) % 2 === 0) ctx.fillRect(x, y, 12, 12);
    }
  }
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string | null, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string | null, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180); ctx.scale(s / 20, s / 20);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-14, -4, -8, -16, 0, -8);
  ctx.bezierCurveTo(8, -16, 14, -4, 0, 6);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2 * 20 / s; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r = 12) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (const [a, k] of [[0, 1], [Math.PI / 2, 1], [Math.PI / 4, 0.5], [-Math.PI / 4, 0.5]]) {
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * -r * k, Math.sin(a) * -r * k); ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k); ctx.stroke();
  }
  ctx.restore();
}

/** 글자가 maxW 안에 들어올 때까지 줄인 손글씨 폰트 크기 */
function fitHand(ctx: CanvasRenderingContext2D, text: string, size: number, maxW: number, min = 20): number {
  ctx.font = `${size}px ${HAND}`;
  while (size > min && ctx.measureText(text).width > maxW) { size -= 2; ctx.font = `${size}px ${HAND}`; }
  return size;
}

/** 테이프에 손글씨 라벨 (앱의 tape() 스타일) */
function labelTape(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, rot: number, bg: string, fg: string, size = 30, maxW = W - 100) {
  ctx.save();
  size = fitHand(ctx, text, size, maxW - 28);
  const tw = Math.min(ctx.measureText(text).width, maxW - 28);
  ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, tw + 28, size + 14);
  ctx.fillStyle = fg; ctx.textBaseline = 'middle';
  ctx.fillText(text, 14, (size + 14) / 2 + 2, maxW - 28);
  ctx.restore();
}

function softShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'rgba(43,38,34,0.16)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
}
function noShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
}

function rotateAround(ctx: CanvasRenderingContext2D, cx: number, cy: number, deg: number) {
  ctx.translate(cx, cy); ctx.rotate(deg * Math.PI / 180); ctx.translate(-cx, -cy);
}

// ☕✈️ 같은 모노톤 글리프는 fillStyle로 칠해진다 — 잉크색을 깔아 두지 않으면 배경에 묻힌다
function drawEmoji(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number, size: number) {
  ctx.save();
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = C.ink;
  ctx.fillText(emoji, x, y + size * 0.06);
  ctx.restore();
}

/** 사진을 사각형에 꽉 채운다. 원본이 정리됐거나 못 읽었으면 연한 칸 + 😆 */
function photoRect(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
  if (!img) {
    ctx.fillStyle = '#F9E9A6'; ctx.fillRect(x, y, w, h);
    drawEmoji(ctx, '😆', x + w / 2, y + h / 2, 64);
    return;
  }
  const ia = img.naturalWidth / img.naturalHeight, ca = w / h;
  const [sw, sh] = ia > ca ? [h * ia, h] : [w, w / ia];
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
  ctx.restore();
}

/** 찢은 종이 모양 경로 (seed가 같으면 프레임마다 같은 모양) */
function tornRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: string) {
  const rnd = seededRnd(seed); rnd(); rnd();
  const j = () => (rnd() - 0.5) * 7;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 1; i <= 18; i++) ctx.lineTo(x + (w * i) / 18, y + j());
  for (let i = 1; i <= 24; i++) ctx.lineTo(x + w + j(), y + (h * i) / 24);
  for (let i = 1; i <= 18; i++) ctx.lineTo(x + w - (w * i) / 18, y + h + j());
  for (let i = 1; i <= 24; i++) ctx.lineTo(x + j(), y + h - (h * i) / 24);
  ctx.closePath();
}

// ─── 글 ─────────────────────────────────────────────────────────────────────

/** 글 길이별 [글자 크기, 줄 간격, 최대 줄 수]. 지금은 25자 제한이지만 예전 긴 기록도 들어온다 */
function textMetrics(len: number): [number, number, number] {
  if (len <= 10) return [58, 78, 2];
  if (len <= 18) return [50, 70, 3];
  if (len <= 30) return [44, 64, 3];
  if (len <= 60) return [36, 54, 5];
  return [30, 46, 6];
}

/** 띄어쓰기 단위로 줄바꿈 (한 단어가 한 줄보다 길 때만 글자 단위로 자른다). 넘치면 마지막 줄 끝에 … */
function wrapWords(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxW) { line = test; continue; }
    if (line) lines.push(line);
    if (ctx.measureText(word).width <= maxW) { line = word; continue; }
    const parts = wrapLines(ctx, word, maxW);
    lines.push(...parts.slice(0, -1));
    line = parts.at(-1) ?? '';
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

/** 줄 공책 위 손글씨 — 글자가 줄 위에 앉고, 형광펜이 글자 아래쪽에 깔린다 */
function ruledText(ctx: CanvasRenderingContext2D, lines: string[], x: number, top: number, w: number, size: number, lh: number, rules: number, marker: string) {
  ctx.strokeStyle = 'rgba(43,38,34,0.14)'; ctx.lineWidth = 1.5;
  for (let i = 1; i <= rules; i++) {
    const y = top + i * lh;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  }
  ctx.font = `${size}px ${HAND}`;
  lines.forEach((line, i) => {
    const base = top + (i + 1) * lh - 10;
    const lw = ctx.measureText(line).width;
    ctx.fillStyle = marker;
    ctx.fillRect(x + 2, base - size * 0.34, lw + 10, size * 0.4);
    ctx.fillStyle = C.ink;
    ctx.fillText(line, x + 6, base);
  });
}

// A. 메모지 콜라주 — 모눈종이 위 메모 카드, 점선 원 안에 그림, 노란 형광펜 글, 기분 스티커
function diaryMemo(ctx: CanvasRenderingContext2D, record: MyRecord, moodEmoji: string | null, t: number, drawing: string) {
  const ease = Math.min(1, t / 0.25);
  paper(ctx, 'grid');

  labelTape(ctx, record.slotTime, 46, 70, -3, C.sky, C.skyInk, 32);
  ctx.font = `32px ${HAND}`; ctx.fillStyle = 'rgba(43,38,34,0.75)';
  ctx.fillText('의 기록', 172, 106);

  const cw = W - 104;
  const [size, lh, maxLines] = textMetrics(record.content.length);
  ctx.font = `${size}px ${HAND}`;
  const lines = wrapWords(ctx, record.content, cw - 80, maxLines);
  const rules = Math.max(2, lines.length);
  // 카드 높이는 글 줄 수에 맞추고 화면 가운데에 둔다
  const ch = 330 + rules * lh + 110;
  const cx = 52, cy = Math.max(160, (H - ch) / 2 + 20);

  ctx.globalAlpha = ease;
  ctx.save();
  rotateAround(ctx, W / 2, cy + ch / 2, -1.5);
  softShadow(ctx);
  ctx.fillStyle = C.white; roundRectPath(ctx, cx, cy, cw, ch, 14); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; roundRectPath(ctx, cx, cy, cw, ch, 14); ctx.stroke();

  const ex = W / 2, ey = cy + 170 + (1 - ease) * 10;
  ctx.fillStyle = '#FFF6C9';
  ctx.beginPath(); ctx.arc(ex, ey, 104, 0, Math.PI * 2); ctx.fill();
  ctx.setLineDash([8, 7]); ctx.strokeStyle = 'rgba(43,38,34,0.55)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(ex, ey, 104, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  drawEmoji(ctx, drawing, ex, ey + Math.sin(t * Math.PI * 2) * 4, 112);
  star(ctx, ex + 128, ey - 70, 16, C.yellow, 12);
  sparkle(ctx, ex - 130, ey + 60, 11);

  ruledText(ctx, lines, cx + 32, cy + 310, cw - 64, size, lh, rules, 'rgba(255,226,122,0.8)');

  if (moodEmoji) {
    ctx.fillStyle = C.pink;
    ctx.beginPath(); ctx.arc(cx + cw - 46, cy + ch - 50, 36, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    drawEmoji(ctx, moodEmoji, cx + cw - 46, cy + ch - 50, 36);
    ctx.font = `24px ${HAND}`; ctx.fillStyle = 'rgba(43,38,34,0.7)';
    ctx.textAlign = 'right'; ctx.fillText('오늘 기분', cx + cw - 92, cy + ch - 42); ctx.textAlign = 'left';
  }
  ctx.restore();

  washi(ctx, W / 2, cy + 4, 150, 36, -4, C.green, 'stripe');
  const below = cy + ch;
  if (record.caption) labelTape(ctx, record.caption, 110, Math.min(below + 40, H - 70), 2, '#FFF6C9', C.ink, 26, W - 220);
  heart(ctx, 70, Math.min(below + 70, H - 40), 26, C.pink, -12);
  star(ctx, W - 80, Math.min(below + 62, H - 40), 14, null, 8);
  ctx.globalAlpha = 1;
}

// B. 스프링 다이어리 속지 — 스프링·인덱스 탭, 빨간 TODAY 도장, 작은 폴라로이드 그림, 초록 형광펜 글
function diarySpring(ctx: CanvasRenderingContext2D, record: MyRecord, moodEmoji: string | null, t: number, drawing: string) {
  const ease = Math.min(1, t / 0.25);
  paper(ctx, 'dot');

  const pw = W - 120;
  const [size, lh, maxLines] = textMetrics(record.content.length);
  ctx.font = `${size}px ${HAND}`;
  const lines = wrapWords(ctx, record.content, pw - 100, Math.min(maxLines, 5));
  const rules = Math.max(2, lines.length);
  const fw = pw - 140;
  const textTop = 140 + fw + 30 + 30;
  const ph = textTop + rules * lh + 60;
  const px = 66, py = Math.max(60, (H - ph) / 2 - (record.caption ? 20 : 0));

  ctx.globalAlpha = ease;
  ([[C.sky, 150], [C.pink, 240], [C.yellow, 330]] as const).forEach(([color, y]) => {
    ctx.fillStyle = color;
    roundRectPath(ctx, px + pw - 12, py + y, 40, 70, 8); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; roundRectPath(ctx, px + pw - 12, py + y, 40, 70, 8); ctx.stroke();
  });
  softShadow(ctx);
  ctx.fillStyle = C.white; ctx.fillRect(px, py, pw, ph);
  noShadow(ctx);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);
  for (let y = py + 30; y < py + ph - 10; y += 44) {
    ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px + 22, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#8A8178'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px - 18, y - 4); ctx.quadraticCurveTo(px + 4, y - 14, px + 22, y); ctx.stroke();
  }

  ctx.font = `46px ${HAND}`; ctx.fillStyle = C.ink;
  ctx.fillText(record.slotTime, px + 54, py + 76);
  const tw = ctx.measureText(record.slotTime).width;
  ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px + 52, py + 90); ctx.quadraticCurveTo(px + 54 + tw / 2, py + 98, px + 58 + tw, py + 86); ctx.stroke();
  ctx.save();
  ctx.translate(px + pw - 78, py + 66); ctx.rotate(-10 * Math.PI / 180);
  ctx.strokeStyle = C.red; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 33, 0, Math.PI * 2); ctx.stroke();
  ctx.font = `16px ${HAND}`; ctx.fillStyle = C.red; ctx.textAlign = 'center';
  ctx.fillText('TODAY', 0, moodEmoji ? -12 : 6);
  ctx.textAlign = 'left';
  if (moodEmoji) drawEmoji(ctx, moodEmoji, 0, 10, 26);
  ctx.restore();

  const fx = px + 70, fy = py + 140 + (1 - ease) * 10;
  ctx.save();
  rotateAround(ctx, fx + fw / 2, fy + fw / 2, 3);
  softShadow(ctx);
  ctx.fillStyle = C.white; ctx.fillRect(fx, fy, fw, fw + 30);
  noShadow(ctx);
  ctx.strokeStyle = 'rgba(43,38,34,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(fx, fy, fw, fw + 30);
  ctx.fillStyle = '#EAF3FB'; ctx.fillRect(fx + 16, fy + 16, fw - 32, fw - 32);
  drawEmoji(ctx, drawing, fx + fw / 2, fy + fw / 2 + Math.sin(t * Math.PI * 2) * 4, 120);
  ctx.restore();
  washi(ctx, fx + 10, fy + 6, 110, 30, -38, C.yellow, 'dot', 'rgba(201,56,31,0.55)');
  star(ctx, fx + fw + 4, fy - 10, 18, C.yellow, -10);

  ruledText(ctx, lines, px + 50, py + textTop, pw - 80, size, lh, rules, 'rgba(201,222,149,0.85)');
  washi(ctx, px + pw - 70, py + ph - 8, 130, 30, 6, C.sky, 'check', 'rgba(255,255,255,0.55)');
  if (record.caption) labelTape(ctx, record.caption, px, Math.min(py + ph + 30, H - 64), -2, '#FFF6C9', C.ink, 26, W - 140);
  ctx.globalAlpha = 1;
}

/**
 * 그림일기 장면. 그림 칸엔 그 기록 내용을 나타내는 이모지(AI recordEmoji → 키워드 사전 → 연필),
 * 기분 칸엔 그날의 무드 이모지(하루에 하나). 두 이모지를 섞지 않는다 (myhour/CLAUDE.md 이모지 규칙).
 */
export function drawDiaryScene(
  ctx: CanvasRenderingContext2D,
  record: MyRecord,
  moodEmoji: string | null,
  t: number,
  contentEmoji?: string | null,
) {
  const drawing = contentEmoji?.trim() || pickContentEmoji(record.content) || '🖊️';
  if (pickVariant(record.id) === 'A') diaryMemo(ctx, record, moodEmoji, t, drawing);
  else diarySpring(ctx, record, moodEmoji, t, drawing);
}

// ─── 앨범 사진 ──────────────────────────────────────────────────────────────

// A. 폴라로이드 + 티켓 — 크라프트지 위 기울어진 폴라로이드, 분홍 도트 테이프, 뒤에 포스트잇
function albumPolaroid(ctx: CanvasRenderingContext2D, record: MyRecord, img: HTMLImageElement | null, t: number, caption: string) {
  const ease = Math.min(1, t / 0.25);
  const rnd = seededRnd(record.id); rnd(); rnd(); rnd();
  const tilt = (rnd() * 2 + 2) * (rnd() < 0.5 ? -1 : 1);
  paper(ctx, 'grid');

  ctx.save(); rotateAround(ctx, W - 120, 210, 8);
  ctx.fillStyle = C.yellow; ctx.fillRect(W - 210, 130, 170, 170);
  ctx.restore();
  ctx.save(); rotateAround(ctx, W / 2, 470, -tilt * 1.6);
  ctx.fillStyle = C.kraft; tornRectPath(ctx, 40, 230, W - 80, 500, `${record.id}k`); ctx.fill();
  ctx.restore();

  // 티켓 모양 시간 라벨
  ctx.save(); ctx.translate(44, 66); ctx.rotate(-2 * Math.PI / 180); ctx.scale(1.3, 1.3);
  ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(170, 0); ctx.arc(170, 26, 9, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(170, 52); ctx.lineTo(0, 52);
  ctx.arc(0, 26, 9, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(52, 6); ctx.lineTo(52, 46); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = 'bold 12px "Courier New", monospace'; ctx.fillStyle = C.red; ctx.fillText('TIME', 12, 31);
  ctx.font = `30px ${HAND}`; ctx.fillStyle = C.ink; ctx.fillText(record.slotTime, 66, 36);
  ctx.restore();

  ctx.globalAlpha = ease;
  const pw = 410, ph = 520, px = (W - pw) / 2, py = 190 + (1 - ease) * 14;
  ctx.save();
  rotateAround(ctx, W / 2, py + ph / 2, tilt);
  softShadow(ctx);
  ctx.fillStyle = C.white; ctx.fillRect(px, py, pw, ph);
  noShadow(ctx);
  ctx.strokeStyle = 'rgba(43,38,34,0.25)'; ctx.lineWidth = 1.5; ctx.strokeRect(px, py, pw, ph);
  photoRect(ctx, img, px + 20, py + 20, pw - 40, pw - 40);
  // 캡션은 사진 아래 흰 칸 한가운데. 길면 두 줄까지
  let size = fitHand(ctx, caption, 36, pw - 50, 28);
  let lines = wrapWords(ctx, caption, pw - 50, 2);
  if (lines.length > 1) { size = 30; ctx.font = `${size}px ${HAND}`; lines = wrapWords(ctx, caption, pw - 50, 2); }
  ctx.fillStyle = C.ink; ctx.textAlign = 'center';
  const zoneMid = py + pw - 20 + (ph - (pw - 20)) / 2;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, zoneMid + size * 0.35 + (i - (lines.length - 1) / 2) * size * 1.2));
  ctx.textAlign = 'left';
  ctx.restore();
  washi(ctx, W / 2, py + 2, 160, 38, tilt * -0.8, C.pink, 'dot');

  star(ctx, W - 70, 770, 20, C.yellow, 14);
  heart(ctx, W - 120, 830, 22, C.red, 10);
  sparkle(ctx, 90, 220, 13);
  ctx.globalAlpha = 1;
}

// B. 스크랩 노트 — 찢은 크라프트지 위 흰 테두리 사진, 모서리 테이프 두 장, 아래 캡션 라벨
function albumScrap(ctx: CanvasRenderingContext2D, record: MyRecord, img: HTMLImageElement | null, t: number, caption: string) {
  const ease = Math.min(1, t / 0.25);
  paper(ctx, 'dot');

  ctx.font = `42px ${HAND}`;
  const tw = ctx.measureText(record.slotTime).width;
  ctx.fillStyle = 'rgba(150,199,236,0.85)'; ctx.fillRect(44, 92, tw + 14, 20);
  ctx.fillStyle = C.ink; ctx.fillText(record.slotTime, 51, 106);
  ctx.font = `30px ${HAND}`; ctx.fillStyle = 'rgba(43,38,34,0.7)'; ctx.fillText('찰칵 ✎', 70 + tw, 106);

  ctx.globalAlpha = ease;
  ctx.save(); rotateAround(ctx, W / 2, 440, -3);
  softShadow(ctx);
  ctx.fillStyle = C.kraft; tornRectPath(ctx, 48, 160, W - 96, 540, record.id); ctx.fill();
  noShadow(ctx);
  ctx.restore();
  const iw = 380, ih = 460, ix = (W - iw) / 2, iy = 200 + (1 - ease) * 12;
  ctx.save(); rotateAround(ctx, W / 2, iy + ih / 2, 2);
  ctx.fillStyle = C.white; ctx.fillRect(ix - 10, iy - 10, iw + 20, ih + 20);
  photoRect(ctx, img, ix, iy, iw, ih);
  ctx.restore();
  washi(ctx, ix + 8, iy + 4, 120, 32, -40, C.sky, 'stripe');
  washi(ctx, ix + iw - 8, iy + ih - 2, 120, 32, -40, C.green, 'check', 'rgba(255,255,255,0.55)');

  // 캡션 라벨 — 한 줄에 안 들어가면 두 줄로
  const maxW = W - 140;
  let size = fitHand(ctx, caption, 36, maxW, 28);
  let lines = wrapWords(ctx, caption, maxW, 2);
  if (lines.length > 1) { size = 30; ctx.font = `${size}px ${HAND}`; lines = wrapWords(ctx, caption, maxW, 2); }
  const cw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 40;
  const chh = lines.length * size * 1.2 + 30;
  ctx.save(); ctx.translate(W / 2, 770); ctx.rotate(-2 * Math.PI / 180);
  ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.fillRect(-cw / 2, -chh / 2, cw, chh); ctx.strokeRect(-cw / 2, -chh / 2, cw, chh);
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, 0, 3 + (i - (lines.length - 1) / 2) * size * 1.2));
  ctx.restore();
  washi(ctx, W / 2 - cw / 2 + 6, 770 - chh / 2 - 4, 70, 26, -20, C.yellow, 'plain');

  star(ctx, W - 76, 150, 20, C.yellow, 10);
  star(ctx, 70, 870, 14, C.pink, -8);
  sparkle(ctx, W - 100, 870, 12);
  ctx.globalAlpha = 1;
}

/** 앨범에서 고른 사진(짤) 장면. 손글씨 문구는 사용자가 입력한 캡션 */
export function drawMemeScene(
  ctx: CanvasRenderingContext2D,
  record: MyRecord,
  img: HTMLImageElement | null,
  t: number,
) {
  const caption = record.caption?.trim() || '오늘의 한 장';
  if (pickVariant(record.id) === 'A') albumPolaroid(ctx, record, img, t, caption);
  else albumScrap(ctx, record, img, t, caption);
}
