# U5 NFR Requirements

| Area | Requirement |
|---|---|
| Privacy | Only consented text and selected captions leave the device; Worker does not persist content. |
| Authentication | ECDSA P-256 signed installation request, audience binding, timestamp and nonce validation, revocation. |
| Input | JSON body maximum 32 KiB and strict versioned runtime schema. |
| Performance | Worker overhead p95 under 300 ms excluding provider; provider timeout 20 s. |
| Quota | Default 2 requests/minute and 10/day per installation; configurable without client release. |
| Reliability | Any network, quota, validation, or provider failure returns local direction. |
| Security | Provider secret is Worker-only; model and system prompt are server allowlisted. |
| Observability | Safe request ID, build, status, latency bucket, quota decision; no prompt or output. |
| Scaling | Stateless Worker compute; installation and quota records partition by installation ID. |

No strict uptime SLA is promised for optional AI in public beta.
