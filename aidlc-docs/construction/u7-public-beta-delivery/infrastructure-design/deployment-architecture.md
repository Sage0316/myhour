# U7 Deployment Architecture

```mermaid
flowchart TD
    GitHub["GitHub Repository"]
    CI["Protected CI"]
    Artifacts["Immutable Artifacts"]
    PreviewPages["Preview Pages"]
    PreviewWorkers["Preview Workers"]
    Smoke["Integration and Mobile Smoke"]
    Approval["Production Approval"]
    ProdPages["Production Pages"]
    ProdWorkers["Production Workers"]
    Logs["Workers Logs and Alerts"]

    GitHub --> CI
    CI --> Artifacts
    Artifacts --> PreviewPages
    Artifacts --> PreviewWorkers
    PreviewPages --> Smoke
    PreviewWorkers --> Smoke
    Smoke --> Approval
    Approval --> ProdPages
    Approval --> ProdWorkers
    ProdWorkers --> Logs
```

Text alternative: Protected CI builds immutable artifacts, deploys them to isolated preview Pages and Workers, runs integration and mobile smoke checks, requires production approval, then promotes the same digests to production. Production Workers emit safe logs and alerts.

Rollback selects the previous evidence manifest and re-promotes its Pages and Worker versions, followed by health and schema-compatibility checks.
