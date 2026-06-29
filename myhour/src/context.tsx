import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type MyRecord, type RecordType, type AppData, loadAppData, saveAppData, getCurrentSlot } from './store';

interface AppContextValue {
  records: MyRecord[];
  isWrapped: boolean;
  addRecord: (type: RecordType, content: string) => void;
  setWrapped: (v: boolean) => void;
  reset: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppData>(loadAppData);

  function update(partial: Partial<AppData>) {
    setAppData(prev => {
      const next = { ...prev, ...partial };
      saveAppData(next);
      return next;
    });
  }

  const addRecord = useCallback((type: RecordType, content: string) => {
    const slotTime = getCurrentSlot();
    const record: MyRecord = {
      id: Date.now().toString(),
      slotTime,
      type,
      content,
      createdAt: Date.now(),
    };
    setAppData(prev => {
      const next = { ...prev, records: [...prev.records, record] };
      saveAppData(next);
      return next;
    });
  }, []);

  const setWrapped = useCallback((v: boolean) => update({ isWrapped: v }), []);

  const reset = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    const fresh: AppData = { records: [], isWrapped: false, date: today };
    saveAppData(fresh);
    setAppData(fresh);
  }, []);

  return (
    <AppContext.Provider value={{ records: appData.records, isWrapped: appData.isWrapped, addRecord, setWrapped, reset }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
