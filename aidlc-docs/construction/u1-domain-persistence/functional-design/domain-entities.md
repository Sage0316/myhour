# U1 Domain Entities

| Entity | Identity | Key Relationships |
|---|---|---|
| JournalSession | `sessionId` | Owns records and session-local slot policy |
| JournalRecord | `recordId` | Belongs to one session and one slot; may reference one media item |
| ArchiveEntry | `archiveId` | References a closed session, records, and generated media |
| UserSettings | Singleton version | Supplies time zone, interval, notification policy |
| SchemaMetadata | Schema version | Identifies active database and migration history |
| MigrationReport | Migration run ID | Counts converted, skipped, missing, and rejected entries |

Value objects are `RecordId`, `MediaId`, `ArchiveId`, `SlotId`, `SchemaVersion`, `CapturedAt`, and `TimeZoneId`. Domain entities contain no React, IndexedDB, or Cloudflare types.
