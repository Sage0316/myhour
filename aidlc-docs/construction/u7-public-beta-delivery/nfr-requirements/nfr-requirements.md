# U7 NFR Requirements

| Area | Requirement |
|---|---|
| Supply Chain | Exact lockfile install, pinned actions, dependency and secret scan, SBOM. |
| Quality | Typecheck, zero-warning lint, unit, PBT, Worker, backup, browser, accessibility, and build gates. |
| Security | CSP, HSTS, nosniff, frame restriction, Referrer Policy verified on real responses. |
| Isolation | Preview and production have separate Durable Object namespaces, secrets, origins, credentials, and deployments. |
| Observability | Safe structured logs, auth/limit/AI/Push metrics, configured alerts, 90-day security-log target. |
| Rollback | Restore prior immutable PWA and Worker artifacts and verify health. |
| Compatibility | iOS 16.4+ PWA and current Android Chrome release smoke. |
| Documentation | Platform, permissions, privacy, AI, Push, retention, deletion, backup, limits, and licenses are release gates. |
| Availability | No formal beta SLA; health and rollback must be observable and rehearsed. |

Security Baseline noncompliance blocks promotion.
