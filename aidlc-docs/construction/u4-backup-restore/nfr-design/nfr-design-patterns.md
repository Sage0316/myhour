# U4 NFR Design Patterns

- Versioned encrypted envelope supports algorithm evolution.
- Independent authenticated chunks bound peak memory and localize corruption.
- Manifest hash and reference validation provide end-to-end integrity.
- Budget guards reject path, count, size, ratio, and algorithm abuse early.
- Staging restore plus atomic activation is fail closed.
- Passphrase and derived keys have short memory lifetime and no persistence.
- PBT covers export/import equivalence, tampering, idempotency, and limit edges.
