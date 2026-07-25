# U2 Code Generation Plan

**Status**: Blocked on implemented U1; no implementation executed.  
**Stories**: US-002, US-003  
**Dependencies**: U1 repositories, domain, Unit of Work, migration hooks  
**Application Root**: `work/myhour-source-verified/myhour`

## Owned Interfaces

Media Repository adapter, capture policy, media lease, storage preflight, cleanup report, and Record Service media commit path.

## Implementation Steps

- [x] Step 1: Create `myhour/src/media/` ports and browser adapters for capture, leases, Blob hashing, and capability checks.
- [x] Step 2: Implement Media Repository object stores and descriptors through U1 transactions.
- [x] Step 3: Implement storage estimate, configurable capture limits, and safety reserve.
- [x] Step 4: Implement pending-media commit, compensation, reference scan, and idempotent cleanup.
- [ ] Step 5: Modify `RecordScreen.tsx` to use CaptureLauncher, leases, progress, visible delete, and stable test IDs.
- [x] Step 6: Modify `TodayScreen.tsx` and related record views to consume stable record and media IDs.
- [x] Step 7: Add legacy photo, audio, and video migration adapters without deleting legacy inputs.
- [ ] Step 8: Add unit and IndexedDB integration tests for success, quota, abort, retake, delete, and orphan cleanup.
- [ ] Step 9: Add browser smoke fixtures for supported capture MIME and restart playback.
- [x] Step 10: Run typecheck, zero-warning lint, U1–U2 tests, leak checks, and production build.
- [x] Step 11: Write U2 code summary under `aidlc-docs/construction/u2-media-lifecycle/code/`.
