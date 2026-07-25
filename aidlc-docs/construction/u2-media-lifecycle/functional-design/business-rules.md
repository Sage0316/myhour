# U2 Business Rules

| Rule | Definition |
|---|---|
| U2-BR-01 | All photos, videos, audio, and generated outputs are Blob records in IndexedDB. |
| U2-BR-02 | A media descriptor records ID, MIME, bytes, hash, purpose, and creation time. |
| U2-BR-03 | Capture starts only after capability, policy, and storage preflight passes. |
| U2-BR-04 | Success is returned only after Blob and referencing metadata commit. |
| U2-BR-05 | Lease cleanup is mandatory and idempotent on every terminal path. |
| U2-BR-06 | Orphan deletion requires a current reference graph and excludes legacy preservation. |
| U2-BR-07 | Quota failure preserves existing media and provides a recoverable user action. |
| U2-BR-08 | MIME is verified from allowed capture output, not trusted solely from filenames. |
