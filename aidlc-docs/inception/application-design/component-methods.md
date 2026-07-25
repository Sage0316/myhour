# 하꾸 Component Methods

## Scope

이 문서는 컴포넌트 경계와 상위 메서드 계약을 정의한다. 알고리즘, 재시도 횟수, KDF 파라미터, 데이터베이스 인덱스 등 상세 규칙은 Unit별 Functional/NFR Design에서 확정한다.

## Shared Types

```typescript
type Brand<T, Name extends string> = T & { readonly __brand: Name }

type RecordId = Brand<string, "RecordId">
type MediaId = Brand<string, "MediaId">
type ArchiveId = Brand<string, "ArchiveId">
type InstallationId = Brand<string, "InstallationId">
type SlotId = Brand<string, "SlotId">
type SchemaVersion = Brand<number, "SchemaVersion">

type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E }

interface DomainError {
  code: string
  messageKey: string
  retryable: boolean
  causeId?: string
}

interface ProgressEvent {
  phase: "prepare" | "validate" | "encode" | "write" | "commit"
  completed: number
  total?: number
}
```

## Domain Methods

### SlotCalculator

```typescript
interface SlotCalculator {
  slotFor(input: {
    capturedAt: string
    sessionStart: string
    sessionEnd: string
    intervalMinutes: number
    timeZone: string
  }): Result<SlotId, DomainError>

  enumerateSessionSlots(input: {
    sessionStart: string
    sessionEnd: string
    intervalMinutes: number
    timeZone: string
  }): Result<readonly SlotId[], DomainError>
}
```

### PushScheduleCalculator

```typescript
interface PushScheduleCalculator {
  plannedDeliveries(schedule: PushSchedule): Result<
    readonly PlannedDelivery[],
    DomainError
  >

  idempotencyKey(input: {
    installationId: InstallationId
    scheduleVersion: number
    slotId: SlotId
    notificationKind: "before" | "exact"
  }): string
}
```

### RuntimeSchema

```typescript
interface RuntimeSchema<T> {
  parse(input: unknown): Result<T, ContractValidationError>
  serialize(value: T): unknown
}
```

## Repository Methods

### JournalRepository

```typescript
interface JournalRepository {
  getSession(sessionId: string): Promise<Result<JournalSession | null, DomainError>>
  putSession(
    session: JournalSession,
    transaction?: RepositoryTransaction,
  ): Promise<Result<void, DomainError>>
  listRecords(sessionId: string): Promise<Result<readonly JournalRecord[], DomainError>>
  putRecord(
    record: JournalRecord,
    transaction?: RepositoryTransaction,
  ): Promise<Result<void, DomainError>>
  deleteRecord(
    recordId: RecordId,
    transaction?: RepositoryTransaction,
  ): Promise<Result<void, DomainError>>
  createSnapshot(): Promise<Result<JournalSnapshot, DomainError>>
}
```

### ArchiveRepository

```typescript
interface ArchiveRepository {
  get(archiveId: ArchiveId): Promise<Result<ArchiveEntry | null, DomainError>>
  list(): Promise<Result<readonly ArchiveEntry[], DomainError>>
  put(
    archive: ArchiveEntry,
    transaction?: RepositoryTransaction,
  ): Promise<Result<void, DomainError>>
}
```

### MediaRepository

```typescript
interface MediaRepository {
  put(
    media: MediaWrite,
    transaction?: RepositoryTransaction,
  ): Promise<Result<MediaDescriptor, DomainError>>
  get(mediaId: MediaId): Promise<Result<Blob | null, DomainError>>
  open(mediaId: MediaId): Promise<Result<ReadableStream<Uint8Array>, DomainError>>
  delete(
    mediaId: MediaId,
    transaction?: RepositoryTransaction,
  ): Promise<Result<void, DomainError>>
  describe(mediaId: MediaId): Promise<Result<MediaDescriptor | null, DomainError>>
  listUnreferenced(referenced: ReadonlySet<MediaId>): Promise<
    Result<readonly MediaDescriptor[], DomainError>
  >
  estimateWrite(bytes: number): Promise<Result<StorageEstimate, DomainError>>
}
```

### JournalUnitOfWork

```typescript
interface JournalUnitOfWork {
  execute<T>(
    work: (transaction: RepositoryTransaction) => Promise<Result<T, DomainError>>,
  ): Promise<Result<T, DomainError>>
}
```

### StagingStore

```typescript
interface StagingStore {
  create(version: SchemaVersion): Promise<Result<StagingDatabase, DomainError>>
  validate(database: StagingDatabase): Promise<Result<ValidationReport, DomainError>>
  activate(database: StagingDatabase): Promise<Result<void, DomainError>>
  discard(database: StagingDatabase): Promise<Result<void, DomainError>>
}
```

## Migration Methods

```typescript
interface MigrationStep<From, To> {
  readonly fromVersion: SchemaVersion
  readonly toVersion: SchemaVersion
  migrate(input: From, context: MigrationContext): Promise<Result<To, DomainError>>
}

interface MigrationCoordinator {
  inspect(): Promise<Result<MigrationNeed, DomainError>>
  migrate(options: {
    signal: AbortSignal
    onProgress: (event: ProgressEvent) => void
  }): Promise<Result<MigrationReport, DomainError>>
}
```

## Application Service Methods

### RecordService

```typescript
interface RecordService {
  prepareCapture(input: CaptureIntent): Promise<Result<CapturePermit, DomainError>>
  saveCapture(input: {
    permit: CapturePermit
    capturedAt: string
    media?: PendingMedia
    text?: string
  }): Promise<Result<JournalRecord, DomainError>>
  deleteRecord(recordId: RecordId): Promise<Result<void, DomainError>>
  cancelCapture(permit: CapturePermit): Promise<Result<void, DomainError>>
}
```

### WrapUpService

```typescript
interface WrapUpService {
  preview(sessionId: string): Promise<Result<WrapUpPreview, DomainError>>
  complete(input: {
    sessionId: string
    mood: Mood
    notificationTiming: NotificationTiming
    signal: AbortSignal
    onProgress: (event: ProgressEvent) => void
  }): Promise<Result<{ archiveId: ArchiveId }, DomainError>>
}
```

### VideoGenerationService

```typescript
interface VideoGenerationService {
  inspectCapabilities(): Promise<Result<VideoCapabilities, DomainError>>
  generate(input: {
    records: readonly JournalRecord[]
    direction: DirectorMetadata
    profile?: "mobile-default" | "high-quality"
    signal: AbortSignal
    onProgress: (event: ProgressEvent) => void
  }): Promise<Result<PendingMedia, DomainError>>
}
```

### BackupService

```typescript
interface BackupService {
  estimate(): Promise<Result<BackupEstimate, DomainError>>
  export(input: {
    passphrase: string
    destination: WritableStream<Uint8Array>
    signal: AbortSignal
    onProgress: (event: ProgressEvent) => void
  }): Promise<Result<BackupReceipt, DomainError>>
}
```

### RestoreService

```typescript
interface RestoreService {
  inspect(input: {
    passphrase: string
    source: ReadableStream<Uint8Array>
  }): Promise<Result<BackupInspection, DomainError>>
  restore(input: {
    passphrase: string
    source: ReadableStream<Uint8Array>
    conflictPolicy: "keep-existing" | "replace-by-id"
    signal: AbortSignal
    onProgress: (event: ProgressEvent) => void
  }): Promise<Result<RestoreReport, DomainError>>
}
```

### AIDirectionService

```typescript
interface AIDirectionService {
  getConsent(): Promise<Result<AIConsentState, DomainError>>
  setConsent(consent: AIConsentState): Promise<Result<void, DomainError>>
  createDirection(input: {
    sessionId: string
    locale: string
    signal: AbortSignal
  }): Promise<Result<DirectorMetadata, DomainError>>
}
```

### PushService

```typescript
interface PushService {
  capabilities(): Promise<Result<PushCapabilities, DomainError>>
  enable(input: PushPreferences): Promise<Result<PushState, DomainError>>
  updateSchedule(input: PushPreferences): Promise<Result<PushState, DomainError>>
  sendTest(): Promise<Result<void, DomainError>>
  disable(): Promise<Result<void, DomainError>>
  deleteRemoteInstallation(): Promise<Result<void, DomainError>>
}
```

## Installation Identity Methods

```typescript
interface InstallationIdentityStore {
  get(): Promise<Result<InstallationIdentity | null, DomainError>>
  create(): Promise<Result<InstallationIdentity, DomainError>>
  delete(): Promise<Result<void, DomainError>>
}

interface RequestSigner {
  sign(input: {
    installationId: InstallationId
    audience: "ai-worker" | "push-worker"
    method: string
    path: string
    body: Uint8Array
    timestamp: string
    nonce: string
  }): Promise<Result<SignedRequestHeaders, DomainError>>
}
```

## Client Ports

### AIWorkerClient

```typescript
interface AIWorkerClient {
  enroll(input: InstallationEnrollment): Promise<Result<void, DomainError>>
  direct(
    request: AIDirectionRequest,
    signal: AbortSignal,
  ): Promise<Result<AIDirectionResponse, DomainError>>
  revoke(): Promise<Result<void, DomainError>>
}
```

### PushWorkerClient

```typescript
interface PushWorkerClient {
  enroll(input: InstallationEnrollment): Promise<Result<void, DomainError>>
  upsertSubscription(request: PushSubscriptionRequest): Promise<Result<void, DomainError>>
  upsertSchedule(request: PushScheduleRequest): Promise<Result<void, DomainError>>
  sendTest(requestId: string): Promise<Result<void, DomainError>>
  deleteInstallation(): Promise<Result<void, DomainError>>
}
```

## Browser Adapter Methods

```typescript
interface MediaCapturePort {
  capabilities(): Promise<MediaCaptureCapabilities>
  start(intent: CaptureIntent): Promise<Result<MediaCaptureLease, DomainError>>
}

interface VideoEnginePort {
  capabilities(): Promise<VideoCapabilities>
  render(input: VideoRenderInput): Promise<Result<Blob, DomainError>>
}

interface CryptoPort {
  sha256(input: Uint8Array): Promise<Uint8Array>
  deriveBackupKey(input: BackupKdfInput): Promise<CryptoKey>
  encrypt(input: AeadEncryptInput): Promise<AeadCiphertext>
  decrypt(input: AeadDecryptInput): Promise<Result<Uint8Array, DomainError>>
  createInstallationKey(): Promise<CryptoKeyPair>
  sign(key: CryptoKey, input: Uint8Array): Promise<Uint8Array>
}
```

## Worker Handler Methods

```typescript
interface InstallationVerifier {
  enroll(request: EnrollmentRequest): Promise<Result<InstallationRegistration, ApiError>>
  verify(request: Request): Promise<Result<VerifiedInstallation, ApiError>>
  revoke(installationId: InstallationId): Promise<Result<void, ApiError>>
}

interface RateLimitPort {
  consume(input: {
    installationId?: InstallationId
    ipHash: string
    operation: string
    cost: number
  }): Promise<Result<RateLimitDecision, ApiError>>
}

interface AIProviderPort {
  createDirection(
    request: ProviderDirectionRequest,
    signal: AbortSignal,
  ): Promise<Result<DirectorMetadata, ApiError>>
}

interface PushDeliveryPort {
  send(input: PlannedDelivery): Promise<Result<DeliveryReceipt, ApiError>>
}

interface SafeLogger {
  info(event: SafeLogEvent): void
  warn(event: SafeLogEvent): void
  error(event: SafeLogEvent): void
}
```

## React Adapter Methods

```typescript
interface JournalCommands {
  saveCapture(input: SaveCaptureCommand): Promise<void>
  deleteRecord(recordId: RecordId): Promise<void>
  completeWrapUp(input: CompleteWrapUpCommand): Promise<void>
  exportBackup(input: ExportBackupCommand): Promise<void>
  restoreBackup(input: RestoreBackupCommand): Promise<void>
  updatePush(input: PushPreferences): Promise<void>
}

interface JournalReadModel {
  session: JournalSessionView
  recordsBySlot: ReadonlyMap<SlotId, readonly JournalRecordView[]>
  archives: readonly ArchiveView[]
  operations: Readonly<Record<string, OperationState>>
}
```
