import type { MyRecord } from './store';

const API_KEY_STORAGE = 'myhour_anthropic_key';

export function loadApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function saveApiKey(key: string) {
  if (key) localStorage.setItem(API_KEY_STORAGE, key);
  else localStorage.removeItem(API_KEY_STORAGE);
}

export type BgmTrack = 'calm' | 'bright' | 'emotional' | 'piano' | 'ukulele' | 'nostalgic';

export const BGM_TRACKS: Record<BgmTrack, string> = {
  calm: '잔잔한 lo-fi',
  bright: '경쾌한 멜로디',
  emotional: '감성적인 빌드업',
  piano: '잔잔한 피아노',
  ukulele: '경쾌한 우쿨렐레',
  nostalgic: '따뜻한 노스탤지어',
};

// 무드별 곡 풀 — AI는 무드만 고르고, 그 안에서 매번 랜덤으로 한 곡이 뽑힌다 (전곡 CC0)
const BGM_FILES: Record<BgmTrack, string[]> = {
  calm: ['calm.mp3', 'slice-of-life.mp3', 'lagoon.mp3'],
  bright: ['bright.mp3', 'just-like-that.mp3', 'city-sunshine.mp3'],
  emotional: ['emotional.mp3', 'shining-stars.mp3', 'magic-garden.mp3'],
  piano: ['piano.mp3', 'landras-dream.mp3', 'piano-magic.mp3'],
  ukulele: ['ukulele.mp3', 'ukulele-song.mp3', 'funshine.mp3'],
  nostalgic: ['nostalgic.mp3', 'travelers-notebook.mp3', 'tournesol.mp3'],
};

export function pickBgmFile(track: BgmTrack): string {
  const files = BGM_FILES[track] ?? BGM_FILES.calm;
  return files[Math.floor(Math.random() * files.length)];
}

export interface DirectorOutput {
  title: string;
  closing: string;
  mood: string;
  emojis: string;
  bgMusic: string;
  bgmTrack: BgmTrack;
  captions: string[];
  diaryEmojis: string[];
}

function buildPrompt(records: MyRecord[], dateStr: string): string {
  const lines = records.map((r, i) => {
    const parts = [`[${i + 1}] ${r.slotTime} · ${r.type}`];
    if (r.type === 'text') parts.push(`내용: ${r.content}`);
    if (r.caption) parts.push(`캡션: ${r.caption}`);
    return parts.join(' / ');
  }).join('\n');

  return `당신은 일상 브이로그 영상의 편집자입니다. 오늘(${dateStr})의 기록으로 짧은 회고 영상을 편집합니다.

아래 기록은 시간순입니다 (번호가 빠를수록 먼저 일어난 일):

${lines}

서사 규칙 (중요):
- 하루의 흐름은 기록 순서 그대로다. 제목·closing·mood를 쓸 때 앞뒤 순서나 인과를 절대 뒤집지 말 것. (예: "몸이 안 좋았다 → 영화를 봤다" 순서라면, 영화를 본 뒤 몸이 안 좋아진 것처럼 쓰면 안 됨)
- closing은 하루의 마지막 기록 이후의 상태에서 돌아보는 문장일 것.
- captions와 diaryEmojis는 반드시 기록 번호 순서와 1:1로 대응시킬 것.

문체 규칙 (중요):
- 담백하고 건조하게. 일기 쓰듯이.
- 오글거리는 표현, 감탄사, 클리셰 금지: "소소한 행복", "충분했다", "빛나는 하루", "잘 살았다", "마무리합니다" 같은 말 절대 쓰지 말 것.
- 기록에 실제로 나온 단어와 장면을 재료로 쓸 것. 일반론 금지.
- 제목은 명사구로 짧게 끊어도 좋음 (예: "커피 두 잔의 날", "결국 또 떡볶이").
- 자막은 툭 던지는 반말 (예: "오늘의 첫 커피", "이 맛에 퇴근하지").

아래 JSON만 응답하세요 (설명 없이):
{
  "title": "오늘의 제목 (12자 이내, 명사구 선호)",
  "closing": "기록 속 한 장면을 집어서 담담하게 끝내는 한 문장 (35자 이내)",
  "mood": "오늘의 분위기 한 줄 (20자 이내)",
  "emojis": "오늘 무드에 맞는 이모지 3-4개",
  "bgMusic": "어울리는 배경음악 분위기 (예: 잔잔한 피아노, lo-fi 힙합)",
  "bgmTrack": "실제 사용할 BGM. 반드시 다음 중 하나: calm(잔잔한 lo-fi) | bright(경쾌한 멜로디) | emotional(감성적인 빌드업) | piano(잔잔한 피아노) | ukulele(경쾌한 휘파람 우쿨렐레) | nostalgic(따뜻한 노스탤지어 피아노)",
  "captions": ["기록 순서대로 각 기록에 달 자막 ${records.length}개, 각 15자 이내. 글(text) 기록은 본문이 이미 화면에 크게 보이므로 본문을 반복하는 자막 금지 — 덧붙일 말이 없으면 빈 문자열 \\"\\""],
  "diaryEmojis": ["기록 순서대로 ${records.length}개. 각 글(text) 기록의 내용을 그림처럼 나타내는 이모지 딱 1개 (예: '떡볶이 먹음'→🍢, '야근함'→💼, '비 왔다'→🌧️). text가 아닌 기록은 빈 문자열 \\"\\""]
}`;
}

export async function analyzeDay(
  records: MyRecord[],
  dateStr: string,
  apiKey: string,
): Promise<DirectorOutput> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 700,
      // JSON 생성이라 thinking은 명시적으로 꺼서 응답 파싱과 토큰 낭비를 방지
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: buildPrompt(records, dateStr) }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `API 오류 (${res.status})`);
  }

  const data = await res.json() as { content?: Array<{ type?: string; text?: string }> };
  // thinking 블록이 섞여도 안전하게 text 블록만 찾는다
  const text = data.content?.find(b => b.type === 'text')?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI 응답을 파싱할 수 없어요');
  const out = JSON.parse(match[0]) as DirectorOutput;
  if (!(out.bgmTrack in BGM_TRACKS)) out.bgmTrack = 'calm';
  out.captions = Array.isArray(out.captions)
    ? out.captions.map(c => String(c).trim().slice(0, 20))
    : [];
  out.diaryEmojis = Array.isArray(out.diaryEmojis)
    ? out.diaryEmojis.map(e => String(e).trim())
    : [];
  return out;
}
