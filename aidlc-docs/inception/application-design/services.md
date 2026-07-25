# 하꾸 Services

## Service Layer Style

하꾸는 가벼운 ports-and-adapters 구조를 사용한다. 서비스는 순수 TypeScript이며 생성자 또는 factory에서 저장소, 외부 클라이언트, 시계, ID, Crypto, 로거 포트를 주입받는다. React Context는 서비스를 호출하고 read model을 화면에 제공하는 어댑터다.

서비스는 다음 원칙을 공유한다.

- 예외를 UI까지 던지는 대신 `Result<T, DomainError>`를 반환한다.
- 사용자 콘텐츠나 비밀정보를 로그에 넣지 않는다.
- 쓰기 성공은 저장소 커밋 후에만 반환한다.
- 모든 장기 작업은 `AbortSignal`과 진행률 callback을 지원한다.
- 네트워크 실패는 로컬 데이터 트랜잭션과 분리한다.
- 재시도 가능한 외부 작업에는 요청 ID와 멱등 키를 사용한다.

## Boot Orchestrator

**Purpose**: 앱 시작 시 저장소 버전, 마이그레이션, 설치 identity, 초기 read model을 준비한다.

**Dependencies**

- Migration Coordinator
- Journal Repository
- Settings Repository
- Installation Identity Store
- Safe local logger

**Flow**

1. 활성 데이터베이스 포인터와 스키마 버전을 읽는다.
2. 마이그레이션이 필요하면 legacy source를 읽기 전용으로 두고 staging migration을 실행한다.
3. staging 참조와 필수 필드를 검증한다.
4. 성공 시 활성 포인터를 전환하고 실패 시 기존 데이터베이스를 유지한다.
5. 설정, 현재 세션, 아카이브 summary를 read model로 로드한다.
6. 서버 기능이 활성화된 경우에만 installation identity를 준비한다.

**Failure Behavior**

- 마이그레이션 실패는 앱의 읽기 가능한 기존 데이터와 복구 안내를 유지한다.
- 복구할 수 없는 미디어 참조는 구조화된 migration report로 표시한다.

## Capture Orchestrator

**Purpose**: 기록 캡처와 영속화를 사용자에게 하나의 원자적 작업으로 보이게 한다.

**Dependencies**

- Slot Calculator
- Record Service
- Browser Media Adapter
- Journal Unit of Work
- Journal Repository
- Media Repository
- Storage Quota Probe

**Flow**

1. 현재 세션과 표시 슬롯으로 capture intent를 만든다.
2. 브라우저 기능, MIME type, 최대 크기·길이, 예상 용량을 검사한다.
3. capture lease를 열고 사용자가 완료·취소·재촬영할 때까지 자원을 소유한다.
4. 실제 `capturedAt`과 표시된 `slotId`를 가진 안정적 `RecordId`를 만든다.
5. 미디어와 메타데이터를 Unit of Work로 커밋한다.
6. 성공 후에만 화면 read model을 갱신한다.

**Compensation**

- 미디어 준비 후 메타데이터 실패 시 새 Blob을 제거한다.
- 취소·재촬영·모드 변경 시 stream, timer, Object URL, 임시 Blob을 해제한다.

## Wrap-up Orchestrator

**Purpose**: 세션 마감부터 새 아카이브 화면 인계까지 조정한다.

**Dependencies**

- Journal Repository
- AI Direction Service
- Video Generation Service
- Media Repository
- Archive Repository
- Journal Unit of Work
- Push Service

**Flow**

1. 실제 저장된 기록 수와 미디어 참조를 검증한다.
2. 무드와 알림 시점처럼 연결된 선택만 입력으로 받는다.
3. 동의된 경우 AI 방향을 요청하고, 실패·거부 시 로컬 방향을 사용한다.
4. 720×1280 기본 profile로 영상을 생성한다.
5. 생성 Blob, 감독 메타데이터, 아카이브를 하나의 commit boundary로 저장한다.
6. 알림 설정이 바뀌면 새 일정 버전을 Push Worker에 반영한다.
7. 로컬 저장이 완료되면 현재 세션을 닫고 새 세션을 연다.
8. 생성된 `ArchiveId`를 UI에 반환해 아카이브 카드가 자동으로 열린다.

**Boundary Rule**

Push 일정 갱신 실패는 이미 저장된 아카이브를 롤백하지 않는다. 대신 사용자가 재시도할 수 있는 별도 오류 상태를 만든다.

## Video Generation Orchestrator

**Purpose**: 브라우저 미디어 엔진의 불안정한 자원을 안전한 애플리케이션 작업으로 감싼다.

**Dependencies**

- Video Engine Port
- Media Repository
- Capability Detector
- Storage Quota Probe
- Resource Lease Registry

**Flow**

1. 코덱, MediaRecorder, Canvas, AudioContext, 저장공간을 검사한다.
2. 기본 profile을 선택하고 고화질 요청은 기능·용량이 충분한 경우만 허용한다.
3. 기록 미디어를 lease로 열고 준비 진행률을 보낸다.
4. 렌더링과 인코딩 진행률을 보낸다.
5. 결과 Blob을 `PendingMedia`로 반환하고 최종 소유권은 Wrap-up Orchestrator가 갖는다.
6. 완료·취소·실패 경로 모두에서 lease를 닫는다.

## Backup Export Orchestrator

**Purpose**: 일관된 전체 저널 snapshot을 검증 가능하고 암호화된 파일로 만든다.

**Dependencies**

- Journal Repository
- Archive Repository
- Media Repository
- Crypto Port
- Backup Container Writer
- Clock

**Flow**

1. 데이터베이스 snapshot과 모든 참조 미디어 목록을 고정한다.
2. 항목 수와 예상 바이트를 계산해 사용자 확인을 받는다.
3. 허용된 논리 경로에 메타데이터와 미디어 entry를 순차 기록한다.
4. 각 항목의 SHA-256과 크기를 매니페스트에 추가한다.
5. 매니페스트와 payload를 사용자 passphrase 기반 AEAD envelope로 보호한다.
6. 목적지 stream이 성공적으로 닫힌 뒤 백업 receipt를 반환한다.

**Security Boundary**

- passphrase와 derived key는 메모리에 필요한 동안만 유지하고 로그·상태 저장소에 기록하지 않는다.
- KDF salt, nonce, 알고리즘 ID, 버전만 평문 envelope header에 둔다.

## Restore Orchestrator

**Purpose**: 외부 파일을 기존 데이터와 분리된 staging database에서 검증하고 복원한다.

**Dependencies**

- Backup Container Reader
- Crypto Port
- Runtime Contract Registry
- Migration Coordinator
- Staging Store
- Journal Repository
- Media Repository

**Flow**

1. 전체 읽기 전에 파일 크기와 envelope header 제한을 검사한다.
2. passphrase로 복호화하고 인증 태그를 검증한다.
3. 매니페스트 스키마, entry 수, 논리 경로, 개별·총 크기, 압축 비율 제한을 검사한다.
4. 각 entry를 streaming hash로 검증하면서 staging database에 쓴다.
5. 필요한 지원 마이그레이션을 staging에서 실행한다.
6. 모든 기록·아카이브·미디어 참조를 검증한다.
7. conflict policy를 적용한 결과 summary를 사용자에게 보여준다.
8. 확인 후 staging을 활성화한다.

**Failure Behavior**

어느 단계에서든 실패하면 staging을 삭제하고 활성 데이터베이스 포인터를 변경하지 않는다.

## AI Direction Orchestrator

**Purpose**: AI 호출을 선택적이며 개인정보 최소화된 기능으로 제공한다.

**Dependencies**

- AI Consent Store
- Session Summary Builder
- Installation Identity
- Request Signer
- AI Worker Client
- Runtime Contract Registry
- Local Direction Engine

**Flow**

1. 동의 상태와 현재 고지 버전을 확인한다.
2. 동의가 없으면 로컬 방향을 반환한다.
3. 사용자 입력 텍스트와 명시적으로 선택된 캡션만 요약 DTO에 넣는다.
4. 요청 ID, timestamp, nonce, body hash를 설치 키로 서명한다.
5. AI Worker 응답을 런타임 스키마로 검증한다.
6. 타임아웃, 제한, 공급자 오류, 잘못된 응답에서는 로컬 방향을 반환한다.

**Worker Flow**

1. 명시된 origin, 본문 크기, 계약 버전을 검사한다.
2. 설치 서명, timestamp, nonce, audience, 폐기 상태를 검증한다.
3. 설치·IP·operation별 제한과 beta quota를 적용한다.
4. 허용 모델과 고정된 system prompt로 공급자를 호출한다.
5. 공급자 응답을 허용 목록 기반 스키마로 변환한다.
6. 요청 ID와 비민감 운영 필드만 구조화 로그에 남긴다.

## Push Orchestrator

**Purpose**: 브라우저 구독과 서버 일정이 설치 소유권과 일정 버전으로 일치하도록 한다.

**Dependencies**

- Browser Push Adapter
- Schedule Domain
- Installation Identity
- Request Signer
- Push Worker Client
- Push Preferences Repository

**Browser Flow**

1. PWA 설치·권한·PushManager 기능을 확인한다.
2. 사용자 동작에서만 알림 권한을 요청한다.
3. 브라우저 구독을 생성하고 endpoint host를 client-side에서 1차 검사한다.
4. signed request로 구독과 일정 버전을 Worker에 upsert한다.
5. 서버 성공 후 로컬 Push 상태를 갱신한다.

**Scheduled Worker Flow**

1. 설치별 Durable Object에서 활성 구독과 최신 일정 버전을 읽는다.
2. alarm 시각에 schedule calculator로 예정 알림을 계산한다.
3. 멱등 키가 이미 완료되었는지 확인한다.
4. 허용된 HTTPS push host에만 암호화된 payload를 전송한다.
5. 성공 상태를 기록하고 만료 응답은 구독을 정리한다.
6. 재시도 가능한 실패와 영구 실패를 구분해 구조화 로그와 지표를 남긴다.

## Remote Data Deletion Orchestrator

**Purpose**: 사용자가 계정 없이도 설치 단위 서버 데이터를 삭제하게 한다.

**Flow**

1. AI와 Push Worker에 각각 signed revoke/delete 요청을 보낸다.
2. Worker는 installation public key와 소유권을 확인하고 관련 Durable Object의 quota, nonce, schedule, subscription을 삭제 또는 폐기 표시한다.
3. 두 Worker 결과를 사용자에게 개별 표시한다.
4. 원격 삭제가 확인된 뒤 로컬 설치 credential을 제거한다.

## Observability Service

**Purpose**: 사용자 콘텐츠 없이 운영 상태와 보안 이벤트를 진단한다.

**Allowed Fields**

- timestamp
- request ID
- installation ID의 단방향 운영 식별자
- build·schema version
- operation name
- status class와 safe error code
- duration, byte bucket, rate-limit decision

**Forbidden Fields**

- AI 입력·출력 본문
- 기록, 캡션, 미디어
- 비밀키, passphrase, 서명 원문
- 전체 Push endpoint
- beta enrollment credential

## Error Taxonomy

| Category | Examples | User Behavior | Operator Behavior |
|---|---|---|---|
| Validation | 잘못된 백업, 지원하지 않는 MIME | 입력 수정 안내 | 집계만 기록 |
| Storage | quota, transaction abort | 기존 데이터 보존, 정리 안내 | 기기 로컬이므로 원문 로그 없음 |
| Capability | 코덱·Push 미지원 | 대안 또는 기능 비활성화 | 지원 매트릭스 갱신 |
| Authorization | 서명·소유권·등록 실패 | 재등록 또는 지원 안내 | 보안 이벤트와 제한 |
| Rate Limit | AI·Push 제한 | 재시도 가능 시각 안내 | quota·남용 지표 |
| External | AI 공급자·Push provider 실패 | 로컬 폴백 또는 재시도 | 오류율 경보 |
| Integrity | 해시·참조·migration 검증 실패 | 활성 데이터 보존 | 릴리스 차단 또는 복구 절차 |
| Internal | 예상하지 못한 오류 | safe error ID 제공 | 상세 원인은 보호된 운영 로그 |
