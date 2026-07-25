# U2 Frontend Components

| Component | Props or Inputs | State | Interaction |
|---|---|---|---|
| CaptureLauncher | capture kind, slot | idle, checking | Runs preflight before opening hardware |
| CaptureSession | permit, media adapter | capturing, reviewing | Complete, retake, cancel |
| StorageWarningDialog | estimate, recovery actions | open | Cancel or navigate to cleanup |
| SaveProgress | operation state | pending, success, error | Announces persistent completion |
| RecordActionMenu | record ID | open | Visible delete alternative to long press |

Interactive controls use stable `data-testid` values, semantic buttons, accessible labels, and deterministic pending/error states. The screen calls `RecordService`; it does not call IndexedDB directly.
