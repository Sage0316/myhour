# U6 Tech Stack Decisions

- Existing Cloudflare Worker, Web Push encryption, and VAPID implementation
- Modular Worker handlers and shared U1 runtime contracts
- SQLite-backed per-install Durable Objects with alarms for schedule and idempotency
- Dedicated preview and production Durable Object namespaces, secrets, and origins
- Legacy KV is a read-only migration source only
- Web Crypto verification and existing push encryption round-trip fixture
- Vitest plus fast-check for schedule properties
- Worker contract tests for auth, schema, rate, host, idempotency, and cleanup

No queue is required for initial public-beta volume; the delivery port remains replaceable.
