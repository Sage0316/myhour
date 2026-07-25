# U5 Business Rules

| Rule | Definition |
|---|---|
| U5-BR-01 | No AI network request occurs without current explicit consent. |
| U5-BR-02 | Raw photo, video, and audio never enter the AI request. |
| U5-BR-03 | Provider secrets exist only in the AI Worker secret store. |
| U5-BR-04 | Every request is versioned, signed, bounded, rate-limited, and quota-checked. |
| U5-BR-05 | Client cannot select arbitrary provider model or system prompt. |
| U5-BR-06 | Provider output is allowlist-mapped and runtime-validated. |
| U5-BR-07 | External failure never blocks local wrap-up. |
| U5-BR-08 | Logs exclude prompts, outputs, secrets, signatures, and captions. |
