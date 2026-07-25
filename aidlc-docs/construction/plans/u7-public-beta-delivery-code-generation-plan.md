# U7 Code Generation Plan

**Status**: Blocked on implemented U1–U6 and explicit code approval; no implementation executed.  
**Stories**: US-013, US-014, US-015, US-017  
**Dependencies**: Build, schema, tests, deployables, and evidence from U1–U6  
**Repository Root**: `work/myhour-source-verified`

## Owned Artifacts

CI/CD, static hosting security, environment isolation, release evidence, logs and alerts, rollback, privacy, support, license, and accessibility release gates.

## Implementation Steps

- [ ] Step 1: Add repository-root npm workspace and scripts that build/test the PWA, shared contracts, AI Worker, and Push Worker.
- [ ] Step 2: Add protected CI for exact install, typecheck, zero-warning lint, unit/PBT, Worker, backup, browser, accessibility, and production builds.
- [ ] Step 3: Add dependency and secret scans, SBOM, artifact digests, and pinned third-party actions.
- [ ] Step 4: Add Cloudflare Pages static configuration and `_headers` for CSP, HSTS, nosniff, frame, referrer, and permissions policies.
- [ ] Step 5: Add isolated preview deployments for Pages, AI Worker, and Push Worker using scoped credentials and no production secrets on pull requests.
- [ ] Step 6: Add preview contract, header, integration, and smoke gates plus manual production approval.
- [ ] Step 7: Promote the same immutable artifact digests to production and record build/schema versions.
- [ ] Step 8: Configure safe Workers Logs events, metrics, alerts, and approved retention/export.
- [ ] Step 9: Add rollback workflow for prior Pages and Worker versions with health verification.
- [x] Step 10: Apply the launch brand `하꾸` and Latin name `hakku` to the PWA manifest, page metadata, install UI, and user-facing copy; replace the template README and add privacy, retention, deletion, beta support, operations, rollback, and media-license docs. Preserve repository paths and persisted data identifiers unless a separately tested migration is provided.
- [x] Step 11: Add iOS/Android and accessibility release checklists and collect final Security/PBT evidence.
- [x] Step 12: Run the complete public-beta gate and write U7 code/release summary.

Implementation must not begin until U1–U6 are complete and the user explicitly authorizes code generation.
