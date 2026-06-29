import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import {
  type MyRecord, type RecordType, type AppData, type AppSettings,
  loadAppData, saveAppData, loadSettings, saveSettings,
  getCurrentSlot, generateSlots,
} from './store';

interface AppContextValue {
  records: MyRecord[];
  isWrapped: boolean;
  settings: AppSettings;
  slots: string[];
  currentSlot: string;
  addRecord: (type: RecordType, content: string, caption?: string) => void;
  deleteRecord: (id: string) => void;
  setWrapped: (v: boolean) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  reset: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppData>(loadAppData);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const slots = useMemo(() => generateSlots(settings), [settings]);
  const currentSlot = useMemo(() => getCurrentSlot(slots, settings.interval), [slots, settings.interval]);

  const addRecord = useCallback((type: RecordType, content: string, caption?: string) => {
    const slot = getCurrentSlot(slots, settings.interval);
    const record: MyRecord = {
      id: Date.now().toString(),
      slotTime: slot,
      type,
      content,
      caption,
      createdAt: Date.now(),
    };
    setAppData(prev => {
      const next = { ...prev, records: [...prev.records, record] };
      saveAppData(next);
      return next;
    });
  }, [slots, settings.interval]);

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
    const today = new Date().toISOString().slice(0, 10);
    const fresh: AppData = { records: [], isWrapped: false, date: today };
    saveAppData(fresh);
    setAppData(fresh);
  }, []);

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
