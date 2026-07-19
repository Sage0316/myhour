export type RecordType = 'text' | 'video' | 'photo' | 'audio';

export interface MyRecord {
  id: string;
  slotTime: string;
  type: RecordType;
  content: string;
  caption?: string;
  createdAt: number;
  videoKey?: string; // IndexedDB key for the actual video file
}

// ─── IndexedDB video storage (localStorage can't handle large video files) ──

function openVideoDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open('myhour_videos_v1', 1);
    req.onupgradeneeded = e => { (e.target as IDBOpenDBRequest).result.createObjectStore('videos'); };
    req.onsuccess = e => res((e.target as IDBOpenDBRequest).result);
    req.onerror = () => rej(req.error);
  });
}

export async function saveVideoToIDB(key: string, file: File | Blob): Promise<void> {
  try {
    const db = await openVideoDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('videos', 'readwrite');
      tx.objectStore('videos').put(file, key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* ignore */ }
}

export async function deleteVideoFromIDB(key: string): Promise<void> {
  try {
    const db = await openVideoDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('videos', 'readwrite');
      tx.objectStore('videos').delete(key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* ignore */ }
}

export async function loadVideoFromIDB(key: string): Promise<string | null> {
  try {
    const db = await openVideoDB();
    const blob: Blob | undefined = await new Promise((res, rej) => {
      const tx = db.transaction('videos', 'readonly');
      const req = tx.objectStore('videos').get(key);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface AppSettings {
  startTime: string;                         // "09:00"
  endMode: 'open' | 'fixed';
  endTime: string;                           // "21:00" (only used when endMode === 'fixed')
  interval: 30 | 60 | 120;                  // minutes
  notifyTiming: 'before' | 'exact' | 'both';
  captureMode: 'choose' | 'fixed';
  defaultType: RecordType;
  outputRatio: '9:16' | '1:1';
  bgMusic: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  startTime: '09:00',
  endMode: 'open',
  endTime: '21:00',
  interval: 120,
  notifyTiming: 'before',
  captureMode: 'choose',
  defaultType: 'text',
  outputRatio: '9:16',
  bgMusic: '잔잔한 피아노',
};

const SETTINGS_KEY = 'myhour_settings_v1';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ─── Slot utilities ───────────────────────────────────────────────────────────

function slotToMinutes(slot: string): number {
  const [h, m] = slot.split(':').map(Number);
  return h * 60 + m;
}

// Convert slot time to "session minutes" — slots past midnight get +24h offset
function toSessionM(slot: string, startM: number): number {
  const m = slotToMinutes(slot);
  return m < startM ? m + 24 * 60 : m;
}

// Current time in session minutes (past-midnight = add 24h)
function nowSessionM(startM: number): number {
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  return nowM < startM ? nowM + 24 * 60 : nowM;
}

export function generateSlots(settings: AppSettings): string[] {
  const startM = slotToMinutes(settings.startTime);

  // open mode: last slot is just before next session start (up to +24h)
  // e.g. start=09:00, interval=120 → last slot at 07:00 next day
  const endM = settings.endMode === 'fixed'
    ? slotToMinutes(settings.endTime)
    : startM + 24 * 60 - settings.interval;

  const slots: string[] = [];
  let cur = startM;
  while (cur <= endM && slots.length < 48) {
    const wallM = cur % (24 * 60);
    slots.push(`${String(Math.floor(wallM / 60)).padStart(2, '0')}:${String(wallM % 60).padStart(2, '0')}`);
    cur += settings.interval;
  }

  // Fixed mode: always include endTime as the last slot.
  // If the interval grid skips it (e.g. 09:00 + 2h intervals → 22:00 is unreachable),
  // append it explicitly so the user can always record at their chosen end time.
  if (settings.endMode === 'fixed' && slots.length > 0) {
    const lastM = slotToMinutes(slots[slots.length - 1]);
    if (lastM !== endM && endM > lastM) {
      slots.push(settings.endTime);
    }
  }

  return slots;
}

export function getCurrentSlot(slots: string[], interval: number, startTime?: string): string {
  const startM = startTime ? slotToMinutes(startTime) : 0;
  const effNow = nowSessionM(startM);

  for (let i = 0; i < slots.length; i++) {
    const sM = toSessionM(slots[i], startM);
    const eM = i < slots.length - 1 ? toSessionM(slots[i + 1], startM) : sM + interval;
    if (effNow >= sM && effNow < eM) return slots[i];
  }
  if (slots.length === 0) return startTime ?? '09:00';
  if (effNow < toSessionM(slots[0], startM)) return slots[0];
  return slots[slots.length - 1];
}

export function getNextSlot(slots: string[], startTime?: string): string | null {
  const startM = startTime ? slotToMinutes(startTime) : 0;
  const effNow = nowSessionM(startM);
  return slots.find(s => toSessionM(s, startM) > effNow) ?? null;
}

export function minutesLeftInSlot(slot: string, slots: string[], interval: number, startTime?: string): number {
  const startM = startTime ? slotToMinutes(startTime) : 0;
  const effNow = nowSessionM(startM);
  const idx = slots.indexOf(slot);
  const endM = idx >= 0 && idx < slots.length - 1
    ? toSessionM(slots[idx + 1], startM)
    : toSessionM(slot, startM) + interval;
  return Math.max(0, endM - effNow);
}

export function minutesUntilSlot(slot: string, startTime?: string): number {
  const startM = startTime ? slotToMinutes(startTime) : 0;
  const effNow = nowSessionM(startM);
  return Math.max(0, toSessionM(slot, startM) - effNow);
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

// ─── Date helpers ─────────────────────────────────────────────────────────────

// Session date: if current time is before startTime, we're still in yesterday's session
export function getSessionDate(startTime: string): string {
  const now = new Date();
  const startM = slotToMinutes(startTime);
  const nowM = now.getHours() * 60 + now.getMinutes();
  const d = nowM < startM
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    : now;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDateStrings(sessionDate?: string) {
  const d = sessionDate ? new Date(sessionDate + 'T12:00:00') : new Date();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const KO = ['일', '월', '화', '수', '목', '금', '토'];
  const EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const wd = d.getDay();
  return {
    dateDay: `${month}월 ${day}일`,
    dateWeekday: `${KO[wd]}요일`,
    dateShort: `${month}.${day}`,
    weekdayEn: EN[wd],
  };
}

// ─── Record metadata ──────────────────────────────────────────────────────────

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

// ─── Mood / title ─────────────────────────────────────────────────────────────

export const MOOD_LIST = [
  { mood: '잔잔함', color: '#CDEBDD', dot: '#3FA37B' },
  { mood: '뿌듯함', color: '#E7F0BE', dot: '#7FA02B' },
  { mood: '감성',   color: '#E4DBF5', dot: '#7C5CC4' },
  { mood: '웃김',   color: '#F6D7C6', dot: '#D9743F' },
  { mood: '정신없음', color: '#FAD9E3', dot: '#C4567A' },
] as const;

export type MoodItem = (typeof MOOD_LIST)[number];

export function guessMood(records: MyRecord[]): MoodItem {
  if (records.length >= 5) return MOOD_LIST[1];
  if (records.length === 0) return MOOD_LIST[0];
  return MOOD_LIST[(records.length - 1) % MOOD_LIST.length];
}

export function generateTitle(records: MyRecord[]): string {
  const texts = records.filter(r => r.type === 'text' && !r.content.startsWith('data:'));
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

// ─── App data (records + wrap state) ────────────────────────────────────────

export interface AppData {
  records: MyRecord[];
  isWrapped: boolean;
  date: string;
}

const DATA_KEY = 'myhour_v1';

export function loadAppData(startTime: string = DEFAULT_SETTINGS.startTime): AppData {
  const date = getSessionDate(startTime);
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return { records: [], isWrapped: false, date };
    const data: AppData = JSON.parse(raw);
    if (data.date !== date) return { records: [], isWrapped: false, date };
    return data;
  } catch {
    return { records: [], isWrapped: false, date };
  }
}

export function saveAppData(data: AppData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

// ─── Archive ─────────────────────────────────────────────────────────────────

export interface ArchiveEntry {
  id?: string;            // 항목 고유 ID — 같은 날짜에 여러 번 마감해도 누적된다 (구버전 항목엔 없음)
  date: string;
  records: MyRecord[];
  isWrapped: boolean;
  trimmed?: boolean;      // 원본 미디어가 정리된 항목 (영상 완성 or 3일 경과)
}

// ─── 원본 정리 정책: 완성된 영상이 상품, 원본은 재료 ─────────────────────────
// 영상이 만들어졌거나 3일이 지난 항목은 무거운 원본(사진/음성/클립)을 비우고
// 글 텍스트·시간·캡션만 남긴다.

function stripRecordMedia(r: MyRecord): MyRecord {
  if (r.type === 'text') return r;
  const { videoKey: _vk, ...rest } = r;
  void _vk;
  return { ...rest, content: '' };
}

export function trimRecords(records: MyRecord[]): MyRecord[] {
  return records.map(stripRecordMedia);
}

export function deleteRecordMedia(records: MyRecord[]) {
  for (const r of records) if (r.videoKey) void deleteVideoFromIDB(r.videoKey);
}

const TRIM_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

export function sweepArchive() {
  const entries = loadArchive();
  let changed = false;
  const now = Date.now();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.trimmed) continue;
    const created = e.id && /^\d+$/.test(e.id) ? Number(e.id) : new Date(`${e.date}T00:00:00`).getTime();
    if (e.isWrapped || now - created > TRIM_AFTER_MS) {
      deleteRecordMedia(e.records);
      entries[i] = { ...e, records: trimRecords(e.records), trimmed: true };
      changed = true;
    }
  }
  if (changed) saveArchive(entries);
}

// 아카이브에서 뒤늦게 영상을 만들었을 때: 항목을 완성 상태로 바꾸고 원본 정리
export function markArchiveGenerated(entry: ArchiveEntry) {
  const entries = loadArchive();
  const idx = entries.findIndex(e => (entry.id ? e.id === entry.id : e.id === undefined && e.date === entry.date));
  if (idx < 0) return;
  deleteRecordMedia(entries[idx].records);
  entries[idx] = { ...entries[idx], isWrapped: true, trimmed: true, records: trimRecords(entries[idx].records) };
  saveArchive(entries);
}

// 영상 IDB 키: 신규 항목은 고유 ID, 구버전 항목은 날짜 키를 그대로 쓴다
export function archiveVideoKey(entry: Pick<ArchiveEntry, 'id' | 'date'>): string {
  return `wrapped_${entry.id ?? entry.date}`;
}

const ARCHIVE_KEY = 'myhour_archive_v1';

export function loadArchive(): ArchiveEntry[] {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveArchive(entries: ArchiveEntry[]) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries));
}

export function addToArchive(entry: ArchiveEntry) {
  const entries = loadArchive();
  entries.unshift(entry);
  saveArchive(entries);
}

export function removeFromArchive(entry: ArchiveEntry) {
  const entries = loadArchive().filter(e =>
    entry.id ? e.id !== entry.id : !(e.id === undefined && e.date === entry.date),
  );
  saveArchive(entries);
}

// ─── Settings display labels ──────────────────────────────────────────────────

export function intervalLabel(v: number) {
  return v === 30 ? '30분' : v === 60 ? '1시간' : '2시간';
}

export function notifyLabel(v: AppSettings['notifyTiming']) {
  return v === 'before' ? '1분 전' : v === 'exact' ? '기록 시각' : '둘 다';
}

export function captureModeLabel(v: AppSettings['captureMode']) {
  return v === 'choose' ? '매번 선택' : '하나로 고정';
}
