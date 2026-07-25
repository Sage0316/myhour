# U6 Frontend Components

| Component | Responsibilities |
|---|---|
| PushCapabilityNotice | Explains platform support before permission request |
| PushPreferencesForm | Validates interval and before/exact/both timing |
| PushPermissionButton | Requests permission only after explicit user action |
| PushTestButton | Sends authenticated, rate-limited test |
| PushStatus | Shows local and server synchronization state |
| RemoteDeleteAction | Deletes owned Worker data before local key removal |

Controls use stable test IDs and distinguish browser permission denial, unsupported capability, server rejection, and retryable network failure.
