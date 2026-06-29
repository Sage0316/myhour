export type RecordType = 'text' | 'video' | 'photo' | 'audio';

export interface MyRecord {
  id: string;
  slotTime: string;
  type: RecordType;
  content: string;
  createdAt: number;
}

export const SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];

function slotToMinutes(slot: string): number {
  const [h, m] = slot.split(':').map(Number);
  return h * 60 + m;
}

export function getCurrentSlot(): string {
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < SLOTS.length; i++) {
    const start = slotToMinutes(SLOTS[i]);
    const end = i < SLOTS.length - 1 ? slotToMinutes(SLOTS[i + 1]) : start + 120;
    if (nowM >= start && nowM < end) return SLOTS[i];
  }
  if (nowM < slotToMinutes(SLOTS[0])) return SLOTS[0];
  return SLOTS[SLOTS.length - 1];
}

export function getNextSlot(): string | null {
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  return SLOTS.find(s => slotToMinutes(s) > nowM) ?? null;
}

export function minutesLeftInSlot(slot: string): number {
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const idx = SLOTS.indexOf(slot);
  const end = idx < SLOTS.length - 1 ? slotToMinutes(SLOTS[idx + 1]) : slotToMinutes(slot) + 120;
  return Math.max(0, end - nowM);
}

export function minutesUntilSlot(slot: string): number {
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  return Math.max(0, slotToMinutes(slot) - nowM);
}

export function formatTime(minutes: number): string {
  if (minutes <= 0) return '지금';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  return `${minutes}분`;
}

export function getDateStrings() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const KO = ['일', '월', '화', '수', '목', '금', '토'];
  const EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const wd = now.getDay();
  return {
    dateDay: `${month}월 ${day}일`,
    dateWeekday: `${KO[wd]}요일`,
    dateShort: `${month}.${day}`,
    weekdayEn: EN[wd],
  };
}

export const TYPE_COLORS: Record<RecordType, string> = {
  text: '#F4ECD9',
  video: '#F4C9B8',
  photo: '#CDEBDD',
  audio: '#E4DBF5',
};

export const TYPE_LABELS: Record<RecordType, string> = {
  text: '글',
  video: '영상',
  photo: '사진',
  audio: '음성',
};

export const MOOD_LIST = [
  { mood: '잔잔함', color: '#CDEBDD', dot: '#3FA37B' },
  { mood: '뿌듯함', color: '#E7F0BE', dot: '#7FA02B' },
  { mood: '감성', color: '#E4DBF5', dot: '#7C5CC4' },
  { mood: '웃김', color: '#F6D7C6', dot: '#D9743F' },
  { mood: '정신없음', color: '#FAD9E3', dot: '#C4567A' },
] as const;

export type MoodItem = (typeof MOOD_LIST)[number];

export function guessMood(records: MyRecord[]): MoodItem {
  if (records.length >= 5) return MOOD_LIST[1];
  if (records.length === 0) return MOOD_LIST[0];
  return MOOD_LIST[(records.length - 1) % MOOD_LIST.length];
}

export function generateTitle(records: MyRecord[]): string {
  const texts = records.filter(r => r.type === 'text');
  if (texts.length === 0) return `오늘의 ${records.length}개 순간`;
  const first = texts[0].content.trim();
  return first.length <= 20 ? first : first.slice(0, 18) + '…';
}

const CLOSING = [
  "별일 없었지만, 이런 하루가 제일 오래 남더라.",
  "오늘도 잘 살았다.",
  "이 순간들이 모여 나를 만든다.",
  "내일도 이렇게 살아가면 된다.",
  "오늘 하루, 충분했다.",
];

export function generateClosing(records: MyRecord[]): string {
  return CLOSING[records.length % CLOSING.length];
}

export interface AppData {
  records: MyRecord[];
  isWrapped: boolean;
  date: string;
}

const KEY = 'myhour_v1';

export function loadAppData(): AppData {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { records: [], isWrapped: false, date: today };
    const data: AppData = JSON.parse(raw);
    if (data.date !== today) return { records: [], isWrapped: false, date: today };
    return data;
  } catch {
    return { records: [], isWrapped: false, date: today };
  }
}

export function saveAppData(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
