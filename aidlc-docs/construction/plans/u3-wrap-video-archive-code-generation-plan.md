# U3 Code Generation Plan

**Status**: Blocked on implemented U1–U2; no implementation executed.  
**Stories**: US-005, US-006, US-007, US-016  
**Dependencies**: U1 domain and archives, U2 media repository, U5 AI port, U6 Push port  
**Application Root**: `work/myhour-source-verified/myhour`

## Owned Interfaces

WrapUp Service, Video Generation Service, generation job state, video profiles, archive handoff, and accessible operation UI.

## Implementation Steps

- [x] Step 1: Create `myhour/src/services/wrap-up-service.ts` and `video-generation-service.ts` with injected ports.
- [x] Step 2: Refactor `videoGenerator.ts` behind `VideoEnginePort`, mobile-default profile, capability report, progress, and AbortSignal.
- [x] Step 3: Add resource-lease cleanup around streams, tracks, timers, URLs, AudioContext, and pending output.
- [x] Step 4: Modify `WrapUpScreen.tsx` to show only connected controls and accurate persisted record state.
- [x] Step 5: Implement atomic generated-media and ArchiveEntry commit, then return stable `ArchiveId`.
- [x] Step 6: Modify `App.tsx` and `ArchiveScreen.tsx` to route and open by archive ID after restart.
- [x] Step 7: Remove unreachable `HomeWrapped`, unused `setWrapped`, and transient generated URL state.
- [ ] Step 8: Add semantic dialogs, focus management, live progress, labels, visible actions, and stable test IDs.
- [ ] Step 9: Add unit, resource-cleanup, browser generation, archive reload, and accessibility tests.
- [ ] Step 10: Run representative iOS and Android PWA generation smoke checklist.
- [x] Step 11: Run typecheck, zero-warning lint, U1–U3 tests, and production build.
- [x] Step 12: Write U3 code summary under `aidlc-docs/construction/u3-wrap-video-archive/code/`.
