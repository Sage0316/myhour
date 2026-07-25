# U7 Domain Entities

| Entity | Purpose |
|---|---|
| ReleaseCandidate | Commit, immutable artifacts, build and schema versions |
| QualityEvidence | Gate, environment, result, timestamp, artifact digest |
| SecurityEvidence | Baseline rule, status, rationale, evidence reference |
| DeploymentPromotion | Source and target environment, approver, result |
| RollbackRecord | Failed release, restored release, reason, verification |
| SupportManifest | Platforms, permissions, privacy, retention, deletion, licenses |

U7 owns evidence and promotion metadata, not journal content.
