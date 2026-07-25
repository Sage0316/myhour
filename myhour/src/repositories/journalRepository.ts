import {
  appDataSchema,
  archiveEntrySchema,
  type JournalAppData,
  type JournalArchiveEntry,
} from '../domain/model';
import { migrateLegacyAppData, type MigrationReport } from '../migrations/legacy';

const CURRENT_KEY = 'hakku_journal_v2_active';
const CURRENT_STAGING_KEY = 'hakku_journal_v2_staging';
const ARCHIVE_KEY = 'hakku_archive_v2_active';
const ARCHIVE_STAGING_KEY = 'hakku_archive_v2_staging';
const MIGRATION_REPORT_KEY = 'hakku_migration_report_v2';
const LEGACY_CURRENT_KEY = 'myhour_v1';
const LEGACY_ARCHIVE_KEY = 'myhour_archive_v1';

export interface JournalRepository {
  loadCurrent(fallbackDate: string): JournalAppData;
  saveCurrent(data: JournalAppData): void;
  loadArchive(fallbackDate: string): JournalArchiveEntry[];
  saveArchive(entries: JournalArchiveEntry[]): void;
  lastMigrationReport(): MigrationReport | null;
}

function atomicLocalStorageWrite(stagingKey: string, activeKey: string, json: string): void {
  localStorage.setItem(stagingKey, json);
  JSON.parse(localStorage.getItem(stagingKey) ?? '');
  localStorage.setItem(activeKey, json);
  localStorage.removeItem(stagingKey);
}

export class BrowserJournalRepository implements JournalRepository {
  loadCurrent(fallbackDate: string): JournalAppData {
    const raw = localStorage.getItem(CURRENT_KEY) ?? localStorage.getItem(LEGACY_CURRENT_KEY);
    if (!raw) {
      return { schemaVersion: 2, records: [], isWrapped: false, date: fallbackDate };
    }
    try {
      const { data, report } = migrateLegacyAppData(JSON.parse(raw), fallbackDate);
      localStorage.setItem(MIGRATION_REPORT_KEY, JSON.stringify(report));
      if (!localStorage.getItem(CURRENT_KEY)) this.saveCurrent(data);
      return data;
    } catch {
      return { schemaVersion: 2, records: [], isWrapped: false, date: fallbackDate };
    }
  }

  saveCurrent(data: JournalAppData): void {
    const json = JSON.stringify(appDataSchema.parse(data));
    atomicLocalStorageWrite(CURRENT_STAGING_KEY, CURRENT_KEY, json);
  }

  loadArchive(fallbackDate: string): JournalArchiveEntry[] {
    const raw = localStorage.getItem(ARCHIVE_KEY) ?? localStorage.getItem(LEGACY_ARCHIVE_KEY);
    if (!raw) return [];
    try {
      const values = JSON.parse(raw);
      if (!Array.isArray(values)) return [];
      const entries = values.flatMap((value): JournalArchiveEntry[] => {
        if (!value || typeof value !== 'object') return [];
        const source = value as Record<string, unknown>;
        const migrated = migrateLegacyAppData({
          records: source.records,
          isWrapped: source.isWrapped,
          date: source.date ?? fallbackDate,
        }, fallbackDate).data;
        const candidate = {
          id: typeof source.id === 'string' && source.id
            ? source.id
            : `archive_legacy_${migrated.date}_${migrated.records[0]?.id ?? 'empty'}`,
          date: migrated.date,
          records: migrated.records,
          isWrapped: migrated.isWrapped,
          trimmed: source.trimmed === true,
        };
        const parsed = archiveEntrySchema.safeParse(candidate);
        return parsed.success ? [parsed.data] : [];
      });
      if (!localStorage.getItem(ARCHIVE_KEY)) this.saveArchive(entries);
      return entries;
    } catch {
      return [];
    }
  }

  saveArchive(entries: JournalArchiveEntry[]): void {
    const json = JSON.stringify(entries.map(entry => archiveEntrySchema.parse(entry)));
    atomicLocalStorageWrite(ARCHIVE_STAGING_KEY, ARCHIVE_KEY, json);
  }

  lastMigrationReport(): MigrationReport | null {
    try {
      const raw = localStorage.getItem(MIGRATION_REPORT_KEY);
      return raw ? JSON.parse(raw) as MigrationReport : null;
    } catch {
      return null;
    }
  }
}

export const journalRepository = new BrowserJournalRepository();
