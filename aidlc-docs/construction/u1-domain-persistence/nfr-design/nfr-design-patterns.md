# U1 NFR Design Patterns

- Ports and adapters keep domain logic framework-independent.
- Staging plus atomic active-pointer switch provides fail-safe migration.
- Typed `Result` prevents swallowed persistence errors.
- Deterministic clock and ID ports make migration reproducible.
- Chunked migration yields to the UI and reports progress.
- PBT verifies round-trip, idempotency, boundaries, shrinking, and seed replay.
- Runtime schema validation rejects unsupported or malformed stored data.
