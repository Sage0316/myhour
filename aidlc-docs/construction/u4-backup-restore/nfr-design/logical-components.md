# U4 Logical Components

| Component | NFR Role |
|---|---|
| Envelope Header Parser | Early bounded validation |
| KDF and AEAD Adapter | Confidentiality and authenticity |
| Chunk Reader and Writer | Bounded memory |
| Manifest Validator | Schema, path, size, and hash rules |
| Restore Budget | Entry and expansion limits |
| Staging Importer | Isolation and rollback |
| Reference Auditor | Complete graph validation |
| Round-Trip Property Suite | Reproducible integrity evidence |
