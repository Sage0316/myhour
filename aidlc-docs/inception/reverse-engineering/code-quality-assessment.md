# Code Quality Assessment

## Verification Results

- **Production Build**: Passed with Vite 8.1.5 and TypeScript 6.0.3.
- **Production JavaScript**: 293.31 KB, 88.05 KB gzip.
- **Production Static Output**: Approximately 88.2 MB across 30 files.
- **Lint**: Passed with five warnings.
- **Push Encryption Round Trip**: Passed.
- **Deployed Mobile Smoke Test**: Home, record, settings, and empty wrap-up screens loaded without console errors.
- **Automated Test Coverage**: None configured.

## Strengths

- The local-first product concept is coherent and the deployed mobile UI is visually polished.
- Browser capability failures usually have graceful fallbacks or user-facing warnings.
- Cross-midnight session calculations are explicitly modeled.
- Video generation separates drawing primitives from orchestration.
- Large original videos use IndexedDB rather than localStorage.
- Push payload encryption has a concrete round-trip verification.
- Build and type checking currently succeed.

## Priority Findings

### P0 - Slot identity is inconsistent

- **Locations**: `context.tsx:52-58`, `RecordScreen.tsx:414-415`, `TodayScreen.tsx:124-160`, and `HomeScreen.tsx:139-191`.
- **Finding**: The record screen shows `currentSlot`, but `addRecord` stores the wall-clock minute. Slot views perform exact `slotTime` lookups.
- **Impact**: A record made at 13:17 for the 13:00 slot is stored as 13:17 and is not shown in the 13:00 tile or timeline slot.
- **Improvement**: Store both `slotId/currentSlot` and `capturedAt`, or pass the displayed current slot into `addRecord`. Use a stable record ID for multiple records per slot instead of a single-value map.

### P0 - Push intervals can generate duplicate notifications

- **Location**: `push-server/worker.js:193-198`.
- **Finding**: With a 30-minute cron, `since % interval < 30` accepts two runs for 60- and 120-minute intervals.
- **Impact**: Users can receive reminders at both the slot boundary and 30 minutes later.
- **Improvement**: Match the cron boundary exactly, persist a last-sent slot for idempotency, and add schedule tests across time zones and midnight.

### P0 - User-visible wrap-up controls do not affect output

- **Locations**: `WrapUpScreen.tsx:26-27`, `WrapUpScreen.tsx:196-212`, and `WrapUpScreen.tsx:67-76`.
- **Finding**: Selected emoji and calmness are updated in UI state but never passed to the video generator. `outputRatio`, `notifyTiming`, and `bgMusic` settings are also partly or wholly disconnected from runtime behavior.
- **Impact**: The UI promises customization that does nothing, eroding trust.
- **Improvement**: Wire each setting to a defined rendering or scheduling behavior, or remove it until implemented. Add behavior tests for every setting.

### P0 - Device storage can leak or overflow

- **Locations**: `store.ts:24-60`, `context.tsx:77-83`, `RecordScreen.tsx:113-127`, and `RecordScreen.tsx:438-449`.
- **Finding**: Video writes swallow failures. Deleting a current record does not delete its IndexedDB blob. Retake, mode switching, or closing after capture can orphan a blob. Photos and unlimited WAV audio remain as base64 in localStorage.
- **Impact**: Silent data loss, broken archive items, quota exhaustion, and growing orphan storage.
- **Improvement**: Centralize a transactional media repository, propagate write errors, store all media blobs in IndexedDB or OPFS, cap capture duration, and perform reference-based cleanup.

### P1 - Direct browser API-key handling is unsafe for a production product

- **Locations**: `llmDirector.ts:3-11` and `llmDirector.ts:90-110`.
- **Finding**: The Anthropic API key is stored in localStorage and used with `anthropic-dangerous-direct-browser-access`.
- **Impact**: Any XSS or malicious same-origin script can read the key. Usage cannot be centrally rate-limited or audited.
- **Improvement**: Move AI calls behind a minimal authenticated proxy, issue per-install or per-user quotas, avoid long-lived secrets in the browser, and disclose exactly which record content leaves the device.

### P1 - Push endpoints lack abuse controls

- **Locations**: `push-server/worker.js:125-175`.
- **Finding**: CORS restricts browsers but is not authentication. Subscribe, unsubscribe, and test endpoints accept unauthenticated requests. Input size and fields are minimally validated.
- **Impact**: Scripted abuse, notification spam through `/test`, malformed KV records, and unnecessary Worker cost.
- **Improvement**: Add strict schemas, body limits, rate limiting, per-install proof/token, signed unsubscribe/test requests, endpoint allowlisting to supported HTTPS push origins, and structured error handling.

### P1 - Backup does not back up the product's valuable data

- **Locations**: `SettingsScreen.tsx:217-287`.
- **Finding**: Export includes only current-session data and settings. It omits archive metadata, generated videos, source media, and AI director results. Import validation checks only three top-level fields.
- **Impact**: Users can believe their journal is backed up when most history and media are not recoverable.
- **Improvement**: Define a versioned backup schema, include archive and media via a ZIP or File System API export, validate with a runtime schema, and show backup scope/size.

### P1 - Generated video handoff and wrapped state are internally inconsistent

- **Locations**: `App.tsx:42-70`, `HomeScreen.tsx:205-282`, and `context.tsx:85-106`.
- **Finding**: `WrapUpScreen` supplies a generated object URL, but `handleSave` ignores it, resets the session, and routes to Archive. `HomeWrapped` is normally unreachable because `setWrapped` is never called.
- **Impact**: Dead state and UI paths complicate maintenance and can produce inconsistent imported-session behavior.
- **Improvement**: Choose one post-wrap destination. Either remove `HomeWrapped/setWrapped/videoUrl` or keep the wrapped session visible and load its generated video from IndexedDB.

### P1 - Repository and delivery hygiene are weak

- **Locations**: Repository root and `myhour/README.md`.
- **Finding**: The root is still a design handoff bundle, the runnable app is nested, the app README is the Vite template, there is one commit, no CI workflow, no deployment workflow, and no license/security/privacy documentation.
- **Impact**: Onboarding, release reproducibility, contribution quality, and production confidence are low.
- **Improvement**: Promote the app to a clear repository root or document the monorepo shape; replace README; add CI for typecheck, lint, tests, and build; automate GitHub Pages deployment; add privacy, data retention, and media-license documentation.

### P2 - Accessibility and interaction semantics need work

- **Locations**: Settings rows, mood changer, timeline sheets, record tiles, and icon-only controls.
- **Finding**: Several clickable `div`/`span` elements are not keyboard controls; long-press-only deletion is undiscoverable; some icon buttons lack accessible names; focus and dialog semantics are absent.
- **Impact**: Keyboard, assistive technology, and discoverability suffer.
- **Improvement**: Use buttons and dialogs, add labels and focus management, provide a visible record menu, test WCAG contrast and text scaling, and add automated axe checks.

### P2 - Offline behavior is narrower than the PWA presentation suggests

- **Location**: `public/sw.js`.
- **Finding**: Only the root and `index.html` are precached. Hashed JavaScript, CSS, font, icons, and BGM are not guaranteed offline.
- **Impact**: The app shell or recap generation can fail offline after cache eviction or on first offline launch.
- **Improvement**: Use a generated precache manifest, runtime strategies for large BGM, an explicit offline state, and service-worker update UX.

### P2 - Large static media increases repository and deployment cost

- **Location**: `public/bgm/`.
- **Finding**: Eighteen MP3 tracks dominate an approximately 88.2 MB build; the GitHub repository reports about 122 MB with only one commit.
- **Impact**: Slow clones, deployments, and first-use BGM fetches; increased mobile bandwidth.
- **Improvement**: Compress/normalize tracks, serve them from versioned object storage or a CDN, download on demand, and document licenses and attribution.

## Lint Findings

- Fast Refresh boundary warning in `context.tsx`.
- Three unnecessary dependencies in `addRecord`.
- Missing effect dependencies in `WrapUpScreen`; a stale async result can be applied if records or session change.

## Recommended Delivery Order

1. Fix slot identity, push scheduling idempotency, and disconnected controls.
2. Build a reliable media lifecycle and complete backup.
3. Secure AI and push boundaries before wider release.
4. Add automated tests and CI around schedule, persistence, generation, and PWA behavior.
5. Improve accessibility, offline guarantees, repository documentation, and asset delivery.

