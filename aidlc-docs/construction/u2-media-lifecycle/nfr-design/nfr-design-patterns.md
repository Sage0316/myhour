# U2 NFR Design Patterns

- Resource lease owns every temporary browser resource.
- Blob and stream processing prevents base64 amplification.
- Preflight guard checks capability, policy, projected bytes, and reserve.
- Unit of Work plus compensation prevents dangling media.
- Reference mark-and-sweep cleanup is idempotent and legacy-aware.
- Backpressure and progress callbacks keep the UI responsive.
- Safe errors separate quota, unsupported, validation, and internal failures.
