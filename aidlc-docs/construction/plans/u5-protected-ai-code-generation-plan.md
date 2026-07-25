# U5 Code Generation Plan

**Status**: Blocked on implemented U1 and explicit code approval; no implementation executed.  
**Story**: US-010  
**Dependencies**: U1 shared contracts and installation identity  
**Application Roots**: `myhour/src`, new `myhour/ai-server`

## Owned Boundaries

AI consent, minimal DTO, local direction fallback, signed client, AI Worker, installation Durable Object, provider adapter, quota, and safe telemetry.

## Implementation Steps

- [ ] Step 1: Create browser installation identity and canonical request-signing adapters.
- [x] Step 2: Create AI consent store, privacy notice version, minimal DTO mapper, and local direction engine.
- [x] Step 3: Replace `llmDirector.ts` direct-provider code with `AIDirectionService` and signed Worker client.
- [x] Step 4: Remove provider API-key input and storage from `SettingsScreen.tsx`; add consent, enrollment, and revoke UI.
- [x] Step 5: Create `myhour/ai-server/` Worker project with shared schemas and safe errors.
- [ ] Step 6: Implement SQLite-backed installation Durable Object for enrollment, nonce, revocation, rate, and quota.
- [ ] Step 7: Implement provider allowlist, secret binding, timeout, output validation, and safe telemetry.
- [ ] Step 8: Add preview and production Wrangler configurations, required-secret declarations, and migrations.
- [ ] Step 9: Add client, Worker, contract, auth, replay, quota, timeout, malformed-output, and fallback tests.
- [x] Step 10: Run typecheck, zero-warning lint, U1/U5 tests, secret scan, and both builds.
- [x] Step 11: Write U5 code and API summaries.
