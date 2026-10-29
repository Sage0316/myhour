// 영상 오른쪽 아래의 작은 로고 (2026-10-29, 펌킨이 시안 W1로 고름). 한국어는 HAKKU, 영어는 MyHour(펌킨이 같은 획으로 그린 워드마크).
// SNS에 공유된 영상을 몇 초만 보고 넘겨도 앱 이름이 보이게 하려는 것 — 엔딩 카드의 "하꾸"는 끝까지 봐야 보인다.
// 영상은 구독자만 만들 수 있어서 "돈 내면 없어지는" 워터마크가 아니다. 그래서 설정에서 끌 수 있다(기본 켜짐).
// 연회색 로고에 아주 옅은 흰 테두리 — 장면을 가리지 않는 은은한 워터마크. (진한 검정은 '도장 같다'고 해서 2026-10-29 펌킨 요청으로 연회색)

import { getLang } from './i18n';

const ENABLED_KEY = 'hakku_video_watermark_v1';

export function isWatermarkEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) !== '0'; } catch { return true; }
}

export function setWatermarkEnabled(on: boolean): void {
  try { localStorage.setItem(ENABLED_KEY, on ? '1' : '0'); } catch { /* 저장 실패 시 기본값(켜짐) 유지 */ }
}

// 540×960 논리 좌표 기준 (720px 영상에서 HAKKU가 104px 폭, 오른쪽 30px·아래 36px 여백으로 본 시안과 같은 비율).
// 두 로고는 가로세로 비율이 달라서 높이를 맞추고 폭은 로고 비율대로 둔다
const MARK_H = 78 * 409 / 1340.2;
const RIGHT = 22;
const BOTTOM = 27;
const INK = '#C9C3B9'; // 따뜻한 연회색 (크림 종이와 같은 결)
const INK_ALPHA = 0.9;
const HALO_ALPHA = 0.45;
const HALO = 2.5;

/** 로고에 흰 테두리를 미리 입혀 둔 캔버스. 프레임마다 이걸 한 번 그리기만 한다 */
export async function loadWatermark(scale: number): Promise<HTMLCanvasElement | null> {
  const en = getLang() === 'en';
  const img = new Image();
  img.src = `${import.meta.env.BASE_URL}brand/${en ? 'myhour-wordmark-transparent.png' : 'hakku-wordmark-transparent.svg'}`;
  try { await img.decode(); } catch { return null; }
  if (!img.naturalWidth) return null;

  // HAKKU SVG는 글자 위아래에 여백이 있고(높이 409 중 글자 329) MyHour PNG는 글자에 딱 맞게 잘려 있어서, 글자 높이를 맞춘다
  const markH = en ? MARK_H * 329 / 409 : MARK_H;
  const markW = markH * img.naturalWidth / img.naturalHeight;
  const w = Math.round((markW + HALO * 2) * scale);
  const h = Math.round((markH + HALO * 2) * scale);
  const pad = HALO * scale;

  // 흰 테두리: 로고 모양을 흰색으로 칠해 8방향으로 살짝씩 밀어 찍는다
  const silhouette = document.createElement('canvas');
  silhouette.width = w; silhouette.height = h;
  const s = silhouette.getContext('2d')!;
  s.drawImage(img, pad, pad, markW * scale, markH * scale);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = '#FFFFFF';
  s.fillRect(0, 0, w, h);

  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const o = out.getContext('2d')!;
  o.globalAlpha = HALO_ALPHA;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    o.drawImage(silhouette, Math.cos(a) * pad, Math.sin(a) * pad);
  }
  // 로고 모양을 연회색으로 칠해 얹는다 (원본 로고는 검정)
  const ink = document.createElement('canvas');
  ink.width = w; ink.height = h;
  const k = ink.getContext('2d')!;
  k.drawImage(img, pad, pad, markW * scale, markH * scale);
  k.globalCompositeOperation = 'source-in';
  k.fillStyle = INK;
  k.fillRect(0, 0, w, h);
  o.globalAlpha = INK_ALPHA;
  o.drawImage(ink, 0, 0);
  return out;
}

/** 장면을 다 그린 뒤 맨 위에 얹는다. ctx는 논리 좌표(W×H)로 scale된 상태다 */
export function drawWatermark(ctx: CanvasRenderingContext2D, mark: HTMLCanvasElement, W: number, H: number, scale: number): void {
  const w = mark.width / scale;
  const h = mark.height / scale;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(mark, W - RIGHT - w + HALO, H - BOTTOM - h + HALO, w, h);
  ctx.restore();
}
