# U1 NFR Requirements

| Area | Requirement |
|---|---|
| Integrity | No active-data change occurs before migration validation and pointer activation. |
| Performance | Slot calculation p95 under 5 ms; metadata query or commit p95 under 100 ms for 1,000 records on supported devices. |
| Responsiveness | Migration emits progress at least every 250 ms of active work and does not block the UI thread for over 50 ms continuously. |
| Compatibility | iOS 16.4+ PWA and current Android Chrome; schema upgrade from the analyzed legacy version. |
| Security | Runtime validation at every storage and network trust boundary; no content in logs. |
| Reliability | Deterministic, idempotent migration with typed failure and rollback. |
| Maintainability | Domain and contracts remain framework-independent with zero lint warnings. |
| Testability | PBT covers slot boundaries, IDs, migration round-trip, idempotency, shrinking, and seed reproduction. |

Availability and horizontal scalability are N/A because U1 is device-local and has no server.
