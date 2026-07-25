# U5 Tech Stack Decisions

- Separate Cloudflare Worker using standard Fetch API
- Cloudflare managed secret for provider credentials
- Dedicated preview and production installation/quota storage bindings
- Shared TypeScript runtime contracts from U1
- Web Crypto ECDSA verification
- Provider adapter with AbortController timeout
- Worker unit and contract tests using runtime-compatible test harness

The browser Anthropic key UI and direct API call are removed during implementation.
