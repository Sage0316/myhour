# U1 Business Logic Model

## Slot Assignment

1. Parse `capturedAt`, session bounds, interval, and IANA time zone.
2. Reject invalid or non-positive intervals.
3. Convert the capture instant into the session-local timeline.
4. Calculate the greatest slot boundary not later than the capture instant.
5. Clamp only when the instant is inside the valid cross-midnight session.
6. Return a deterministic `SlotId` derived from session ID and slot boundary.

## Stable Identity

- New records use UUID-compatible random IDs.
- Legacy records use a deterministic hash of legacy session identity, original index, captured time, kind, and media reference.
- ID generation is independent of render order and current clock.

## Migration State Machine

`NotNeeded → Preparing → Transforming → Validating → ReadyToActivate → Activated`

Any error before activation transitions to `Failed` and discards staging. The legacy source and active pointer remain unchanged.

## Repository Commit

Commands validate domain data, open a Unit of Work, write aggregate changes, and publish success only after transaction completion.
