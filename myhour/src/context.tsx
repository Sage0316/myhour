import { createContext, useContext, useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import {
  type MyRecord, type RecordType, type AppData, type AppSettings,
  loadAppData, saveAppData, loadSettings, saveSettings,
  getCurrentSlot, generateSlots, getSessionDate,
  mediaRecordKey, dataUrlToBlob, saveVideoToIDB, loadVideoBlobFromIDB,
} from './store';
import { resyncPush } from './push';

interface AppContextValue {
  records: MyRecord[];
  isWrapped: boolean;
  settings: AppSettings;
  slots: string[];
  currentSlot: string;
  addRecord: (type: RecordType, content: string, caption?: string, videoKey?: string) => Promise<void>;
  deleteRecord: (id: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  reset: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [appData, setAppData] = useState<AppData>(() => loadAppData(loadSettings().startTime));

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // iOS PWA는 앱을 메모리에 살려둔 채 다음날 다시 열 수 있다.
  // 그때 어제의 기록/마감 상태가 그대로 보이지 않도록, 포그라운드 복귀 시 날짜를 재확인한다.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const fresh = loadAppData(settings.startTime);
      setAppData(prev => (prev.date !== fresh.date ? fresh : prev));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [settings.startTime]);

  const slots = useMemo(() => generateSlots(settings), [settings]);
  const currentSlot = useMemo(
    () => getCurrentSlot(slots, settings.interval, settings.startTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots, settings.interval, settings.startTime, tick],
  );

  const addRecord = useCallback(async (type: RecordType, content: string, caption?: string, videoKey?: string) => {
    const now = new Date();
    const slotTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const id = Date.now().toString();

    // 사진·짤·음성 원본은 localStorage(5MB 한도) 대신 IndexedDB에 넣고 키만 들고 있는다.
    // IDB 쓰기가 실패하면 예전처럼 content에 그대로 담아 최소한 기록을 잃지 않게 한다.
    let storedContent = content;
    let mediaKey: string | undefined;
    if (type !== 'text' && content.startsWith('data:')) {
      const key = mediaRecordKey(id);
      try {
        await saveVideoToIDB(key, dataUrlToBlob(content));
        const written = await loadVideoBlobFromIDB(key);
        if (written) { storedContent = ''; mediaKey = key; }
      } catch { /* content에 data URL을 그대로 유지 */ }
    }

    const record: MyRecord = {
      id,
      slotTime,
      type,
      content: storedContent,
      caption,
      createdAt: Date.now(),
      ...(videoKey ? { videoKey } : {}),
      ...(mediaKey ? { mediaKey } : {}),
    };
    setAppData(prev => {
      const next = { ...prev, records: [...prev.records, record] };
      try {
        saveAppData(next);
      } catch {
        // localStorage 용량 초과 — 상태를 바꾸지 않고 알린다 (렌더링 크래시 방지)
        setTimeout(() => alert('저장 공간이 부족해서 기록을 저장하지 못했어요.\n아카이브에서 오래된 기록을 정리해 주세요.'), 0);
        return prev;
      }
      return next;
    });
  }, [slots, settings.interval, settings.startTime]);

  const deleteRecord = useCallback((id: string) => {
    setAppData(prev => {
      const next = { ...prev, records: prev.records.filter(r => r.id !== id) };
      saveAppData(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      // 알림 스케줄에 영향 있는 항목이 바뀌면 서버 구독 정보도 같이 갱신한다
      // (예전엔 사용자가 알림을 직접 껐다 켜야 반영됐다)
      if (
        updates.interval !== undefined || updates.startTime !== undefined ||
        updates.endTime !== undefined || updates.endMode !== undefined
      ) {
        void resyncPush(next);
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const date = getSessionDate(settings.startTime);
    const fresh: AppData = { records: [], isWrapped: false, date };
    saveAppData(fresh);
    setAppData(fresh);
  }, [settings.startTime]);

  return (
    <AppContext.Provider value={{
      records: appData.records,
      isWrapped: appData.isWrapped,
      settings,
      slots,
      currentSlot,
      addRecord,
      deleteRecord,
      updateSettings,
      reset,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
