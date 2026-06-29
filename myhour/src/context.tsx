import { createContext, useContext, useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import {
  type MyRecord, type RecordType, type AppData, type AppSettings,
  loadAppData, saveAppData, loadSettings, saveSettings,
  getCurrentSlot, generateSlots, getSessionDate,
} from './store';

interface AppContextValue {
  records: MyRecord[];
  isWrapped: boolean;
  settings: AppSettings;
  slots: string[];
  currentSlot: string;
  addRecord: (type: RecordType, content: string, caption?: string, videoKey?: string) => void;
  deleteRecord: (id: string) => void;
  setWrapped: (v: boolean) => void;
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

  const slots = useMemo(() => generateSlots(settings), [settings]);
  const currentSlot = useMemo(
    () => getCurrentSlot(slots, settings.interval, settings.startTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots, settings.interval, settings.startTime, tick],
  );

  const addRecord = useCallback((type: RecordType, content: string, caption?: string, videoKey?: string) => {
    const slot = getCurrentSlot(slots, settings.interval, settings.startTime);
    const record: MyRecord = {
      id: Date.now().toString(),
      slotTime: slot,
      type,
      content,
      caption,
      createdAt: Date.now(),
      ...(videoKey ? { videoKey } : {}),
    };
    setAppData(prev => {
      const next = { ...prev, records: [...prev.records, record] };
      saveAppData(next);
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

  const setWrapped = useCallback((v: boolean) => {
    setAppData(prev => {
      const next = { ...prev, isWrapped: v };
      saveAppData(next);
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
      setWrapped,
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
