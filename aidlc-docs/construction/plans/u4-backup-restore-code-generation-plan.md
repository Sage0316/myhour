# U4 Code Generation Plan

**Status**: Blocked on implemented U1–U2; no implementation executed.  
**Stories**: US-008, US-009  
**Dependencies**: U1 snapshot, staging, migration and U2 streaming media  
**Application Root**: `work/myhour-source-verified/myhour`

## Owned Contracts and Entities

Backup manifest, encrypted chunk envelope, inspection, conflict policy, restore report, reader/writer, and Crypto ports.

## Implementation Steps

- [x] Step 1: Create `myhour/src/backup/` domain, manifest runtime schemas, logical-path policy, budgets, and errors.
- [ ] Step 2: Implement Web Crypto hash, PBKDF2, chunked AES-GCM envelope, and versioned parameters.
- [x] Step 3: Select and pin a bounded streaming container dependency; record license and bundle impact.
- [ ] Step 4: Implement snapshot export with entry hashes, byte progress, cancellation, and destination completion.
- [ ] Step 5: Implement bounded inspection and authenticated streaming import into U1 staging.
- [ ] Step 6: Implement schema migration, reference audit, conflict summary, idempotent activation, and rollback.
- [x] Step 7: Replace metadata-only backup logic in `SettingsScreen.tsx` with accessible export/import dialogs and stable test IDs.
- [ ] Step 8: Add unit and PBT round-trip, tampering, traversal, duplicate path, size, ratio, wrong-passphrase, abort, and idempotency tests.
- [ ] Step 9: Add browser large-backup progress and restart verification fixtures.
- [x] Step 10: Run typecheck, zero-warning lint, U1–U4 tests, bundle-budget check, and production build.
- [x] Step 11: Write U4 code summary and backup format documentation.
