# U5 Infrastructure Design

| Logical Component | Infrastructure Mapping |
|---|---|
| AI API | Dedicated Cloudflare Worker |
| Provider secret | Required encrypted Worker secret binding |
| Installation, replay, quota | SQLite-backed Durable Object per installation |
| Runtime config | Non-secret environment binding per preview or production |
| Safe logs | Workers Logs with explicit safe event serializer |
| Provider network | Fixed HTTPS provider origin only |

Preview and production use different Worker names, Durable Object namespaces, secrets, origins, enrollment issuers, and deploy credentials. The Worker is stateless outside Durable Objects. No VPC, load balancer, queue, or shared AI/Push storage is used.

Durable Object transactions serialize quota and nonce updates. Content is never stored. Retention jobs remove expired nonces and revoked-install metadata according to policy.
