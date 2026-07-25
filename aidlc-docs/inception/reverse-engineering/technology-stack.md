# Technology Stack

## Programming Languages

- **TypeScript 6.0** - React application and media pipeline.
- **JavaScript ES modules** - Service worker and Cloudflare Worker.
- **HTML and CSS** - PWA shell, prototypes, fixtures, and styling.
- **TOML** - Cloudflare Worker configuration.

## Frameworks and Libraries

- **React 19.2** - UI and state.
- **React DOM 19.2** - Browser rendering.
- **Vite 8.1** - Build and development.
- **Oxlint 1.x** - Static linting.
- **Playwright Core 1.61** - Declared for browser-oriented fixtures.

## Browser Platform APIs

- MediaDevices and MediaRecorder.
- Canvas 2D and `captureStream`.
- Web Audio API.
- IndexedDB and localStorage.
- Service Worker, Cache Storage, PushManager, and Notifications.
- Web Share and file input APIs.

## Infrastructure

- **GitHub Pages** - Static hosting.
- **Cloudflare Workers** - Push service.
- **Cloudflare KV** - Subscription persistence.
- **Web Push and VAPID** - Notification transport and authentication.

## External Services

- **Anthropic Messages API** - Optional day-summary direction.
- **Browser push provider endpoints** - Delivery targets.

## Build Tools

- `tsc -b` - Type checking.
- `vite build` - Production bundling.
- npm lockfile - Dependency resolution.
- Wrangler - Intended Worker deployment tool.

## Testing Tools

- Node Web Crypto round-trip script.
- Playwright Core dependency.
- Browser fixture pages for preview and generation.
- No formal test runner or coverage tool is configured.

