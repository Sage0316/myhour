# U6 NFR Design Patterns

- Pure schedule calculation isolates time-zone and midnight behavior.
- Versioned schedule replacement prevents stale delivery.
- Reserve-send-complete idempotency handles alarm retries and duplicate execution.
- Signed ownership and replay guard protect all mutations.
- Provider host allowlist prevents arbitrary outbound requests.
- Failure classification separates retryable, permanent, and expired outcomes.
- Safe metrics expose delivery health without endpoint or payload.
- PBT covers ordering, boundaries, duplicates, time zones, and seed replay.
