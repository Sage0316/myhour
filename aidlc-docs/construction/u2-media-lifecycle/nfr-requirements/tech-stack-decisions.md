# U2 Tech Stack Decisions

- Native IndexedDB Blob storage through U1 repositories
- MediaDevices, MediaRecorder, Blob, URL, StorageManager, and AbortController adapters
- Vitest with fake media ports for lifecycle tests
- Browser integration tests for IndexedDB commit and cleanup
- Playwright-compatible smoke harness for supported Chromium behavior; iOS checks remain physical or hosted-device release evidence

No OPFS dependency is introduced in the first public-beta implementation.
