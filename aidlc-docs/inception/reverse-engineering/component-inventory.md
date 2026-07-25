# Component Inventory

## Application Packages

- **React PWA (`myhour/`)** - Capture, timeline, wrap-up, archive, settings, PWA shell, AI client, and browser video generation.
- **Cloudflare Worker (`myhour/push-server/`)** - Subscription storage, VAPID signing, encryption, and scheduled delivery.

## Infrastructure Packages

- **GitHub Pages configuration** - Vite base path and static assets; no checked-in CI workflow.
- **Cloudflare Worker configuration** - `wrangler.toml`, KV binding, and 30-minute cron.
- **Service worker** - Navigation shell caching and push notification display.

## Shared Packages

- **Store/domain utilities** - Models, schedule calculations, browser persistence, and retention.
- **Scene renderer** - Reusable drawing functions for video composition.
- **App context** - Shared state facade for screens.

## Test Packages

- **Push encryption round-trip** - Node test that verifies encryption/decryption compatibility.
- **Generation fixture** - Browser-oriented synthetic records and output checks.
- **Preview fixture** - Scene rendering preview.
- **Missing**: Automated unit, component, end-to-end, accessibility, and CI test suites.

## Total Count

- **Logical Packages**: 2 application packages.
- **Application**: 2.
- **Infrastructure**: 3 configurations/subsystems.
- **Shared**: 3 major internal modules.
- **Test**: 3 ad hoc utilities, 0 integrated automated suites.
- **Tracked Files**: 78.
- **Application Source Files**: 24 under `myhour/src`.

