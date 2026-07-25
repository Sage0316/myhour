# U5 Business Logic Model

## Direction Decision

1. Check consent against the current notice version.
2. If absent or declined, return local direction.
3. Build a minimal DTO from user text and explicitly selected captions.
4. Sign method, path, audience, timestamp, nonce, and body hash.
5. Worker validates origin, schema, installation, replay window, quota, and model allowlist.
6. Validate provider output and return a versioned response.
7. Any denial, timeout, limit, malformed output, or provider failure returns local direction.

Installation enrollment uses an out-of-band beta credential and a browser-generated non-extractable signing key.
