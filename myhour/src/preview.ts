// 장면 디자인 미리보기 (개발용) — vite dev에서 /preview.html 로 접속
import type { MyRecord } from './store';
import {
  W, H, ensureDiaryFont,
  drawTitleScene, drawDiaryScene, drawPhotoScene, drawAudioScene, drawClosingScene,
} from './scenes';

const EMOJIS = ['🌙', '☁️', '✨', '🍵'];

function rec(id: string, type: MyRecord['type'], content: string, caption?: string): MyRecord {
  return { id, slotTime: '14:37', type, content, caption, createdAt: Date.now() } as MyRecord;
}

// 가짜 사진 (그라데이션 + 도형)
function fakePhoto(): Promise<HTMLImageElement> {
  const c = document.createElement('canvas');
  c.width = 800; c.height = 1200;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 800, 1200);
  g.addColorStop(0, '#7A93B8'); g.addColorStop(0.6, '#C9A88A'); g.addColorStop(1, '#8A6B57');
  x.fillStyle = g; x.fillRect(0, 0, 800, 1200);
  x.fillStyle = 'rgba(255,255,255,0.35)';
  x.beginPath(); x.arc(600, 260, 110, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(30,40,60,0.5)';
  x.fillRect(0, 860, 800, 340);
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.src = c.toDataURL();
  });
}

function cell(label: string): CanvasRenderingContext2D {
  const wrap = document.createElement('div');
  wrap.className = 'cell';
  const span = document.createElement('span');
  span.textContent = label;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  wrap.appendChild(span); wrap.appendChild(canvas);
  document.body.appendChild(wrap);
  return canvas.getContext('2d')!;
}

async function main() {
  await ensureDiaryFont();
  const t = 0.6; // 애니메이션이 끝난 시점

  drawTitleScene(cell('title'), { title: '커피 두 잔의 날', dateStr: '7.18 금요일', count: 5, types: ['text', 'photo', 'video', 'text', 'audio'] }, t);

  // 키워드 사전 매칭 (AI 없이) — 내용을 그리는 이모지가 자동으로 붙는다
  drawDiaryScene(cell('그림일기 · 떡볶이'), rec('z9', 'text', '퇴근하고 떡볶이 먹음'), EMOJIS, t);
  drawDiaryScene(cell('그림일기 · 커피'), rec('c1', 'text', '아침에 커피 두 잔 마셨다'), EMOJIS, t);
  drawDiaryScene(cell('그림일기 · 산책'), rec('c2', 'text', '점심에 새로 생긴 파스타집 갔는데 생각보다 별로였다. 그래도 산책은 좋았음'), EMOJIS, t);
  // AI가 준 diaryEmoji를 직접 지정한 경우 (짧은 글에 특히 잘 맞음)
  drawDiaryScene(cell('그림일기 · AI지정(다짐)'), rec('a1', 'text', '그래도 화이팅', '오늘의 다짐'), EMOJIS, t, '💪');
  drawDiaryScene(cell('그림일기 · 긴 글'), rec('c3', 'text', '오늘은 아침부터 회의가 세 개나 있어서 정신이 하나도 없었다. 그래도 점심에 혼자 나가서 김치찌개 먹으면서 잠깐 숨 돌린 게 제일 좋았던 순간. 저녁엔 운동 가려고 했는데 결국 침대에 누워버렸다.'), EMOJIS, t);

  const photo = await fakePhoto();
  drawPhotoScene(cell('photo · 캡션 있음'), rec('d4', 'photo', 'data:', '한강 산책'), photo, EMOJIS, t);
  drawPhotoScene(cell('photo · 캡션 없음'), rec('e5', 'photo', 'data:'), photo, EMOJIS, t);

  drawAudioScene(cell('audio'), rec('f6', 'audio', '', '오늘의 목소리 메모'), t);

  drawClosingScene(cell('closing'), { closing: '결국 다 먹었다. 그걸로 됐다.', dateStr: '7.18 금요일' }, t);
}

main();
