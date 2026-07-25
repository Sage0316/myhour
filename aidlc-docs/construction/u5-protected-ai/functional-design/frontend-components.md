# U5 Frontend Components

| Component | Responsibilities |
|---|---|
| AIConsentDialog | Explains fields, provider, purpose, and local fallback |
| AIPrivacySettings | Shows consent status and revoke action |
| AIDirectionStatus | Displays local, remote, limited, or unavailable outcome |
| BetaEnrollmentDialog | Accepts one-time enrollment credential without persisting it |

Consent, revoke, and enrollment controls use stable test IDs and accessible error states. The UI never accepts or stores a provider API key.
