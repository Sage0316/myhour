import { createContext, useContext } from 'react';
import type { AppSettings, MyRecord, RecordType } from './store';

export interface RecordMedia {
  key: string;
  type: string;
  size: number;
}

export interface AppContextValue {
  records: MyRecord[];
  /** 오늘을 이미 마감했는가. true면 이 날짜로는 더 기록할 수 없다. */
  isWrapped: boolean;
  settings: AppSettings;
  slots: string[];
  currentSlot: string;
  addRecord: (type: RecordType, content: string, caption?: string, media?: RecordMedia) => void;
  deleteRecord: (id: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  reset: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
