# U6 Code Generation Plan

**Status**: Blocked on implemented U1 and explicit code approval; no implementation executed.  
**Stories**: US-011, US-012  
**Dependencies**: U1 schedules, contracts, and installation identity  
**Application Roots**: `myhour/src`, `myhour/push-server`, `myhour/public/sw.js`

## Owned Boundaries

Push preferences, schedule version, signed ownership, subscription, per-install Durable Object alarm, delivery idempotency, provider allowlist, and safe telemetry.

## Implementation Steps

- [x] Step 1: Move schedule calculation into U1 pure domain functions and add time-zone PBT.
- [x] Step 2: Refactor `push.ts` into Push Service, signed Worker client, and explicit synchronization states.
- [ ] Step 3: Modify `SettingsScreen.tsx` with capability, permission, preferences, test, remote-delete, and stable test IDs.
- [ ] Step 4: Modularize `push-server/worker.js` into TypeScript handlers using shared runtime schemas.
- [ ] Step 5: Implement SQLite-backed per-install Durable Object for ownership, subscription, schedule, nonce, and delivery keys.
- [ ] Step 6: Replace KV/Cron delivery with next-delivery alarms and transactional reserve-send-complete handling.
- [ ] Step 7: Implement endpoint host allowlist, body and rate limits, safe errors, expiration cleanup, and telemetry.
- [x] Step 8: Update `sw.js` notification display and click navigation with versioned safe payloads.
- [ ] Step 9: Add legacy KV read-only migration and preview/production Wrangler namespaces and secrets.
- [ ] Step 10: Add schedule PBT, Worker auth, replay, idempotency, alarm retry, host, encryption round-trip, and service-worker tests.
- [x] Step 11: Run typecheck, zero-warning lint, U1/U6 tests, secret scan, and both builds.
- [x] Step 12: Write U6 code and API summaries.
