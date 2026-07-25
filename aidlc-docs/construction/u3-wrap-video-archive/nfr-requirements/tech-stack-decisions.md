# U3 Tech Stack Decisions

- Existing React screens and CSS, progressively adapted to services
- Native Canvas 2D, MediaRecorder, Web Audio, and AbortController
- Existing scene renderer retained behind `VideoEnginePort`
- Vitest for orchestration and resource-cleanup tests
- Browser smoke fixtures for codecs and generation
- Automated accessibility checks plus manual keyboard and mobile screen-reader checklist

No server-side video service is added for the public beta.
