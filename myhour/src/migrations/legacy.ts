import { appDataSchema, normalizeRecords, type JournalAppData } from '../domain/model';

export interface MigrationReport {
  sourceVersion: number;
  targetVersion: 2;
  convertedRecords: number;
  skippedRecords: number;
  warnings: string[];
}

export function migrateLegacyAppData(value: unknown, fallbackDate: string): {
  data: JournalAppData;
  report: MigrationReport;
} {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const originalRecords = Array.isArray(source.records) ? source.records : [];
  const records = normalizeRecords(originalRecords);
  const candidate = {
    schemaVersion: 2 as const,
    records,
    isWrapped: source.isWrapped === true,
    date: typeof source.date === 'string' ? source.date : fallbackDate,
  };
  const data = appDataSchema.parse(candidate);
  return {
    data,
    report: {
      sourceVersion: typeof source.schemaVersion === 'number' ? source.schemaVersion : 1,
      targetVersion: 2,
      convertedRecords: records.length,
      skippedRecords: Math.max(0, originalRecords.length - records.length),
      warnings: originalRecords.length === records.length
        ? []
        : ['일부 손상된 기록 메타데이터를 건너뛰었습니다. 원본 브라우저 데이터는 삭제하지 않았습니다.'],
    },
  };
}
