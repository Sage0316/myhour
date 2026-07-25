# U4 Business Logic Model

## Export

Freeze a logical snapshot, enumerate allowed entries, stream each entry while calculating bytes and SHA-256, finalize a versioned manifest, then write a passphrase-derived encrypted envelope. Success requires destination closure.

## Restore

Inspect bounded header, derive the key, authenticate and decrypt chunks, validate manifest and logical paths, stream entries into staging, verify every hash and reference, apply supported migrations, show a conflict summary, then atomically activate staging.

## Conflict Policy

The default is `replace-by-id` within the imported snapshot. Re-importing the same backup is idempotent. The active database is never mutated during inspection or staging.
