# U3 Frontend Components

| Component | State | Responsibilities |
|---|---|---|
| WrapUpScreen | loading, ready, generating, error | Shows accurate count and connected controls |
| GenerationProgressDialog | phase, progress, cancellable | Announces progress and manages focus |
| CapabilityWarning | unsupported capability | Explains alternative without starting work |
| ArchiveScreen | archive collection | Loads by stable ID |
| ArchiveDetailDialog | selected archive | Plays persisted output and restores focus |

Removed states include `HomeWrapped`, unused `setWrapped`, and transient generated `videoUrl`. Stable test IDs cover generate, cancel, archive card, playback, and dialog controls.
