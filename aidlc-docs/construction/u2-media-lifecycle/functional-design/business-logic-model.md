# U2 Business Logic Model

## Media Lifecycle

`Requested → Capturing → Pending → Committing → Persisted`

Cancellation, retake, mode change, validation failure, or commit failure moves non-persisted media to `Disposed`. Deletion of persisted media occurs only when the reference graph shows no active record or archive reference.

## Save Flow

1. Validate capture kind, MIME, configured duration and size policy.
2. Estimate projected storage plus safety reserve.
3. Open a capture lease that owns streams, timers, URLs, and pending Blob.
4. Calculate size and hash, then write descriptor and Blob inside the Unit of Work.
5. Write record metadata referencing the media ID.
6. Commit, transfer ownership to the repository, and close the lease.

## Cleanup

Cleanup is reference-based and idempotent. A cleanup scan reports candidates before deletion and never deletes media referenced by active or legacy-preservation data.
