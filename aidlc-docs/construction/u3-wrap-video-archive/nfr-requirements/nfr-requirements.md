# U3 NFR Requirements

| Area | Requirement |
|---|---|
| Output | Default 720x1280, 30 fps, target video bitrate 2.5 Mbps; high quality is optional and capability-gated. |
| Responsiveness | Progress updates at least every 500 ms; UI remains cancellable before commit. |
| Reliability | Source media and existing archives survive every generation failure. |
| Resource Safety | Streams, Object URLs, timers, AudioContext, tracks, and pending Blob close on terminal paths. |
| Compatibility | Representative iOS 16.4+ PWA and current Android Chrome complete mixed-media generation. |
| Persistence | Generated output plays after restart and direct archive reload. |
| Accessibility | Semantic controls, named icon buttons, managed dialog focus, accessible live progress, no long-press-only action. |
| Bundle | Initial JS remains at or below 120 KiB gzip; media tooling loads on demand when practical. |

No server-side rendering or horizontal scaling is required.
