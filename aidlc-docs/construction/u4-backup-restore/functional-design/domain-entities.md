# U4 Domain Entities

| Entity | Purpose |
|---|---|
| BackupManifest | Format, schema, build, time, and entry metadata |
| BackupEntry | Logical path, content type, bytes, hash |
| EncryptedEnvelope | Version, KDF, salt, chunk and AEAD metadata |
| BackupInspection | Scope, size, compatibility, warnings |
| RestoreConflict | Stable ID, existing/imported summary, selected policy |
| RestoreReport | Imported, replaced, skipped, missing, rejected counts |

Container paths are logical identifiers and never filesystem paths supplied directly to extraction APIs.
