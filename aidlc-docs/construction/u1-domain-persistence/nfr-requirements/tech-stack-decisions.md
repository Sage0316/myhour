# U1 Tech Stack Decisions

- TypeScript 6 and existing Vite/React toolchain
- Native IndexedDB behind repository adapters
- Web Crypto SHA-256 for deterministic legacy identity inputs where required
- Vitest for unit tests and fast-check for selected property tests
- Runtime schema adapter shared with Workers; concrete library pinned during implementation after bundle verification
- No new global state-management library

The design favors small ports and pure functions over a framework migration.
