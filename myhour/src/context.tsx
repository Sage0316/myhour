import { useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import {
  type MyRecord, type RecordType, type AppData, type AppSettings,
  loadAppData, saveAppData, loadSettings, saveSettings,
  getCurrentSlot, generateSlots, getSessionDate, deleteVideoFromIDB,
  loadArchive,
} from './store';
import { createStableId } from './domain/model';
import { AppContext, type RecordMedia } from './appContext';
import { cleanupOrphanMedia } from './media/cleanup';
import { hasVideoForDate } from './videoEntitlement';

// 하루가 마감됐는지는 두 곳에서 온다:
// ① 이 하루의 isWrapped 플래그, ② 그 날짜로 이미 영상을 만들었다는 이용권 기록.
// ②가 필요한 이유: 플래그를 false로 되돌리던 예전 버전에서 마감한 하루는 ①이 비어 있다.
// 이용권은 영상이 실제로 만들어진 사실이라 나중에 지워지지 않는다 — 이쪽이 더 단단한 근거다.
function isDayWrapped(data: Pick<AppData, 'isWrapped' | 'date'>): boolean {
  return data.isWrapped || hasVideoForDate(data.date);
}

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

  // 앱을 켜둔 채로 시작 시간을 넘기는 경우. 위 visibilitychange는 포그라운드로 "돌아올 때"만
  // 도니까, 화면을 계속 보고 있으면 어제 기록이 넘어가지 않는다. 1분마다 날짜를 확인해서
  // 마감 없는 어제 기록이 제때 아카이브로 옮겨지게 한다 (옮기는 일은 loadAppData가 한다).
  useEffect(() => {
    const today = getSessionDate(settings.startTime);
    setAppData(prev => (prev.date === today ? prev : loadAppData(settings.startTime)));
  }, [tick, settings.startTime]);

  const slots = useMemo(() => generateSlots(settings), [settings]);
  const currentSlot = useMemo(
    () => getCurrentSlot(slots, settings.interval, settings.startTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots, settings.interval, settings.startTime, tick],
  );

  useEffect(() => {
    void cleanupOrphanMedia(appData.records, loadArchive());
  }, [appData.records]);

  const addRecord = useCallback((type: RecordType, content: string, caption?: string, media?: RecordMedia) => {
    const now = new Date();
    // 원본이 이미 IndexedDB(mediaId)에 있으면 data URL을 localStorage에 또 담지 않는다 —
    // iOS Safari의 5MB 한도에 사진 25~50장이면 걸려서 저장 자체가 실패했다.
    // 영상은 content가 작은 썸네일이고 원본은 별도라 그대로 남긴다. 표시는 useMediaSrc가 처리.
    const keepInline = !media || type === 'video' || !content.startsWith('data:');
    const record: MyRecord = {
      id: createStableId('record'),
      slotId: currentSlot,
      slotTime: currentSlot,
      capturedAt: now.toISOString(),
      type,
      content: keepInline ? content : '',
      caption,
      createdAt: now.getTime(),
      ...(media ? {
        mediaId: media.key,
        mediaType: media.type,
        mediaSize: media.size,
        ...(type === 'video' ? { videoKey: media.key } : {}),
      } : {}),
    };
    setAppData(prev => {
      // 마감한 하루엔 더 담지 않는다. UI에서도 막지만, 마감 직전에 열어둔 화면으로
      // 저장이 들어올 수 있어 여기가 최종 방어선이다.
      if (isDayWrapped(prev)) {
        setTimeout(() => alert('오늘은 이미 마감했어요. 다음 하루가 시작되면 다시 기록할 수 있어요.'), 0);
        if (media) void deleteVideoFromIDB(media.key);
        return prev;
      }
      const next = { ...prev, records: [...prev.records, record] };
      try {
        saveAppData(next);
      } catch {
        if (media) void deleteVideoFromIDB(media.key);
        // localStorage 용량 초과 — 상태를 바꾸지 않고 알린다 (렌더링 크래시 방지)
        setTimeout(() => alert('저장 공간이 부족해서 기록을 저장하지 못했어요.\n아카이브에서 오래된 기록을 정리해 주세요.'), 0);
        return prev;
      }
      return next;
    });
  }, [currentSlot]);

  const deleteRecord = useCallback((id: string) => {
    setAppData(prev => {
      const removed = prev.records.find(record => record.id === id);
      const next = { ...prev, records: prev.records.filter(r => r.id !== id) };
      saveAppData(next);
      const mediaKey = removed?.mediaId ?? removed?.videoKey;
      if (mediaKey) void deleteVideoFromIDB(mediaKey);
      return next;
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  // 하루를 마감한 뒤 호출된다. isWrapped를 남겨야 같은 날짜에 다시 기록해서
  // 아카이브에 8.4가 두 개 생기는 일이 없다. 다음 세션 날짜가 되면 loadAppData가 빈 하루로 되돌린다.
  const reset = useCallback(() => {
    const date = getSessionDate(settings.startTime);
    const fresh: AppData = { schemaVersion: 2, records: [], isWrapped: true, date };
    saveAppData(fresh);
    setAppData(fresh);
  }, [settings.startTime]);

  return (
    <AppContext.Provider value={{
      records: appData.records,
      isWrapped: isDayWrapped(appData),
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
