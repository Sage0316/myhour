# U2 Domain Entities

| Entity | Purpose |
|---|---|
| MediaDescriptor | Immutable metadata for a stored Blob |
| PendingMedia | Captured content not yet owned by a record or archive |
| MediaLease | Owns temporary streams, timers, URLs, and cleanup |
| CapturePolicy | Versioned kind, MIME, duration, size, and reserve limits |
| StorageEstimate | Usage, quota, projected bytes, and safety decision |
| CleanupReport | Referenced, candidate, deleted, retained, and failed counts |

`MediaDescriptor` is referenced by U1 records and archives; the Blob itself is never embedded in a domain aggregate.
