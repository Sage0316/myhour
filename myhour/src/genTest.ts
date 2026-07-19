// 영상 생성 파이프라인 통합 테스트 (개발용)
import type { MyRecord } from './store';
import { generateVideo } from './videoGenerator';

const log = (m: string) => {
  document.getElementById('log')!.textContent += '\n' + m;
  console.log(m);
};

// 1.5초짜리 440Hz 사인파 WAV를 만들어 음성 메모 대역 테스트에 쓴다
function makeWavDataUrl(seconds = 1.5, freq = 440): string {
  const rate = 22050;
  const n = Math.floor(rate * seconds);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * freq * i / rate) * 12000, true);
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

const records: MyRecord[] = [
  { id: 'r1', slotTime: '09:10', type: 'text', content: '아침에 커피 두 잔 마셨다', createdAt: 1 } as MyRecord,
  { id: 'r2', slotTime: '13:40', type: 'audio', content: makeWavDataUrl(4.2), caption: '목소리 메모', createdAt: 2 } as MyRecord,
  { id: 'r3', slotTime: '19:22', type: 'text', content: '퇴근하고 떡볶이 먹음', createdAt: 3 } as MyRecord,
];

async function main() {
  try {
    log('step: ensureDiaryFont');
    const { ensureDiaryFont } = await import('./scenes');
    await ensureDiaryFont();
    log('step: font ok, calling generateVideo');
    let lastPct = -1;
    const blob = await generateVideo(records, '7.18 금요일', p => {
      const pct = Math.round(p * 100);
      if (pct !== lastPct && pct % 20 === 0) { log(`progress ${pct}%`); lastPct = pct; }
    }, {
      title: '커피 두 잔의 날',
      closing: '결국 다 먹었다.',
      emojis: '🌙☁️✨',
      mood: '잔잔함',
      captions: ['', '오늘의 목소리', ''],
      diaryEmojis: ['☕', '', '🍢'],
      bgmUrl: `${import.meta.env.BASE_URL}bgm/calm.mp3`,
    });
    (window as unknown as { __blob?: Blob }).__blob = blob;
    log(`DONE blob size=${blob.size} type=${blob.type}`);
  } catch (e) {
    log(`ERROR: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  }
}

main();
