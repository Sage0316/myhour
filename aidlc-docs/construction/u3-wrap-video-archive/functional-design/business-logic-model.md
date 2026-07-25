# U3 Business Logic Model

## Wrap-up Flow

1. Load persisted records and reject an empty or invalid session.
2. Accept only connected mood and notification controls.
3. Obtain AI direction when consented; otherwise use deterministic local direction.
4. Preflight video capabilities and storage.
5. Render with the mobile-default profile and progress phases.
6. Commit generated media, director metadata, and archive in one Unit of Work.
7. Close the session, create the next session, and return `ArchiveId`.
8. Route to the archive and open that ID.

## Cancellation

Cancellation before commit deletes only pending output. Cancellation is disabled during the short final commit boundary. Source media and prior archives are immutable throughout generation.
