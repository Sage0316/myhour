# U6 Business Rules

| Rule | Definition |
|---|---|
| U6-BR-01 | Schedule input has installation ID, version, time zone, bounds, interval, and timing. |
| U6-BR-02 | Only the latest successfully stored version is active. |
| U6-BR-03 | Delivery keys are unique by installation, version, slot, and kind. |
| U6-BR-04 | Subscription and schedule mutations require valid signed ownership. |
| U6-BR-05 | CORS, body limits, runtime schema, rate limit, and host allowlist are enforced. |
| U6-BR-06 | Test delivery is separately rate-limited and never anonymous. |
| U6-BR-07 | Expired subscriptions are removed without exposing endpoint details. |
| U6-BR-08 | Delete-installation is signed and idempotent. |
