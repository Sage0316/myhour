# U4 Frontend Components

| Component | State | Responsibilities |
|---|---|---|
| BackupExportDialog | estimating, ready, exporting, done, error | Shows scope, size, passphrase and progress |
| BackupImportDialog | selecting, inspecting, conflict, restoring, done | Prevents commit before validation |
| PassphraseField | hidden, revealed, invalid | Accessible validation without persisting value |
| RestoreConflictSummary | conflicts and policy | Confirms deterministic policy |
| BackupProgress | phase and bytes | Announces progress and cancellation availability |

File input, export, cancel, confirm, and error controls receive stable test IDs and focus management.
