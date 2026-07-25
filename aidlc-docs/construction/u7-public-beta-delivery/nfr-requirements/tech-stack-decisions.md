# U7 Tech Stack Decisions

- GitHub Actions for protected CI and artifact promotion
- npm lockfile, TypeScript, Oxlint, Vitest, fast-check, browser tests, secret and dependency scanning
- Wrangler for independent AI and Push Worker deployments
- Header-capable static PWA hosting; Cloudflare Pages is the default mapping, subject to account validation
- Cloudflare structured logs and metrics interfaces through safe logger adapters
- Markdown runbooks, privacy, retention, license, and support documentation in version control

Build once and promote the same immutable artifact digest across environments.
