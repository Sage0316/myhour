# 하꾸 Component Dependencies

## Dependency Rules

1. Domain은 React, IndexedDB, Cloudflare, Media APIs에 의존하지 않는다.
2. Application services는 포트 인터페이스에만 의존한다.
3. Browser와 Worker adapter가 포트를 구현한다.
4. React 화면은 application services와 read model만 사용한다.
5. AI Worker와 Push Worker는 배포, 비밀키, 저장소, quota를 공유하지 않는다.
6. 공통 runtime contracts는 도메인 payload와 오류 envelope만 공유하며 Worker 구현을 공유하지 않는다.

## Dependency Matrix

`Uses`는 행 컴포넌트가 열 컴포넌트의 공개 인터페이스에 의존함을 뜻한다.

| From / To | Domain | Contracts | Repositories | Media Ports | Crypto Port | AI Client | Push Client | React Adapter |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| React Screens |  |  |  |  |  |  |  | Uses |
| React Adapter | Uses |  |  |  |  |  |  |  |
| Application Services | Uses | Uses | Uses | Uses | Uses | Uses | Uses |  |
| Repository Adapters | Uses |  |  |  |  |  |  |  |
| Browser Media Adapters | Uses |  |  |  |  |  |  |  |
| Browser Crypto Adapter |  |  |  |  |  |  |  |  |
| AI Worker Client |  | Uses |  |  | Uses |  |  |  |
| Push Worker Client |  | Uses |  |  | Uses |  |  |  |
| AI Worker |  | Uses |  |  |  |  |  |  |
| Push Worker | Uses | Uses |  |  |  |  |  |  |

## Browser Component Graph

```mermaid
flowchart TD
    Screens["React Screens"]
    ReactAdapter["React App Adapter"]
    Services["Application Services"]
    Domain["Domain and Schedule"]
    Contracts["Runtime Contracts"]
    JournalRepo["Journal Repository"]
    MediaRepo["Media Repository"]
    BrowserMedia["Browser Media Adapter"]
    BrowserCrypto["Browser Crypto Adapter"]
    AIClient["AI Worker Client"]
    PushClient["Push Worker Client"]
    IndexedDB["Versioned IndexedDB"]
    AIWorker["AI Worker"]
    PushWorker["Push Worker"]

    Screens --> ReactAdapter
    ReactAdapter --> Services
    Services --> Domain
    Services --> Contracts
    Services --> JournalRepo
    Services --> MediaRepo
    Services --> BrowserMedia
    Services --> BrowserCrypto
    Services --> AIClient
    Services --> PushClient
    JournalRepo --> IndexedDB
    MediaRepo --> IndexedDB
    AIClient --> AIWorker
    PushClient --> PushWorker
```

Text alternative: React screens call a React adapter, which delegates commands to application services. Services use pure domain logic, runtime contracts, repositories, browser media and crypto ports, plus AI and Push clients. Journal and media repositories share a versioned IndexedDB. Network clients call separate AI and Push Workers.

## Worker Component Graph

```mermaid
flowchart LR
    AIRequest["AI Request"]
    AIVerifier["AI Install Verifier"]
    AILimiter["AI Quota and Rate Limit"]
    AIProvider["AI Provider Adapter"]
    AILog["Safe AI Logger"]
    AIStore["AI Install Store"]

    PushRequest["Push Request"]
    PushVerifier["Push Install Verifier"]
    PushScheduler["Schedule Evaluator"]
    PushSender["Push Sender"]
    PushLog["Safe Push Logger"]
    PushStore["Push Install and Schedule Store"]

    AIRequest --> AIVerifier
    AIVerifier --> AIStore
    AIVerifier --> AILimiter
    AILimiter --> AIProvider
    AIProvider --> AILog

    PushRequest --> PushVerifier
    PushVerifier --> PushStore
    PushStore --> PushScheduler
    PushScheduler --> PushSender
    PushSender --> PushLog
```

Text alternative: The AI Worker verifies an installation, checks its own store and quota, calls the AI provider, and emits safe logs. The Push Worker independently verifies an installation, reads its own subscription and schedule store, evaluates deliveries, sends to allowed push providers, and emits safe logs.

## Data Flow: Record Commit

```mermaid
sequenceDiagram
    participant UI as React Screen
    participant RS as Record Service
    participant MP as Media Repository
    participant UOW as Journal Unit of Work
    participant JR as Journal Repository
    participant DB as IndexedDB

    UI->>RS: saveCapture
    RS->>MP: prepare media write
    RS->>UOW: execute commit
    UOW->>MP: put media
    MP->>DB: write blob and descriptor
    UOW->>JR: put stable record
    JR->>DB: write record metadata
    DB-->>UOW: transaction committed
    UOW-->>RS: committed record
    RS-->>UI: success
```

Text alternative: Record Service prepares media, then uses a Unit of Work to write the Blob and stable record metadata in IndexedDB. The UI receives success only after the transaction commits.

## Data Flow: Non-Destructive Migration

```mermaid
sequenceDiagram
    participant Boot as Boot Orchestrator
    participant Legacy as Legacy Read-Only Adapter
    participant MC as Migration Coordinator
    participant Stage as Staging Database
    participant Active as Active Database Pointer

    Boot->>MC: inspect and migrate
    MC->>Legacy: read old data
    MC->>Stage: transform records and media refs
    MC->>Stage: validate schema and references
    Stage-->>MC: validation report
    MC->>Active: switch active version
    MC-->>Boot: migration report
```

Text alternative: Migration Coordinator reads legacy data without modifying it, writes transformed data to staging, validates schema and references, then switches the active database pointer only after validation.

## Data Flow: Backup and Restore

```mermaid
sequenceDiagram
    participant User as Journal User
    participant Backup as Backup Service
    participant Repo as Repositories
    participant Crypto as Crypto Port
    participant Restore as Restore Service
    participant Stage as Staging Database

    User->>Backup: export with passphrase
    Backup->>Repo: create consistent snapshot
    Backup->>Crypto: hash entries and encrypt envelope
    Backup-->>User: encrypted backup
    User->>Restore: import with passphrase
    Restore->>Crypto: decrypt and authenticate
    Restore->>Stage: stream validated entries
    Restore->>Stage: validate references
    Stage-->>Restore: valid report
    Restore-->>User: activate restored data
```

Text alternative: Export reads a consistent snapshot, hashes entries, and encrypts the container. Restore authenticates and decrypts the container, streams validated entries to staging, validates all references, and activates only a valid result.

## Data Flow: Signed Worker Request

```mermaid
sequenceDiagram
    participant App as PWA Client
    participant Key as Non-Extractable Install Key
    participant Worker as AI or Push Worker
    participant Verify as Install Verifier
    participant Store as Worker Store

    App->>Key: sign method path timestamp nonce body hash
    Key-->>App: request signature
    App->>Worker: request plus signed headers
    Worker->>Verify: validate origin signature time nonce audience
    Verify->>Store: check installation and revocation
    Store-->>Verify: active installation
    Verify-->>Worker: verified identity
    Worker-->>App: versioned response envelope
```

Text alternative: The PWA signs request metadata with a non-extractable installation key. The target Worker validates origin, signature, time, nonce, audience, installation status, and revocation before handling the versioned request.

## API Communication Patterns

### AI Worker

| Operation | Pattern | Contract |
|---|---|---|
| Installation enrollment | Request-response | One-time beta credential plus public key |
| Direction generation | Signed request-response | Minimal text and selected captions |
| Installation revoke | Signed idempotent command | Installation audience and request ID |

### Push Worker

| Operation | Pattern | Contract |
|---|---|---|
| Installation enrollment | Request-response | One-time beta credential plus public key |
| Subscription upsert | Signed idempotent command | Browser subscription with supported HTTPS host |
| Schedule upsert | Signed versioned command | Time zone, interval, timing, schedule version |
| Test notification | Signed rate-limited command | Request ID |
| Installation delete | Signed idempotent command | Removes or revokes owned resources |
| Durable Object alarm | Scheduled internal command | Latest schedule and delivery idempotency key |

## Coupling Controls

- 서비스는 global singleton을 직접 import하지 않고 composition root에서 포트를 받는다.
- Worker DTO는 domain aggregate 전체를 전송하지 않는다.
- UI read model은 영속 모델과 분리해 migration 시 화면 결합을 줄인다.
- 영상 엔진은 repository를 직접 알지 않고 전달받은 media lease만 사용한다.
- backup container는 저장소 내부 key path를 노출하지 않고 논리 경로를 사용한다.
- Worker safe error code는 내부 예외 종류와 일대일 대응하지 않는다.
