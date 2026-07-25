# U1 Business Rules

| Rule | Definition |
|---|---|
| U1-BR-01 | Every record has stable `id`, `sessionId`, `slotId`, `capturedAt`, and schema version. |
| U1-BR-02 | Multiple records may share a slot; no slot-key overwrite is allowed. |
| U1-BR-03 | Slot assignment uses the configured local time zone and handles cross-midnight sessions. |
| U1-BR-04 | Migration steps are ordered, versioned, deterministic, and idempotent. |
| U1-BR-05 | Legacy input is read-only until the user later confirms cleanup. |
| U1-BR-06 | Staging activates only after schema, required-field, uniqueness, and reference validation. |
| U1-BR-07 | Persistence failure returns a typed error and never produces a success UI state. |
| U1-BR-08 | Shared contracts reject unsupported versions and unknown unsafe input. |

## Error Outcomes

- Invalid domain input: reject before opening a transaction.
- Transaction failure: rollback and retain prior active state.
- Missing legacy media: migrate recoverable metadata and report the missing reference.
- Duplicate deterministic ID: stop activation and preserve legacy data.
