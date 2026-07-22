// 영상 장면 렌더러 — videoGenerator와 미리보기(preview.html)가 공유한다.
// 모든 좌표는 540×960 논리 좌표계 기준.
import type { MyRecord } from './store';
import { TYPE_COLORS } from './store';

export const W = 540;
export const H = 960;

export const PAPER = '#FAF9F7';
export const INK = '#1A1A1A';

// 그림일기용 손글씨 폰트 (개구/Gaegu, OFL — 크레파스 느낌). 로드 실패 시 시스템 폰트로 폴백.
const HAND = "'DiaryHand', system-ui, sans-serif";
let handFontLoading: Promise<void> | null = null;

export function ensureDiaryFont(): Promise<void> {
  if (!handFontLoading) {
    handFontLoading = (async () => {
      try {
        const url = `${import.meta.env.BASE_URL}fonts/Gaegu-Regular.ttf`;
        const face = new FontFace('DiaryHand', `url(${url})`);
        await face.load();
        document.fonts.add(face);
      } catch { /* 폴백 폰트로 진행 */ }
    })();
  }
  return handFontLoading;
}

// ─── 공용 헬퍼 ──────────────────────────────────────────────────────────────

export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function seededRnd(seedStr: string): () => number {
  let seed = 7;
  for (const c of seedStr) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    if (ch === '\n') { if (line) lines.push(line); line = ''; continue; }
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = ch; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  let cy = y;
  for (const l of wrapLines(ctx, text, maxW)) { ctx.fillText(l, x, cy); cy += lh; }
  return cy;
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, scale = 1) {
  const ia = img.naturalWidth / img.naturalHeight;
  const ca = W / H;
  let sw: number, sh: number;
  if (ia > ca) { sh = H * scale; sw = sh * ia; }
  else { sw = W * scale; sh = sw / ia; }
  ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
}

export function drawVideoCover(ctx: CanvasRenderingContext2D, vid: HTMLVideoElement) {
  if (!vid.videoWidth || !vid.videoHeight) return;
  const ia = vid.videoWidth / vid.videoHeight;
  const ca = W / H;
  let sw: number, sh: number;
  if (ia > ca) { sh = H; sw = sh * ia; }
  else { sw = W; sh = sw / ia; }
  ctx.drawImage(vid, (W - sw) / 2, (H - sh) / 2, sw, sh);
}

// ─── 무드 이모지 ─────────────────────────────────────────────────────────────

const FALLBACK_EMOJIS: Record<string, string[]> = {
  '잔잔함': ['🌿', '☁️', '🫧', '🍵'],
  '뿌듯함': ['✨', '🌟', '💪', '🙌'],
  '감성': ['🌙', '🕯️', '🎞️', '💭'],
  '웃김': ['😆', '🤪', '🎈', '😜'],
  '정신없음': ['🌪️', '😵‍💫', '⚡', '🏃'],
  '슬픔': ['😢', '🌧️', '💧', '🫂'],
  '짜증': ['😤', '💢', '🌩️', '😑'],
  '지침': ['😮‍💨', '🪫', '🛌', '🫠'],
};

export function fallbackEmojisFor(mood: string): string[] {
  return FALLBACK_EMOJIS[mood] ?? FALLBACK_EMOJIS['잔잔함'];
}

// AI가 없을 때 쓰는 키워드→이모지 사전. 그림일기의 "그림" 자리를 채운다.
// 구체적인 단어를 먼저 검사하고, "밥/점심/저녁" 같은 범용 시간대 단어는 맨 뒤로 미뤄서
// "산책" 같은 더 구체적인 행동이 있으면 그쪽이 우선 채택되게 한다.
const KEYWORD_EMOJI: [RegExp, string][] = [
  [/떡볶이|엽떡|즉떡/, '🍢'], [/라면/, '🍜'], [/치킨/, '🍗'], [/피자/, '🍕'],
  [/커피|카페|아메리카노/, '☕'], [/맥주|술|소주|와인/, '🍺'],
  [/빵|베이커리/, '🥐'], [/디저트|케이크|아이스크림/, '🍰'],
  [/산책|걷|한강/, '🚶'], [/운동|헬스|러닝|요가/, '💪'], [/잠|수면|낮잠|졸/, '😴'],
  [/공부|시험|과제/, '📚'], [/회의|미팅|출근|업무|야근/, '💼'], [/퇴근/, '🚪'],
  [/영화|넷플릭스|드라마/, '🎬'], [/음악|노래|콘서트/, '🎵'], [/책|독서/, '📖'],
  [/비|우산|장마/, '🌧️'], [/눈/, '❄️'], [/더위|더워|여름/, '☀️'], [/추위|추워|겨울/, '🥶'],
  [/친구|모임|약속/, '👯'], [/가족|엄마|아빠/, '👨‍👩‍👧'], [/강아지|댕댕이/, '🐶'], [/고양이|냥/, '🐱'],
  [/여행|비행기|숙소/, '✈️'], [/쇼핑|장보기/, '🛍️'], [/청소|빨래|집안일/, '🧹'],
  [/기쁘|행복|좋았/, '😊'], [/힘들|피곤|지침/, '😮‍💨'], [/화나|짜증/, '😤'], [/슬프|눈물/, '😢'],
  [/밥|점심|저녁|아침|식사/, '🍚'],
];

export function pickContentEmoji(content: string): string | null {
  for (const [re, emoji] of KEYWORD_EMOJI) if (re.test(content)) return emoji;
  return null;
}

export function splitEmojis(str: string): string[] {
  try {
    return Array.from(new Intl.Segmenter().segment(str), s => s.segment)
      .map(s => s.trim()).filter(Boolean);
  } catch {
    return Array.from(str).filter(s => s.trim());
  }
}

// 사진 위 스캐터: 세로로 90px 이상 벌려서 나란히 서는 걸 막는다
interface EmojiPlacement { emoji: string; x: number; y: number; size: number; rot: number; phase: number }

export function planEmojis(emojis: string[], seedStr: string): EmojiPlacement[] {
  if (emojis.length === 0) return [];
  const rnd = seededRnd(seedStr);

  const zones = [
    { x: [W * 0.58, W - 90] as const, y: [100, 230] as const },
    { x: [34, W * 0.3] as const, y: [130, 280] as const },
    { x: [W * 0.62, W - 80] as const, y: [H * 0.58, H * 0.7] as const },
    { x: [40, W * 0.28] as const, y: [H * 0.62, H * 0.74] as const },
  ];
  for (let i = zones.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [zones[i], zones[j]] = [zones[j], zones[i]];
  }
  const pool = [...emojis];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const count = Math.min(2, pool.length, zones.length);
  const placements: EmojiPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const z = zones[i];
    let x = 0, y = 0, ok = false;
    for (let attempt = 0; attempt < 10 && !ok; attempt++) {
      x = z.x[0] + rnd() * (z.x[1] - z.x[0]);
      y = z.y[0] + rnd() * (z.y[1] - z.y[0]);
      ok = placements.every(p => Math.abs(p.y - y) >= 90);
    }
    if (!ok) continue;
    placements.push({
      emoji: pool[i], x, y,
      size: 40 + rnd() * 30,
      rot: (rnd() * 36 - 18) * Math.PI / 180,
      phase: rnd() * Math.PI * 2,
    });
  }
  return placements;
}

export function drawEmojis(ctx: CanvasRenderingContext2D, placements: EmojiPlacement[], t: number, onPhoto = false) {
  for (const p of placements) {
    const bob = Math.sin(t * Math.PI * 2 + p.phase) * 7;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(p.rot);
    if (onPhoto) { ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 10; }
    ctx.globalAlpha = 0.95;
    ctx.font = `${p.size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = onPhoto ? '#fff' : 'rgba(26,26,26,0.82)';
    ctx.fillText(p.emoji, 0, 0);
    ctx.restore();
  }
}

// ─── 장면들 ─────────────────────────────────────────────────────────────────

export function drawTitleScene(
  ctx: CanvasRenderingContext2D,
  opts: { title: string; dateStr: string; count: number; types?: MyRecord['type'][]; emojiSet?: string[] },
  t: number,
) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);

  // 상단 구석 은은한 워시
  const wash = ctx.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, 460);
  wash.addColorStop(0, hexAlpha(TYPE_COLORS['photo'], 0.5));
  wash.addColorStop(1, hexAlpha(TYPE_COLORS['photo'], 0));
  ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);

  const ease = Math.min(1, t / 0.3);
  const rise = (1 - ease) * 16;

  ctx.globalAlpha = ease;
  ctx.font = `bold 14px "Courier New", monospace`;
  ctx.fillStyle = 'rgba(26,26,26,0.35)';
  ctx.fillText('하 꾸', 44, 104);
  ctx.font = `13px "Courier New", monospace`;
  ctx.fillStyle = 'rgba(26,26,26,0.45)';
  ctx.fillText(opts.dateStr, 44, 132);

  // 제목 — 짧으면 크게
  const size = opts.title.length <= 10 ? 54 : opts.title.length <= 18 ? 46 : 40;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.fillStyle = INK;
  const endY = wrapText(ctx, opts.title, 44, H * 0.52 + rise, W - 88, size * 1.35);

  // 기록 타입 색 점들 — 오늘 하루의 구성
  if (opts.types && opts.types.length > 0) {
    let dx = 44;
    for (const ty of opts.types.slice(0, 10)) {
      ctx.fillStyle = TYPE_COLORS[ty];
      ctx.beginPath(); ctx.arc(dx + 6, endY + 22 + rise, 6, 0, Math.PI * 2); ctx.fill();
      dx += 20;
    }
  }
  ctx.font = `12px "Courier New", monospace`;
  ctx.fillStyle = 'rgba(26,26,26,0.4)';
  ctx.fillText(`${opts.count} MOMENTS`, 44, endY + 58 + rise);
  ctx.globalAlpha = 1;
}

// 글 장면 — 길이에 따라 글자 크기가 변하고, 이모지는 문장 끝에 붙는다
export function drawTextScene(
  ctx: CanvasRenderingContext2D,
  record: MyRecord,
  emojiSet: string[],
  t: number,
) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  const rnd = seededRnd(record.id);
  const accent = TYPE_COLORS['text'];

  // 구석에 은은한 색 워시 (기록마다 위치가 다름)
  const washX = rnd() < 0.5 ? W * 0.88 : W * 0.1;
  const washY = rnd() < 0.5 ? H * 0.14 : H * 0.86;
  const wash = ctx.createRadialGradient(washX, washY, 0, washX, washY, 420);
  wash.addColorStop(0, hexAlpha(accent, 0.65));
  wash.addColorStop(1, hexAlpha(accent, 0));
  ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);

  // 시간 필 (파스텔 pill)
  ctx.font = `bold 13px "Courier New", monospace`;
  const tw = ctx.measureText(record.slotTime).width;
  roundRectPath(ctx, 44, 76, tw + 28, 34, 17);
  ctx.fillStyle = hexAlpha(accent, 0.9); ctx.fill();
  ctx.fillStyle = 'rgba(26,26,26,0.6)';
  ctx.fillText(record.slotTime, 58, 98);

  // 길이 적응형 타이포
  const len = record.content.length;
  const [size, lh, weight] =
    len <= 14 ? [46, 68, 700] :
    len <= 44 ? [38, 58, 600] :
    len <= 100 ? [31, 49, 500] : [26, 42, 500];
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  const lines = wrapLines(ctx, record.content, W - 100);
  const blockH = lines.length * lh;
  const firstBaseline = Math.max(H * 0.3, H * 0.5 - blockH / 2 + lh * 0.7);

  const ease = Math.min(1, t / 0.25);
  const rise = (1 - ease) * 14;
  ctx.globalAlpha = ease;

  // 큰 인용부호 장식
  ctx.font = `400 150px Georgia, serif`;
  ctx.fillStyle = 'rgba(26,26,26,0.07)';
  ctx.fillText('“', 26, firstBaseline - size * 0.2 + rise);

  // 본문
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(26,26,26,0.9)';
  let cy = firstBaseline + rise;
  for (const l of lines) { ctx.fillText(l, 48, cy); cy += lh; }

  // 문장 끝에 이모지 하나 — 손으로 찍은 느낌
  if (emojiSet.length > 0) {
    const lastLine = lines[lines.length - 1];
    const lastW = ctx.measureText(lastLine).width;
    const es = Math.min(size * 1.1, 54);
    const ex = Math.min(48 + lastW + es * 0.75, W - 44);
    const ey = (cy - lh) - size * 0.32 + rise;
    const emoji = emojiSet[Math.floor(rnd() * emojiSet.length)];
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate((rnd() * 24 - 12) * Math.PI / 180);
    ctx.font = `${es}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // AI 자막
  if (record.caption) {
    ctx.font = `400 17px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(26,26,26,0.45)';
    ctx.fillText(record.caption, 48, H - 60);
  }
}

// 그림일기 장면 — 테두리 프레임, 그림 칸엔 그 기록 내용을 나타내는 이모지,
// 날씨 칸엔 오늘의 무드 이모지. moodEmojis는 폴백용 풀, contentEmoji가 있으면 우선.
export function drawDiaryScene(
  ctx: CanvasRenderingContext2D,
  record: MyRecord,
  moodEmojis: string[],
  t: number,
  contentEmoji?: string | null,
) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  const rnd = seededRnd(record.id);
  const ease = Math.min(1, t / 0.25);
  const drawingEmoji = contentEmoji ?? pickContentEmoji(record.content)
    ?? (moodEmojis[Math.floor(rnd() * moodEmojis.length)] ?? '🖊️');
  const moodEmoji = moodEmojis.length > 0 ? moodEmojis[Math.floor(rnd() * moodEmojis.length)] : null;

  // 카드 프레임
  const cardX = 40, cardY = 96, cardW = W - 80, cardH = H - 208;
  ctx.fillStyle = '#FFFFFF';
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 6);
  ctx.fill();
  // 진한 회색 — 낙서 원(0.18)보다는 진하고 블랙에 가깝지 않게
  ctx.strokeStyle = 'rgba(26,26,26,0.4)';
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 6);
  ctx.stroke();

  // 헤더 행: 시간 + 날씨 칸
  const headerH = 56;
  ctx.strokeStyle = 'rgba(26,26,26,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX, cardY + headerH); ctx.lineTo(cardX + cardW, cardY + headerH);
  ctx.stroke();
  ctx.font = `26px ${HAND}`;
  ctx.fillStyle = 'rgba(26,26,26,0.78)';
  ctx.fillText(`${record.slotTime} 의 기록`, cardX + 20, cardY + 38);
  // 날씨 칸 (오른쪽)
  const wBoxW = 96;
  ctx.beginPath();
  ctx.moveTo(cardX + cardW - wBoxW, cardY); ctx.lineTo(cardX + cardW - wBoxW, cardY + headerH);
  ctx.stroke();
  ctx.font = `bold 11px "Courier New", monospace`;
  ctx.fillStyle = 'rgba(26,26,26,0.4)';
  ctx.fillText('오늘', cardX + cardW - wBoxW + 12, cardY + 22);
  if (moodEmoji) {
    ctx.font = `24px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(26,26,26,0.75)';
    ctx.fillText(moodEmoji, cardX + cardW - wBoxW + 42, cardY + 40);
  }

  // 그림 칸 — 이모지가 그림
  const drawH = 330;
  ctx.strokeStyle = 'rgba(26,26,26,0.35)';
  ctx.beginPath();
  ctx.moveTo(cardX, cardY + headerH + drawH); ctx.lineTo(cardX + cardW, cardY + headerH + drawH);
  ctx.stroke();

  // 은은한 워시 배경
  const wash = ctx.createRadialGradient(W / 2, cardY + headerH + drawH / 2, 0, W / 2, cardY + headerH + drawH / 2, 240);
  const accent = TYPE_COLORS['text'];
  wash.addColorStop(0, hexAlpha(accent, 0.4));
  wash.addColorStop(1, hexAlpha(accent, 0));
  ctx.save();
  roundRectPath(ctx, cardX + 2, cardY + headerH, cardW - 4, drawH, 0);
  ctx.clip();
  ctx.fillStyle = wash;
  ctx.fillRect(cardX, cardY + headerH, cardW, drawH);

  {
    ctx.globalAlpha = ease;
    const cx = W / 2;
    const cy = cardY + headerH + drawH / 2;
    const bob = Math.sin(t * Math.PI * 2) * 5;

    // 연필로 슥슥 그린 낙서 원 — 이모지가 안에 딱 들어오도록 원은 넉넉히, 이모지는 정중앙에
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.strokeStyle = 'rgba(26,26,26,0.18)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const rBase = 118;
    const pts = 30;
    const wobbleSeed = rnd() * 10;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const wobble = Math.sin(a * 3 + wobbleSeed) * 4;
      ctx.lineTo(Math.cos(a) * (rBase + wobble), Math.sin(a) * (rBase + wobble));
    }
    ctx.stroke();
    ctx.restore();

    // 내용을 나타내는 이모지 — 그 기록의 "그림". 원과 같은 중심, 기울기 없이.
    // ☕✈️ 같은 심볼은 컬러 글리프가 아니라 canvas fillStyle로 칠해지는 모노톤 글리프라
    // fillStyle을 명시하지 않으면 배경색과 같아져 안 보일 수 있다. 잉크색으로 깔아둔다.
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.font = `104px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(26,26,26,0.82)';
    ctx.fillText(drawingEmoji, 0, 6);
    ctx.restore();

    // 반짝임 낙서 포인트 하나
    ctx.save();
    ctx.translate(cx + 118, cy - 90 + bob * 0.6);
    ctx.strokeStyle = 'rgba(26,26,26,0.28)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (const ang of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 5, Math.sin(ang) * 5);
      ctx.lineTo(Math.cos(ang) * 13, Math.sin(ang) * 13);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // 줄노트 + 글
  const linesTop = cardY + headerH + drawH;
  const linesBottom = cardY + cardH;
  const len = record.content.length;
  const [size, lh] = len <= 20 ? [42, 62] : len <= 60 ? [36, 54] : [30, 46];
  const nRules = Math.floor((linesBottom - linesTop) / lh);
  ctx.strokeStyle = 'rgba(26,26,26,0.12)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= nRules; i++) {
    const y = linesTop + i * lh;
    if (y >= linesBottom - 6) break;
    ctx.beginPath();
    ctx.moveTo(cardX + 18, y); ctx.lineTo(cardX + cardW - 18, y);
    ctx.stroke();
  }
  ctx.globalAlpha = ease;
  ctx.font = `${size}px ${HAND}`;
  ctx.fillStyle = 'rgba(26,26,26,0.85)';
  const textLines = wrapLines(ctx, record.content, cardW - 48);
  for (let i = 0; i < textLines.length && i < nRules; i++) {
    ctx.fillText(textLines[i], cardX + 24, linesTop + (i + 1) * lh - 12);
  }
  ctx.globalAlpha = 1;

  // AI 자막
  if (record.caption) {
    ctx.font = `400 16px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(26,26,26,0.45)';
    ctx.fillText(record.caption, cardX, H - 52);
  }
}

// ─── 짤 장면 헬퍼 ────────────────────────────────────────────────────────────

// 이미지를 사각형 안에 cover-crop으로 채운다
function drawImageCoverRect(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ia = img.naturalWidth / img.naturalHeight;
  const ca = w / h;
  let sw: number, sh: number;
  if (ia > ca) { sh = h; sw = sh * ia; }
  else { sw = w; sh = sw / ia; }
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
  ctx.restore();
}

// 마스킹 테이프 조각
function drawTape(ctx: CanvasRenderingContext2D, x: number, y: number, rotDeg: number, color: string, w = 124) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotDeg * Math.PI / 180);
  ctx.fillStyle = hexAlpha(color, 0.72);
  ctx.fillRect(-w / 2, -17, w, 34);
  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(26,26,26,0.28)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (const ang of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 5, Math.sin(ang) * 5);
    ctx.lineTo(Math.cos(ang) * 13, Math.sin(ang) * 13);
    ctx.stroke();
  }
  ctx.restore();
}

// 손글씨 캡션 — 한 줄에 안 들어가면 최대 2줄까지 자동 줄바꿈 (그래도 안 맞으면 폰트를 더 줄이고,
// 그마저도 안 되면 마지막 수단으로 둘째 줄만 말줄임). 폭 안에서 잘리던 이전 방식과 달리
// 20자 한도 안의 캡션은 사실상 항상 온전히 보인다.
function drawHandCaption(
  ctx: CanvasRenderingContext2D, text: string, cx: number, centerY: number, maxW: number, baseSize: number,
): { width: number; lastBaselineY: number } {
  let size = baseSize;
  ctx.font = `${size}px ${HAND}`;
  const fits = () => ctx.measureText(text).width <= maxW;
  while (size > 24 && !fits()) { size -= 2; ctx.font = `${size}px ${HAND}`; }

  let lines: string[];
  if (fits()) {
    lines = [text];
  } else {
    lines = wrapLines(ctx, text, maxW);
    while (lines.length > 2 && size > 18) {
      size -= 2; ctx.font = `${size}px ${HAND}`;
      lines = wrapLines(ctx, text, maxW);
    }
    if (lines.length > 2) {
      let last = lines[1];
      while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      lines = [lines[0], last + '…'];
    }
  }

  const lh = size * 1.18;
  const totalH = lh * lines.length;
  let y = centerY - totalH / 2 + lh * 0.78;
  let maxLineW = 0;
  ctx.textAlign = 'center';
  for (const l of lines) {
    ctx.fillText(l, cx, y);
    maxLineW = Math.max(maxLineW, ctx.measureText(l).width);
    y += lh;
  }
  ctx.textAlign = 'left';
  return { width: maxLineW, lastBaselineY: y - lh };
}

// 짤 장면 — 사용자가 고른 밈 이미지. 손글씨 문구는 사용자가 입력한 캡션.
// 기록 id 기준으로 폴라로이드/스크랩북 두 스타일 중 하나가 랜덤으로 걸린다.
export function drawMemeScene(
  ctx: CanvasRenderingContext2D,
  record: MyRecord,
  img: HTMLImageElement | null,
  t: number,
  moodColor = '#D9743F',
) {
  const rnd = seededRnd(record.id);
  // LCG는 첫 값이 이웃 시드끼리 거의 같다 — id가 Date.now() 기반이라 같은 날 기록이
  // 전부 같은 스타일로 몰리지 않게 두 번 돌려서 섞은 뒤 뽑는다
  rnd(); rnd();
  const accent = TYPE_COLORS['meme'];
  const variantPolaroid = rnd() < 0.5;
  const tilt = (rnd() * 2.5 + 1.8) * (rnd() < 0.5 ? -1 : 1); // -4.3°~-1.8° 또는 1.8°~4.3°
  const ease = Math.min(1, t / 0.25);
  const rise = (1 - ease) * 14;
  const caption = record.caption?.trim() || '오늘의 한 장';

  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);

  // 구석 워시 (기록마다 위치가 다름)
  const washX = rnd() < 0.5 ? W * 0.88 : W * 0.1;
  const washY = rnd() < 0.5 ? H * 0.14 : H * 0.86;
  const wash = ctx.createRadialGradient(washX, washY, 0, washX, washY, 430);
  wash.addColorStop(0, hexAlpha(accent, 0.6));
  wash.addColorStop(1, hexAlpha(accent, 0));
  ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);

  // 시간 필
  ctx.font = `bold 13px "Courier New", monospace`;
  const tw = ctx.measureText(record.slotTime).width;
  roundRectPath(ctx, 44, 76, tw + 28, 34, 17);
  ctx.fillStyle = hexAlpha(accent, 0.9); ctx.fill();
  ctx.fillStyle = 'rgba(26,26,26,0.6)';
  ctx.fillText(record.slotTime, 58, 98);

  const drawMeme = (x: number, y: number, w: number, h: number) => {
    if (img) { drawImageCoverRect(ctx, img, x, y, w, h); return; }
    // 원본이 정리됐거나 로드 실패 — 파스텔 블록으로 대신
    ctx.fillStyle = hexAlpha(accent, 0.45);
    ctx.fillRect(x, y, w, h);
    ctx.font = `64px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(26,26,26,0.5)';
    ctx.fillText('😆', x + w / 2, y + h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  };

  ctx.globalAlpha = ease;

  if (variantPolaroid) {
    // A. 폴라로이드 — 기울어진 흰 프레임, 위에 테이프, 하단에 손글씨
    const pw = 420, ph = 520;
    const px = (W - pw) / 2, py = H * 0.5 - ph / 2 + rise;
    ctx.save();
    ctx.translate(W / 2, py + ph / 2);
    ctx.rotate(tilt * Math.PI / 180);
    ctx.translate(-W / 2, -(py + ph / 2));
    ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#fff';
    roundRectPath(ctx, px, py, pw, ph, 4); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    drawMeme(px + 20, py + 20, pw - 40, pw - 40);
    ctx.fillStyle = 'rgba(26,26,26,0.8)';
    // 사진(px+20 ~ px+20+(pw-40)) 아래부터 카드 바닥까지가 캡션 영역 — 그 세로 구간의 중심에 맞춘다
    const capZoneTop = py + 20 + (pw - 40);
    drawHandCaption(ctx, caption, W / 2, (capZoneTop + (py + ph)) / 2, pw - 50, 34);
    drawTape(ctx, W / 2, py, 2, moodColor, 140);
    ctx.restore();
    drawSparkle(ctx, px + pw + 8, py - 6 + Math.sin(t * Math.PI * 2) * 4);
  } else {
    // B. 스크랩북 — 흰 테두리 짤을 모서리 테이프로 붙이고, 아래 손글씨 + 물결 밑줄
    const iw = 440, ih = 440;
    const ix = (W - iw) / 2, iy = H * 0.47 - ih / 2 + rise;
    ctx.save();
    ctx.translate(W / 2, iy + ih / 2);
    ctx.rotate(tilt * 0.4 * Math.PI / 180);
    ctx.translate(-W / 2, -(iy + ih / 2));
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#fff';
    ctx.fillRect(ix - 6, iy - 6, iw + 12, ih + 12);
    ctx.restore();
    drawMeme(ix, iy, iw, ih);
    drawTape(ctx, ix, iy, -45, moodColor);
    drawTape(ctx, ix + iw, iy + ih, -45, moodColor);
    ctx.restore();
    drawSparkle(ctx, ix + iw - 14, iy - 28 + Math.sin(t * Math.PI * 2) * 4);

    ctx.fillStyle = 'rgba(26,26,26,0.85)';
    const { width: capW, lastBaselineY } = drawHandCaption(ctx, caption, W / 2, iy + ih + 100, W - 100, 36);
    ctx.strokeStyle = hexAlpha(moodColor, 0.5);
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W / 2 - capW / 2, lastBaselineY + 16);
    ctx.quadraticCurveTo(W / 2, lastBaselineY + 24, W / 2 + capW / 2, lastBaselineY + 14);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

// 자막 한 줄 — 폭을 넘치면 폰트를 줄인다 (하한 18px, 그래도 넘치면 그대로 둔다)
export function drawCaptionLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number) {
  let size = 26;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  while (size > 18 && ctx.measureText(text).width > maxW) {
    size -= 1;
    ctx.font = `600 ${size}px system-ui, sans-serif`;
  }
  ctx.fillText(text, x, y);
}

export function drawPhotoScene(
  ctx: CanvasRenderingContext2D,
  record: MyRecord,
  img: HTMLImageElement | null,
  emojiSet: string[],
  t: number,
) {
  const emojiPlan = planEmojis(emojiSet, record.id);
  if (img) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const scale = 1 + t * 0.04;
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(scale, scale); ctx.translate(-W / 2, -H / 2);
    drawCover(ctx, img);
    ctx.restore();
    const grd = ctx.createLinearGradient(0, H * 0.6, 0, H);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  }
  ctx.font = `bold 13px "Courier New", monospace`;
  ctx.fillStyle = img ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,26,0.4)';
  ctx.fillText(record.slotTime, 44, H - (record.caption ? 100 : 56));
  if (record.caption) {
    ctx.fillStyle = img ? '#fff' : 'rgba(26,26,26,0.85)';
    drawCaptionLine(ctx, record.caption, 44, H - 60, W - 88);
  }
  drawEmojis(ctx, emojiPlan, t, !!img);
}

// 목소리가 없거나 디코딩 실패 시 쓰는 합성 파형 (말하는 리듬처럼 보이게 랜덤워크)
function syntheticEnvelope(seedStr: string, n = 44): number[] {
  const rnd = seededRnd(seedStr);
  const env: number[] = [];
  let v = 0.4;
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.5) * 0.5;
    v = Math.max(0.12, Math.min(1, v));
    env.push(v);
  }
  return env;
}

// 음성 장면 — 실제 녹음 파형이 재생 진행에 따라 색으로 차오른다
export function drawAudioScene(
  ctx: CanvasRenderingContext2D,
  record: MyRecord,
  t: number,
  envelope?: number[] | null,
  progress?: number,
  moodColor = '#7C5CC4', // 그날의 무드 색 — 파형이 이 색으로 차오른다
) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  const accent = TYPE_COLORS['audio'];
  const wash = ctx.createRadialGradient(W * 0.12, H * 0.85, 0, W * 0.12, H * 0.85, 420);
  wash.addColorStop(0, hexAlpha(accent, 0.6));
  wash.addColorStop(1, hexAlpha(accent, 0));
  ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);

  ctx.font = `bold 13px "Courier New", monospace`;
  const tw = ctx.measureText(record.slotTime).width;
  roundRectPath(ctx, 44, 76, tw + 28, 34, 17);
  ctx.fillStyle = hexAlpha(accent, 0.9); ctx.fill();
  ctx.fillStyle = 'rgba(26,26,26,0.6)';
  ctx.fillText(record.slotTime, 58, 98);

  const env = envelope && envelope.length > 0 ? envelope : syntheticEnvelope(record.id);
  const n = env.length;
  const bW = 7, gap = 5;
  const totalW = n * (bW + gap) - gap;
  const bx = (W - totalW) / 2;
  const cy = H / 2;
  const p = Math.max(0, Math.min(1, progress ?? t));

  for (let i = 0; i < n; i++) {
    const bh = Math.max(10, env[i] * 190);
    const played = (i + 0.5) / n <= p;
    // 재생된 구간은 무드 색, 아직인 구간은 연한 잉크 — 경계가 재생 위치
    ctx.fillStyle = played ? hexAlpha(moodColor, 0.8) : 'rgba(26,26,26,0.12)';
    roundRectPath(ctx, bx + i * (bW + gap), cy - bh / 2, bW, bh, 3.5);
    ctx.fill();
  }

  // 재생 위치 점
  const px = bx + p * totalW;
  ctx.beginPath();
  ctx.arc(px, cy + 128, 4, 0, Math.PI * 2);
  ctx.fillStyle = hexAlpha(moodColor, 0.7);
  ctx.fill();

  if (record.caption) {
    ctx.font = `400 17px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(26,26,26,0.45)';
    ctx.fillText(record.caption, 44, H - 60);
  }
}

// 영상 재생 위에 얹는 시간·자막 오버레이
export function drawVideoOverlay(ctx: CanvasRenderingContext2D, record: MyRecord) {
  ctx.font = `bold 13px "Courier New", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(record.slotTime, 44, H - (record.caption ? 100 : 56));
  if (record.caption) {
    ctx.fillStyle = '#fff';
    drawCaptionLine(ctx, record.caption, 44, H - 60, W - 88);
  }
}

export function drawClosingScene(
  ctx: CanvasRenderingContext2D,
  opts: { closing: string; dateStr: string },
  t: number,
) {
  ctx.fillStyle = '#161616'; ctx.fillRect(0, 0, W, H);
  const ease = Math.min(1, t / 0.35);
  ctx.globalAlpha = ease;
  ctx.font = `300 30px Georgia, serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  wrapText(ctx, opts.closing, 44, H * 0.45, W - 88, 48);
  ctx.font = `bold 12px "Courier New", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText(`하꾸 · ${opts.dateStr}`, 44, H - 56);
  ctx.globalAlpha = 1;
}
