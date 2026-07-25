# 하꾸 Components

## Design Principles

- 기존 React 화면 구조를 유지하면서 도메인, 저장소, 서비스 경계를 점진적으로 추가한다.
- React Context는 UI 상태 어댑터이며 영속화와 외부 호출의 오케스트레이터가 아니다.
- 브라우저 앱과 Worker는 같은 런타임 계약을 사용하되 배포와 비밀키 권한은 분리한다.
- 모든 쓰기 작업은 명시적 성공 또는 타입이 지정된 실패를 반환한다.
- 마이그레이션과 복원은 staging 저장소에서 검증한 뒤 활성 버전을 원자적으로 전환한다.
- 상세 알고리즘과 비기능 구현 패턴은 Unit별 Functional/NFR Design에서 확정한다.

## Target Source Boundaries

아래 경로는 설계상 목표이며 Code Generation 전까지 실제 소스에는 생성하지 않는다.

| Boundary | Purpose |
|---|---|
| `src/domain/` | 프레임워크 독립 모델, 값 객체, 도메인 오류 |
| `src/contracts/` | 앱·Worker 공통 요청·응답과 런타임 스키마 |
| `src/repositories/` | IndexedDB, 설정, staging 저장소 포트와 어댑터 |
| `src/services/` | 사용자 흐름 오케스트레이션 |
| `src/media/` | 캡처 자원, Blob, 영상 생성 경계 |
| `src/platform/` | Web Crypto, 저장공간, 시간, ID, 기능 감지 |
| `src/adapters/react/` | AppProvider와 화면용 뷰 모델 어댑터 |
| `ai-server/` | AI 전용 Cloudflare Worker |
| `push-server/` | Push 전용 Cloudflare Worker |
| `shared-contracts/` | 앱과 두 Worker가 공유하는 타입·런타임 스키마 |

## Domain Components

### Journal Domain Model

**Purpose**: 기록, 슬롯, 세션, 아카이브, 미디어 참조의 안정적 의미를 정의한다.

**Responsibilities**

- `RecordId`, `MediaId`, `ArchiveId`, `SlotId`, `capturedAt`을 구분한다.
- 동일 슬롯의 여러 기록을 허용한다.
- 로컬 날짜와 시간대가 포함된 세션 경계를 표현한다.
- 스키마 버전과 생성·수정 시각을 모든 영속 aggregate에 포함한다.

**Interfaces**

- `JournalRecord`
- `JournalSession`
- `ArchiveEntry`
- `MediaDescriptor`
- `UserSettings`

### Schedule Domain

**Purpose**: 기록 슬롯과 Push 알림 일정을 외부 시계나 저장소와 분리된 순수 계산으로 제공한다.

**Responsibilities**

- 세션 시작·종료와 자정 경계를 계산한다.
- `before`, `exact`, `both` 알림 시각을 계산한다.
- 설치·일정 버전·슬롯·알림 종류로 멱등 키를 생성한다.
- 60분·120분 간격과 시간대 변환 불변성을 제공한다.

**Interfaces**

- `SlotCalculator`
- `PushScheduleCalculator`
- `DeliveryIdempotencyKey`

### Backup Domain

**Purpose**: 백업 매니페스트, 항목, 해시, 암호화 envelope, 복원 보고서를 정의한다.

**Responsibilities**

- 백업 포맷 버전과 지원 범위를 명시한다.
- 허용된 논리 경로와 항목별 크기·SHA-256을 정의한다.
- 암호화 envelope의 KDF와 AEAD 파라미터를 버전 관리한다.
- 변환, 누락, 충돌, 거부 사유를 구조화한다.

**Interfaces**

- `BackupManifest`
- `BackupEntry`
- `EncryptedBackupEnvelope`
- `RestoreReport`

## Contract Components

### Runtime Contract Registry

**Purpose**: 브라우저 앱, AI Worker, Push Worker가 동일한 타입과 런타임 검증 규칙을 사용하게 한다.

**Responsibilities**

- 요청·응답·오류·버전 스키마를 단일 소스로 정의한다.
- 알 수 없는 필드, 크기 초과, 지원하지 않는 버전을 거부한다.
- 계약을 네트워크와 백업 포맷에서 재사용한다.
- 구체적인 검증 라이브러리는 교체 가능한 `RuntimeSchema<T>` 포트 뒤에 둔다.

**Interfaces**

- `RuntimeSchema<T>`
- `ApiEnvelope<T>`
- `ApiErrorEnvelope`
- AI와 Push별 요청·응답 스키마

### Installation Identity

**Purpose**: 계정이 없는 공개 베타에서 설치별 권한과 회수를 제공한다.

**Responsibilities**

- 브라우저에서 non-extractable 서명 키를 생성·보관한다.
- 운영자가 배포한 beta enrollment credential로 각 Worker에 설치 공개키를 등록한다.
- 요청 본문 해시, 시각, nonce를 포함한 서명을 생성한다.
- Worker별 audience와 권한을 분리하고 설치 폐기를 지원한다.

**Interfaces**

- `InstallationIdentityStore`
- `RequestSigner`
- `SignedRequestHeaders`
- `InstallationRegistration`

## Persistence Components

### Journal Repository

**Purpose**: 세션, 기록, 아카이브, 설정의 버전형 영속화를 제공한다.

**Responsibilities**

- 안정적 ID 기반 조회와 쓰기
- snapshot과 staging database 접근
- 읽기 전용 legacy adapter 제공
- 쓰기 실패와 충돌을 타입이 지정된 오류로 반환

**Interfaces**

- `JournalRepository`
- `ArchiveRepository`
- `SettingsRepository`
- `RepositoryTransaction`

### Media Repository

**Purpose**: 사진, 영상, 음성, 생성 결과 Blob과 메타데이터를 IndexedDB에 저장한다.

**Responsibilities**

- 미디어 ID 기반 put/get/delete
- 스트리밍 가능한 백업 읽기
- 참조 수와 고아 Blob 후보 계산
- 예상 크기와 가용 저장공간 검사

**Interfaces**

- `MediaRepository`
- `MediaLease`
- `StorageQuotaProbe`

### Journal Unit of Work

**Purpose**: 메타데이터와 미디어 변경을 하나의 애플리케이션 커밋으로 조정한다.

**Responsibilities**

- 지원되는 경우 동일 IndexedDB transaction을 사용한다.
- 외부 Blob 준비와 메타데이터 커밋 사이의 보상 정리를 수행한다.
- 영속화 완료 전에 성공을 반환하지 않는다.

**Interfaces**

- `JournalUnitOfWork`
- `CommitResult`
- `CompensationAction`

### Migration Coordinator

**Purpose**: 기존 localStorage와 IndexedDB 데이터를 새 버전으로 비파괴 전환한다.

**Responsibilities**

- legacy source를 읽기 전용으로 연다.
- 순서가 지정된 멱등 migration step을 staging database에 실행한다.
- 참조·해시·필수 필드를 검증한다.
- 검증이 끝난 staging 버전을 활성 포인터로 전환한다.
- 원본은 명시적 정리 전까지 유지한다.

**Interfaces**

- `MigrationCoordinator`
- `MigrationStep`
- `MigrationReport`
- `ActiveDatabasePointer`

## Application Service Components

### Record Service

**Purpose**: 캡처 준비, 슬롯 결정, 미디어·기록 커밋, 삭제를 조정한다.

**Responsibilities**

- 캡처 시작 전에 기능·종류·크기·저장공간을 검사한다.
- 실제 캡처 시각과 표시 슬롯을 별도로 기록한다.
- 실패·취소·재촬영 시 임시 자원을 정리한다.
- 화면에 영속화 결과를 명시적으로 반환한다.

### Wrap-up Service

**Purpose**: 마감 검증, 선택 적용, 영상 생성, 아카이브 저장, 화면 인계를 조정한다.

**Responsibilities**

- 실제 동작하는 선택만 입력으로 받는다.
- AI 폴백과 영상 생성 결과를 조정한다.
- 생성 미디어와 아카이브를 커밋한 뒤 새 세션을 연다.
- 생성된 `ArchiveId`를 반환해 UI가 해당 카드를 연다.

### Video Generation Service

**Purpose**: 브라우저 영상 엔진을 기능 검사, 진행률, 취소, 정리 경계로 감싼다.

**Responsibilities**

- 720×1280 기본 profile을 선택한다.
- 코덱, 캔버스, 오디오, 저장공간을 사전 검사한다.
- 준비·인코딩·저장 단계 진행률을 제공한다.
- `AbortSignal`과 자원 lease를 사용해 실패·취소를 정리한다.

### Backup Service

**Purpose**: 일관된 snapshot을 암호화된 완전 백업으로 내보낸다.

**Responsibilities**

- 설정, 현재 기록, 아카이브, 감독 메타데이터, 모든 미디어를 snapshot으로 읽는다.
- 항목별 크기와 SHA-256을 매니페스트에 기록한다.
- 사용자 passphrase에서 버전형 KDF로 키를 도출하고 AEAD로 보호한다.
- 진행률과 취소를 제공한다.

### Restore Service

**Purpose**: 백업을 제한·검증하고 staging database에 원자적으로 복원한다.

**Responsibilities**

- envelope, KDF, manifest, 경로, 크기, 압축 비율, 해시를 커밋 전에 검증한다.
- 지원되는 스키마 마이그레이션을 staging에 적용한다.
- 기존 데이터를 유지한 채 복원 결과를 검증한다.
- 성공한 staging 버전만 활성화하고 구조화 보고서를 반환한다.

### AI Direction Service

**Purpose**: 동의 상태, 데이터 최소화, 서명 요청, 출력 검증, 로컬 폴백을 조정한다.

**Responsibilities**

- 명시적 동의 없이는 네트워크 호출을 하지 않는다.
- 텍스트와 선택된 캡션만 AI 요청 DTO로 변환한다.
- AI Worker 응답을 런타임 검증한다.
- 모든 외부 실패에서 결정적 로컬 결과를 반환한다.

### Push Service

**Purpose**: 브라우저 Push 구독과 서버 일정 버전을 설치 권한으로 관리한다.

**Responsibilities**

- 권한과 브라우저 기능을 확인한다.
- signed install request로 구독과 일정을 생성·갱신·해지한다.
- 설정 변경마다 일정 버전을 증가시킨다.
- 사용자가 자신의 서버 측 설치 데이터를 삭제할 수 있게 한다.

## Platform Adapter Components

### React App Adapter

**Purpose**: 서비스의 상태와 명령을 React 화면에 노출한다.

**Responsibilities**

- 화면에 필요한 read model과 command만 제공한다.
- 비동기 상태를 `idle`, `pending`, `success`, `error`로 표현한다.
- 저장소, Worker, Web API를 직접 호출하지 않는다.
- 라우팅과 포커스 이동을 서비스 결과에 맞춰 수행한다.

### Browser Media Adapter

**Purpose**: MediaDevices, MediaRecorder, Canvas, AudioContext를 포트로 캡슐화한다.

**Responsibilities**

- 기능 감지와 profile 협상
- stream, timer, Object URL, AudioContext lease 관리
- 테스트용 fake adapter 제공

### Browser Crypto Adapter

**Purpose**: Web Crypto 기반 해시, 서명, KDF, AEAD 기능을 제공한다.

**Responsibilities**

- non-extractable 설치 키 생성
- SHA-256, ECDSA P-256, PBKDF2, AES-GCM 포트 제공
- 키와 원문을 로그에 노출하지 않는다.

## Worker Components

### AI Worker

**Purpose**: AI 공급자 비밀키와 설치별 사용량을 브라우저에서 분리한다.

**Responsibilities**

- 설치 등록과 서명 검증
- 요청 스키마·크기·모델·속도·사용량 제한
- 공급자 타임아웃과 출력 스키마 검증
- 민감정보가 제거된 구조화 로그와 오류

### Push Worker

**Purpose**: 설치가 소유한 구독·일정을 저장하고 멱등적으로 알림을 전송한다.

**Responsibilities**

- 설치 등록, 서명, 소유권, CORS, 입력 검증
- 구독과 일정 버전 저장
- 자정·시간대 기준 일정 평가와 멱등 키 확인
- 지원 Push 호스트 allowlist와 만료 구독 정리
- 전송 결과와 보안 이벤트 로깅

## Existing-to-Target Mapping

| Existing Area | Target Component |
|---|---|
| `store.ts` 모델과 시간 계산 | Journal Domain Model, Schedule Domain |
| `store.ts` localStorage·IndexedDB | Journal Repository, Media Repository, Unit of Work |
| `context.tsx` 직접 영속화 | React App Adapter와 application services |
| `RecordScreen.tsx` 자원 관리 | Record Service와 Browser Media Adapter |
| `WrapUpScreen.tsx` 오케스트레이션 | Wrap-up Service와 Video Generation Service |
| `videoGenerator.ts`, `scenes.ts` | Browser Media Adapter 뒤의 영상 엔진 |
| `SettingsScreen.tsx` 백업 | Backup Service와 Restore Service |
| `llmDirector.ts` 직접 API 호출 | AI Direction Service와 AI Worker |
| `push.ts` | Push Service와 signed Worker client |
| `push-server/worker.js` | 모듈화된 Push Worker |
| `AppProvider` | 화면 read model과 command를 제공하는 React App Adapter |
