# U4 Tech Stack Decisions

- Native Web Crypto for SHA-256, PBKDF2, and AES-GCM
- Chunked encrypted envelope with unique nonce derivation per chunk
- Streaming container reader and writer behind an adapter; implementation dependency must support bounded extraction and be lockfile-pinned
- U1 staging database and migration framework
- Vitest and fast-check round-trip, tampering, limit, and idempotency tests

Exact KDF work factor and chunk size are calibrated on supported mobile devices during implementation and recorded in the format version.
