# 하꾸 Shared Infrastructure

## Environment Isolation

| Resource | Preview | Production | Shared? |
|---|---|---|---|
| Pages project or environment | Preview | Production | No |
| AI Worker | Preview name | Production name | No |
| AI Durable Object namespace | Preview | Production | No |
| Push Worker | Preview name | Production name | No |
| Push Durable Object namespace | Preview | Production | No |
| Provider and VAPID secrets | Preview/test | Production | No |
| Allowed origins | Preview domains | Production domain | No |
| Contract package and source | Same reviewed version | Same reviewed version | Yes |
| CI build artifact | Same immutable digest | Promoted digest | Yes |

## Networking

- Public HTTPS is the only network boundary.
- PWA origins are explicit allowlists, never wildcarded with credentials.
- AI outbound traffic is fixed to the configured provider origin.
- Push outbound traffic is limited to supported HTTPS push provider hosts.
- No VPC, subnet, security group, load balancer, or API gateway is required.

## State Consistency

- KV is not used for quota, schedule version, nonce, or delivery reservation because those require atomic coordination.
- SQLite-backed Durable Objects own per-install strongly consistent state.
- Push Durable Object alarms own the next scheduled delivery and reschedule after processing.

## Secret and Access Control

- Provider, VAPID, enrollment-signing, and CI credentials are encrypted secrets.
- CI credentials are scoped to one environment and required resource set.
- Pull requests from untrusted contexts receive no deployment secrets.
- Required secret names are validated before deployment.

## Observability

- Workers emit only safe structured events.
- Each event includes request ID, pseudonymous installation ID, build and schema versions, operation, status, and duration bucket.
- User content, endpoint URLs, prompts, outputs, passphrases, keys, and signatures are forbidden.
- Alerts and retention are environment-specific.

## Security Baseline

SECURITY-01–SECURITY-06 and SECURITY-08–SECURITY-15 are mapped to Pages, Workers, Durable Objects, CI, secrets, logs, and promotion gates. SECURITY-07 is N/A because the design has no VPC or network ACL components.
