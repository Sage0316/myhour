# U2 NFR Requirements

| Area | Requirement |
|---|---|
| Integrity | Blob, descriptor, and record reference commit together or compensate fully. |
| Memory | Media remains Blob or stream; no persistent base64 and no full duplicate copy unless required by a platform adapter. |
| Performance | Save progress begins within 100 ms; UI work yields before any 50 ms long task. |
| Capacity | Versioned policy defaults: photo 25 MiB, audio 10 min or 100 MiB, video 5 min or 750 MiB. |
| Storage Safety | Preflight requires projected write plus 100 MiB reserve when quota information is available. |
| Cleanup | All terminal paths release streams, timers, URLs, and audio resources; cleanup is idempotent. |
| Security | Allowlisted capture MIME and bounded sizes; filenames are not trusted as type evidence. |
| Usability | Quota and capability errors preserve existing content and provide a visible recovery action. |

Server availability and scaling are N/A.
