# U7 Business Rules

| Rule | Definition |
|---|---|
| U7-BR-01 | Production uses only an immutable artifact that passed protected CI. |
| U7-BR-02 | Preview and production secrets, state namespaces, origins, and deployment credentials are separate. |
| U7-BR-03 | Type, zero-warning lint, unit, PBT, Worker, backup, browser, build, scan, and SBOM gates are mandatory. |
| U7-BR-04 | Required web security headers are verified against the deployed response. |
| U7-BR-05 | Logs contain safe fields only and security events trigger configured alerts. |
| U7-BR-06 | Rollback uses the last verified immutable PWA and Worker artifacts. |
| U7-BR-07 | Privacy, deletion, support, and license documentation must match behavior. |
| U7-BR-08 | iOS and Android smoke evidence is required for beta promotion. |
