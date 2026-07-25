# U6 NFR Requirements

| Area | Requirement |
|---|---|
| Timing | Planned slot time is exact in domain tests; Durable Object alarm delivery target is within 2 minutes of the planned instant. |
| Idempotency | A delivery key is reserved and completed durably; overlap and retry produce at most one success. |
| Authentication | Signed installation ownership, audience, timestamp and nonce validation, revocation. |
| Input | JSON body maximum 32 KiB; endpoint HTTPS host allowlist and strict schema. |
| Rate Limit | Mutations 10/minute per install; test delivery 3/hour; configurable server-side. |
| Reliability | Retryable and permanent failures are separated; expired subscriptions are removed. |
| Security | VAPID and encryption secrets remain Worker-managed; endpoint and payload are absent from logs. |
| Observability | Delivery success rate, expired count, safe error class, auth and limit events. |
| Compatibility | iOS and Android PWA subscriptions and notification-click navigation. |

Public-beta delivery is best effort; no formal availability SLA is declared.
