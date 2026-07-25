# U1 Code Generation Plan

**Status**: Implemented and locally verified.  
**Stories**: US-001, US-004  
**Dependencies**: None  
**Application Root**: `work/myhour-source-verified/myhour`

## Owned Contracts and Entities

Stable journal IDs, sessions, slots, records, archives, schema metadata, runtime schemas, repository ports, active database pointer, and migration report.

## Implementation Steps

- [x] Step 1: Update `myhour/package.json` and lockfile for Vitest, fast-check, and the selected runtime-schema adapter.
- [x] Step 2: Create `myhour/shared-contracts/` with API envelopes, errors, installation headers, and runtime schemas.
- [x] Step 3: Create `myhour/src/domain/` with branded IDs, journal entities, slot and schedule pure functions.
- [x] Step 4: Create `myhour/src/repositories/` ports, versioned IndexedDB adapter, staging store, active pointer, and Unit of Work.
- [x] Step 5: Create `myhour/src/migrations/` with legacy read-only adapter, ordered steps, validation, and reports.
- [x] Step 6: Add deterministic generators and unit/PBT tests for slots, IDs, schema round-trip, migration idempotency, shrinking, and seed replay.
- [x] Step 7: Modify `myhour/src/store.ts` to provide a compatibility facade backed by the new modules.
- [x] Step 8: Modify `myhour/src/context.tsx` composition to consume typed services without changing visible behavior.
- [x] Step 9: Add migration fixtures for the analyzed legacy localStorage and IndexedDB shapes.
- [x] Step 10: Run typecheck, zero-warning lint, U1 tests, migration rollback tests, and production build.
- [x] Step 11: Write U1 code summary under `aidlc-docs/construction/u1-domain-persistence/code/`.

Implementation was explicitly approved by the user with "싹 다 하슈".
