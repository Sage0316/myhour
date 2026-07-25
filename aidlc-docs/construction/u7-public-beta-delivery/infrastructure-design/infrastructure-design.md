# U7 Infrastructure Design

| Concern | Mapping |
|---|---|
| Source and review | GitHub protected branch and pull request checks |
| Build | GitHub Actions with exact lockfile and pinned third-party actions |
| Static PWA | Cloudflare Pages project with `_headers` security policy |
| AI compute | Independent Cloudflare AI Worker and Durable Object namespace |
| Push compute | Independent Cloudflare Push Worker and Durable Object namespace |
| Secrets | Environment-specific encrypted Worker secrets and scoped CI credentials |
| Logs | Workers Logs safe events; optional approved export sink |
| Artifacts | Immutable PWA and Worker version digests in release evidence |
| Promotion | Preview smoke, manual production approval, same artifact digest |
| Rollback | Prior verified Pages deployment and Worker versions |

The CI token follows least privilege and is environment-scoped. Pull requests do not receive production secrets. Security headers are validated against deployed static responses, not only source configuration.

Alerts cover authentication failures, rate-limit spikes, AI failure rate, Push delivery failure, and deployment health. Security-event retention targets 90 days, subject to selected account capabilities or an approved log export.
