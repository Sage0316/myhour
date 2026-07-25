# U7 Business Logic Model

## Release State Machine

`Draft → CIValidated → PreviewDeployed → SmokeValidated → Approved → ProductionPromoted`

Failure moves to `Rejected`; production health failure moves to `RollbackRequired` and promotes the prior verified artifact.

## Evidence Collection

Each Unit supplies build version, schema version, test results, Security Baseline status, PBT seed evidence where applicable, and rollback note. U7 rejects incomplete or mismatched evidence.

## Data Transparency

Release documentation is generated from approved support, privacy, AI, Push, backup, deletion, media-license, and known-limit decisions. Documentation is a release gate, not a post-release task.
