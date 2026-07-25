# U4 Business Rules

| Rule | Definition |
|---|---|
| U4-BR-01 | Backup includes settings, active records, archives, director metadata, source and generated media. |
| U4-BR-02 | Every entry has logical path, content type, byte count, and SHA-256. |
| U4-BR-03 | Passphrase and derived keys are never persisted or logged. |
| U4-BR-04 | Absolute paths, traversal, duplicate paths, unsupported versions, and limit violations are rejected. |
| U4-BR-05 | Restore writes only to staging until complete validation. |
| U4-BR-06 | Any failure discards staging and retains the active database. |
| U4-BR-07 | Re-import of the same backup creates no duplicate IDs. |
| U4-BR-08 | Progress and cancellation are available before final activation. |
