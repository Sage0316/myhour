# U6 Infrastructure Design

| Logical Component | Infrastructure Mapping |
|---|---|
| Push API | Dedicated Cloudflare Worker |
| Installation, subscription, schedule | SQLite-backed Durable Object per installation |
| Delivery scheduling | One Durable Object alarm for the next due delivery |
| Idempotency | Transactional delivery table inside the installation object |
| VAPID and encryption secrets | Required encrypted Worker secret bindings |
| Safe logs | Workers Logs with redacted endpoint identifier |
| Push network | HTTPS allowlist for supported provider hosts |

Durable Object storage is strongly consistent and transactional, avoiding KV visibility delay for schedule versions and delivery reservations. The alarm handler processes all events due at the next timestamp, records the outcome, and schedules the next alarm. At-least-once alarm execution is made user-visible at-most-once by the durable delivery key.

Legacy KV data is read only by a controlled migration path and removed only after verified conversion.
