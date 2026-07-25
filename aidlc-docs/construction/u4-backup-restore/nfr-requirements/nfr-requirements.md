# U4 NFR Requirements

| Area | Requirement |
|---|---|
| Confidentiality | Backup payload is passphrase-encrypted with versioned KDF and AEAD parameters. |
| Integrity | Every entry has SHA-256 and the encrypted envelope is authenticated. |
| Capacity | Import maximum 4 GiB, 20,000 entries, 100:1 expansion ratio, with lower device limits allowed by preflight. |
| Memory | Entries process as bounded streams or chunks; no full-archive memory load. |
| Reliability | Restore commits only by staging activation; failure leaves active data unchanged. |
| Idempotency | Re-import of identical backup produces no duplicate stable IDs. |
| Responsiveness | Byte progress at least every 500 ms and cancellation before activation. |
| Security | Reject traversal, absolute and duplicate paths, unsupported algorithms, versions, sizes, ratios, and hashes. |

Remote backup availability is out of scope.
