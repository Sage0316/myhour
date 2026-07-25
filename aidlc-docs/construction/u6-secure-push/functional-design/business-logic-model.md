# U6 Business Logic Model

## Schedule Update

Validate preferences, increment schedule version, sign the canonical request, verify installation ownership at the Worker, and atomically replace the latest schedule for that installation.

## Alarm Evaluation

1. Read the installation object's active subscription and latest schedule.
2. Calculate planned deliveries in each schedule's IANA time zone.
3. Build delivery key from installation, schedule version, slot, and notification kind.
4. Reserve the key; skip completed or actively reserved keys.
5. Send only to an allowed HTTPS push provider host.
6. Mark success, classify retryable failure, or delete expired subscriptions.

Old schedule versions are never eligible after a successful update.
