// 영상 장면 렌더러 — videoGenerator와 미리보기(preview.html)가 공유한다.
// 모든 좌표는 540×960 논리 좌표계 기준.
import type { MyRecord } from './store';
import { TYPE_COLORS } from './store';

export const W = 540;
export const H = 960;

export const PAPER = '#FAF9F7';
export const INK = '#1A1A1A';

// 그림일기용 손글씨 폰트 (개구/Gaegu, OFL — 크레파스 느낌). 로드 실패 시 시스템 폰트로 폴백.
export const HAND = "'DiaryHand', system-ui, sans-serif";
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
  // 음식·음료 (구체적인 것 먼저)
  [/떡볶이|엽떡|즉떡/, '🍢'], [/라면/, '🍜'], [/치킨/, '🍗'], [/피자/, '🍕'],
  [/초밥|스시|회\b/, '🍣'], [/파스타|스파게티/, '🍝'], [/햄버거|버거/, '🍔'],
  [/삼겹|고기|구이|바베큐/, '🥩'], [/찌개|국밥|해장/, '🍲'], [/김밥/, '🍙'],
  [/샐러드/, '🥗'], [/과일|사과|딸기|수박/, '🍓'],
  [/커피|카페|아메리카노|라떼/, '☕'], [/맥주|술|소주|와인|하이볼/, '🍺'],
  [/빵|베이커리|크로플/, '🥐'], [/디저트|케이크|아이스크림|마카롱/, '🍰'],
  [/떡\b|한과/, '🍡'], [/차\b|녹차|티백/, '🍵'],
  // 활동
  [/산책|걷|한강/, '🚶'], [/운동|헬스|러닝|요가|필라테스|수영/, '💪'],
  [/잠|수면|낮잠|졸/, '😴'], [/청소|빨래|집안일|설거지/, '🧹'],
  [/공부|시험|과제|스터디/, '📚'], [/회의|미팅|출근|업무|야근|일했/, '💼'], [/퇴근/, '🚪'],
  [/영화|넷플릭스|드라마|극장/, '🎬'], [/음악|노래|콘서트|플레이리스트/, '🎵'],
  [/책|독서|서점|교보/, '📖'], [/게임|롤\b|오락/, '🎮'], [/그림|드로잉|스케치/, '🎨'],
  [/사진|촬영|찍/, '📷'], [/여행|비행기|숙소|기차|공항/, '✈️'],
  [/쇼핑|장보기|마트|택배/, '🛍️'], [/병원|치과|약국|진료/, '🏥'],
  [/미용실|머리|파마|염색/, '💇'], [/은행|송금|카드값|월급/, '💳'],
  [/반지|목걸이|귀걸이|주얼리/, '💍'], [/꽃|화분|식물/, '🌷'],
  [/운전|차\b|주차/, '🚗'], [/지하철|버스|출퇴근길/, '🚇'],
  [/카톡|전화|통화|연락/, '📞'], [/생일|축하|파티/, '🎉'],
  // 사람·관계
  [/친구|모임|약속/, '👯'], [/가족|엄마|아빠|부모님/, '👨‍👩‍👧'],
  [/강아지|댕댕이|산책시/, '🐶'], [/고양이|냥/, '🐱'],
  // 날씨
  [/비\b|우산|장마/, '🌧️'], [/눈\b|함박눈/, '❄️'], [/더위|더워|여름|폭염/, '☀️'],
  [/추위|추워|겨울|한파/, '🥶'], [/바람|태풍/, '🌬️'],
  // 감정 (구체적 사물이 없을 때의 마지막 보루)
  [/기쁘|행복|좋았|신난/, '😊'], [/힘들|피곤|지침|지쳤/, '😮‍💨'],
  [/화나|짜증|빡/, '😤'], [/슬프|눈물|울었/, '😢'],
  [/설레|기대/, '🥰'], [/불안|걱정|초조/, '😰'], [/뿌듯|해냈|성공/, '🙌'],
  // 범용 식사 표현은 맨 뒤 — 위의 구체적인 음식이 먼저 잡히게
  [/밥|점심|저녁|아침|식사|먹었/, '🍚'],
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

// 글 장면 — 길이에 따라 글자 크기가 변하고, 내용 이모지가 있으면 문장 끝에 붙는다
export function drawTextScene(
  ctx: CanvasRenderingContext2D,
  record: MyRecord,
  t: number,
  contentEmoji?: string | null,
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

  // 문장 끝에 이모지 하나 — 이 기록의 내용에서 나온 것만. 없으면 아무것도 붙이지 않는다
  // (예전엔 그날 무드 세트에서 무작위로 뽑아서 내용과 무관한 이모지가 붙었다)
  const endEmoji = contentEmoji?.trim() || pickContentEmoji(record.content);
  if (endEmoji) {
    const lastLine = lines[lines.length - 1];
    const lastW = ctx.measureText(lastLine).width;
    const es = Math.min(size * 1.1, 54);
    const ex = Math.min(48 + lastW + es * 0.75, W - 44);
    const ey = (cy - lh) - size * 0.32 + rise;
    const emoji = endEmoji;
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

// 그림일기(글)·짤(앨범 사진) 장면은 scenesDakku.ts에 있다 (2026-10-28 다꾸 스타일로 교체).

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

// 사진 장면 — 사진 위에 얹는 이모지는 그 사진 캡션에서 나온 것만 쓴다.
// 없으면 아무것도 얹지 않는다 (예전엔 그날 무드 세트에서 무작위로 2개를 뿌려서
// 신발 사진에 💍가 붙는 식으로 내용과 무관한 이모지가 나왔다)
export function drawPhotoScene(
  ctx: CanvasRenderingContext2D,
  record: MyRecord,
  img: HTMLImageElement | null,
  t: number,
  contentEmoji?: string | null,
) {
  const emoji = contentEmoji?.trim() || pickContentEmoji(record.caption ?? '');
  const emojiPlan = emoji ? planEmojis([emoji], record.id) : [];
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

// 마지막 장면은 scenesClosing.ts에 있다 (2026-10-28 다꾸 스타일 5종으로 교체).
