# 하꾸 Units of Work

## Decomposition Summary

하꾸는 7개 Unit of Work로 분해한다. Unit 1–4와 Unit 7의 PWA 변경은 하나의 React PWA 배포물 안에서 논리 Module로 유지한다. Unit 5와 Unit 6은 각각 독립 배포되는 AI Worker와 Push Worker를 소유한다.

| Unit | Name | Type | Primary Stories |
|---|---|---|---|
| U1 | Domain and Persistence Foundation | PWA Module | US-001, US-004 |
| U2 | Media Lifecycle | PWA Module | US-002, US-003 |
| U3 | Wrap-up, Video, and Archive | PWA Module | US-005, US-006, US-007, US-016 |
| U4 | Backup and Restore | PWA Module | US-008, US-009 |
| U5 | Protected AI | PWA Module + AI Worker Service | US-010 |
| U6 | Secure Push | PWA Module + Push Worker Service | US-011, US-012 |
| U7 | Public Beta Delivery | Cross-cutting PWA and Worker Module | US-013, US-014, US-015, US-017 |

## Shared Unit Rules

- 각 Story는 정확히 하나의 primary Unit에 속한다.
- supporting Unit은 계약이나 통합 작업만 제공하며 Story의 최종 수용 책임은 primary Unit에 있다.
- Unit은 자신의 테스트와 문서를 함께 완료한다.
- 공통 runtime contracts는 U1이 초기 소유하고 변경은 소비 Unit의 계약 테스트와 함께 검토한다.
- React PWA Module 사이에는 런타임 네트워크 호출을 만들지 않는다.
- AI Worker와 Push Worker는 비밀키, state namespace, quota, 배포 권한을 공유하지 않는다.
- Security Baseline 위반은 해당 Unit 완료를 차단한다.
- 선택된 PBT 규칙의 실패 seed와 축소 입력은 Unit CI 증거에 포함한다.

## U1: Domain and Persistence Foundation

### Purpose

모든 후속 Unit이 사용하는 안정적 도메인 타입, 슬롯·일정 순수 함수, runtime contracts, 저장소 포트, 버전형 IndexedDB, 비파괴 마이그레이션을 제공한다.

### Primary Stories

- US-001 기록을 올바른 시간 슬롯에 저장
- US-004 기존 데이터를 안전하게 마이그레이션

### Responsibilities

- `RecordId`, `MediaId`, `ArchiveId`, `SlotId`, `SchemaVersion`과 aggregate 정의
- 슬롯, 세션 경계, 일정 멱등 키를 위한 순수 함수
- 공통 `RuntimeSchema<T>`, API envelope, typed error contract
- Journal, Archive, Settings, Media repository 포트와 Unit of Work 계약
- versioned IndexedDB와 active database pointer
- legacy read-only adapter, ordered migration steps, staging validation
- 앱 composition root와 deterministic clock·ID test port
- Vitest·fast-check 기반 공통 테스트 harness와 generator seed reporting

### In Scope

- 기존 `store.ts`의 타입·시간 계산·저장 계약을 새 경계로 추출
- 기존 데이터의 결정적 ID와 슬롯 변환
- migration 결과의 변환·건너뜀·누락 미디어 보고
- 기존 화면이 새 read model을 점진적으로 사용할 compatibility adapter

### Out of Scope

- 미디어 Blob의 전체 lifecycle 구현
- 실제 영상 생성, 백업 container, AI·Push 네트워크 호출
- UI 시각 변경

### Inputs

- 승인된 Application Design
- 기존 localStorage와 IndexedDB schema
- US-001과 US-004 수용 기준

### Outputs

- 프레임워크 독립 domain과 shared contracts
- versioned repository adapter와 migration runner
- migration report와 compatibility adapter
- 공통 test generator와 PBT 실행 기반

### Completion Criteria

- 13:17 기록이 13:00 슬롯에 결정적으로 배치된다.
- 동일 슬롯 다중 기록과 자정 경계 테스트가 통과한다.
- migration 반복 실행 결과가 동일하다.
- migration 실패 시 legacy source와 active pointer가 변경되지 않는다.
- 새 contract가 TypeScript와 runtime schema 양쪽에서 검증된다.
- Security-05, SECURITY-13, SECURITY-15와 PBT-02, PBT-03, PBT-07–09가 통과한다.

### Construction Stages

- Functional Design: Execute
- NFR Requirements: Execute
- NFR Design: Execute
- Infrastructure Design: Skip
- Code Generation: Execute

## U2: Media Lifecycle

### Purpose

사진, 영상, 음성, 생성 결과를 IndexedDB에 영속화하고 캡처·삭제·재촬영·실패 시 자원과 저장공간을 안전하게 관리한다.

### Primary Stories

- US-002 모든 미디어를 영속 저장
- US-003 미디어 수명과 저장공간을 안전하게 관리

### Responsibilities

- Media Repository의 IndexedDB adapter
- Blob과 descriptor의 해시·크기·MIME 기록
- Media capture lease와 pending media lifecycle
- 저장공간·파일 종류·크기·길이 사전 검사
- reference graph와 고아 Blob 정리
- Object URL, stream, timer, AudioContext 정리
- 저장 실패와 quota 오류의 typed result

### In Scope

- 기존 base64 사진·음성의 신규 저장 경로
- 기존 영상 IndexedDB 참조의 compatibility와 migration 지원
- Record Service와 캡처 화면 adapter
- 실패·취소·재촬영 integration test

### Out of Scope

- 영상 합성 알고리즘
- 완전 백업 container
- AI와 Push

### Inputs

- U1 domain, repository ports, migration hooks, test harness
- 브라우저 Media APIs

### Outputs

- Media Repository adapter
- Browser Media Adapter와 Resource Lease Registry
- Record Service의 media commit·compensation 경로
- storage quota와 orphan cleanup report

### Completion Criteria

- 앱 재시작 뒤 모든 신규 미디어가 재생된다.
- 메타데이터 실패, 취소, 재촬영 후 새 고아 Blob이 없다.
- quota 부족 시 기존 원본을 보존하고 성공을 표시하지 않는다.
- 지원 MIME, 최대 크기·길이, storage estimate 검증이 통과한다.
- SECURITY-05, SECURITY-13, SECURITY-15가 통과한다.

### Construction Stages

- Functional Design: Execute
- NFR Requirements: Execute
- NFR Design: Execute
- Infrastructure Design: Skip
- Code Generation: Execute

## U3: Wrap-up, Video, and Archive

### Purpose

동작하는 마감 선택만 노출하고 모바일에서 안정적으로 영상을 생성한 뒤 방금 생성한 아카이브를 바로 열게 한다.

### Primary Stories

- US-005 동작하는 마감 제어만 사용
- US-006 생성된 아카이브를 즉시 열기
- US-007 모바일에서 안정적으로 하루 영상 생성
- US-016 변경된 사용자 흐름을 접근 가능하게 사용

### Responsibilities

- Wrap-up Service와 화면 adapter
- 동작하는 무드·알림 시점만 유지하고 미연결 제어 숨김
- 720×1280 기본 video profile과 capability preflight
- 준비·인코딩·저장 진행률과 `AbortSignal`
- 생성 Blob과 ArchiveEntry commit
- `ArchiveId` 기반 라우팅과 자동 카드 열기
- 죽은 Wrapped 상태와 임시 URL 제거
- 변경 화면의 semantic control, focus, accessible status

### In Scope

- `WrapUpScreen`, `ArchiveScreen`, 관련 route와 context adapter
- `videoGenerator.ts`, `scenes.ts`의 서비스 포트 연결
- 대표 iOS·Android PWA generation smoke

### Out of Scope

- AI Worker 내부 구현
- Push Worker 내부 구현
- backup container

### Inputs

- U1 domain과 repositories
- U2 media repository와 lease
- U5 AI client contract 또는 local fallback
- U6 Push preferences contract

### Outputs

- 마감부터 아카이브 재생까지 완결된 사용자 흐름
- 영속 생성 영상과 archive metadata
- 모바일 기능 검사, 진행률, 취소·정리

### Completion Criteria

- UI에 보이는 마감 제어가 결과 또는 일정에 반영된다.
- 생성 성공 후 방금 만든 아카이브 카드가 자동으로 열리고 새로고침 후에도 재생된다.
- 실패·취소 시 원본과 기존 아카이브가 유지된다.
- 대표 iOS와 Android PWA에서 기본 profile 생성이 통과한다.
- 변경 화면의 자동·수동 접근성 검사가 통과한다.
- SECURITY-15가 통과한다.

### Construction Stages

- Functional Design: Execute
- NFR Requirements: Execute
- NFR Design: Execute
- Infrastructure Design: Skip
- Code Generation: Execute

## U4: Backup and Restore

### Purpose

전체 저널과 미디어를 암호화된 버전형 파일로 내보내고 악성·손상 입력을 기존 데이터와 격리해 원자적으로 복원한다.

### Primary Stories

- US-008 전체 저널을 검증 가능한 파일로 백업
- US-009 백업을 검증하고 원자적으로 복원

### Responsibilities

- Backup Domain과 container reader·writer port
- snapshot, logical path, manifest, SHA-256
- passphrase 기반 KDF와 AEAD envelope
- entry 수, 크기, 압축 비율, path traversal 제한
- streaming export·restore 진행률과 취소
- staging restore, reference validation, conflict policy
- 반복 restore 멱등성

### In Scope

- 설정, 현재 기록, 아카이브, 감독 메타데이터, 원본과 생성 미디어
- 백업 예상 크기와 범위 UI
- 복원 inspection, warning, result report

### Out of Scope

- 클라우드 계정 동기화
- 원격 backup 저장소

### Inputs

- U1 snapshot·staging·migration
- U2 streaming media read·write
- Browser Crypto Adapter

### Outputs

- versioned encrypted backup format
- Backup Service와 Restore Service
- round-trip, tampering, path, size, compression, idempotency test

### Completion Criteria

- export→delete→restore 후 논리 데이터와 미디어 hash가 동일하다.
- 변조·경로 순회·크기·압축 제한 위반 파일이 commit 전에 거부된다.
- restore 실패 시 active database가 변경되지 않는다.
- 동일 backup 재복원 시 중복이 없다.
- SECURITY-01, SECURITY-05, SECURITY-13, SECURITY-15와 PBT-02, PBT-03, PBT-07–09가 통과한다.

### Construction Stages

- Functional Design: Execute
- NFR Requirements: Execute
- NFR Design: Execute
- Infrastructure Design: Skip
- Code Generation: Execute

## U5: Protected AI

### Purpose

사용자 동의와 데이터 최소화를 보장하고 브라우저 비밀키 없이 설치별 제한이 가능한 AI 연출 기능을 제공한다.

### Primary Stories

- US-010 동의 후 보호된 AI 연출 사용

### Responsibilities

- AI 동의 상태와 고지 버전
- 최소 text·caption DTO와 local direction fallback
- non-extractable installation key와 signed request
- AI Worker 설치 등록, signature, origin, schema, quota 검증
- provider secret, model allowlist, timeout, output schema
- safe log, metric, revocation

### In Scope

- 기존 `llmDirector.ts`의 직접 browser call 제거
- AI client, runtime contract, AI Worker
- preview와 production 환경 분리 설계

### Out of Scope

- 원본 media 업로드
- Push subscription과 schedule

### Inputs

- U1 shared contracts, installation identity port, safe errors
- U7 deployment·observability convention

### Outputs

- AI Direction Service와 local fallback
- 독립 AI Worker Service
- 설치 등록·폐기와 quota contract
- provider·contract·security tests

### Completion Criteria

- 동의 없이는 네트워크 호출이 없다.
- 원본 media와 provider secret이 client 또는 log에 없다.
- signed install request, runtime schema, quota, rate limit, timeout이 적용된다.
- 잘못된 AI output과 외부 실패는 local direction으로 대체된다.
- SECURITY-01, SECURITY-03, SECURITY-05, SECURITY-06, SECURITY-08, SECURITY-11, SECURITY-12, SECURITY-15가 통과한다.

### Construction Stages

- Functional Design: Execute
- NFR Requirements: Execute
- NFR Design: Execute
- Infrastructure Design: Execute
- Code Generation: Execute

## U6: Secure Push

### Purpose

설치가 소유한 Push 구독과 일정만 변경하고 시간대·자정·재시도에서 중복 없이 알림을 전송한다.

### Primary Stories

- US-011 중복 없는 로컬 시간 Push 알림
- US-012 설치가 소유한 Push 설정만 변경

### Responsibilities

- Push schedule domain과 schedule version
- delivery idempotency key와 완료 상태
- browser subscription adapter와 signed Worker client
- 설치 등록, signature, origin, ownership, schema, body limit
- endpoint host allowlist
- Durable Object alarm evaluation, delivery, expired subscription cleanup
- test notification rate limit
- structured safe logs와 metrics

### In Scope

- 기존 `push.ts`, service worker 알림 처리, `push-server/worker.js`
- 60분·120분, before·exact·both, 시간대·자정 테스트
- preview·production Worker·Durable Object namespace 분리

### Out of Scope

- AI provider 호출
- 사용자 계정 시스템

### Inputs

- U1 schedule, shared contracts, installation identity
- U7 deployment·observability convention

### Outputs

- Push Service와 독립 Push Worker Service
- subscription·schedule·test·delete contract
- schedule PBT와 Worker contract·security tests

### Completion Criteria

- 설정한 일정이 시간대와 자정에서 정확하고 중복되지 않는다.
- 다른 설치와 인증되지 않은 변경 요청이 거부된다.
- alarm 재시도와 중복 실행에서 delivery idempotency가 유지된다.
- 만료 구독이 안전하게 정리된다.
- SECURITY-02, SECURITY-03, SECURITY-05, SECURITY-08, SECURITY-11, SECURITY-12, SECURITY-13, SECURITY-15와 PBT-03, PBT-07–09가 통과한다.

### Construction Stages

- Functional Design: Execute
- NFR Requirements: Execute
- NFR Design: Execute
- Infrastructure Design: Execute
- Code Generation: Execute

## U7: Public Beta Delivery

### Purpose

모든 Unit을 보안 헤더, 자동 품질 게이트, 환경 분리, 관측성, 롤백, 접근성·개인정보 문서와 함께 공개 베타로 전달한다.

### Primary Stories

- US-013 안전한 웹·Worker 실행 환경 구성
- US-014 변경을 자동 품질 게이트로 검증
- US-015 관측 가능하고 되돌릴 수 있는 베타 배포
- US-017 베타의 데이터 사용과 한계를 이해

### Responsibilities

- 보안 header를 제공하는 PWA hosting 결정과 구성
- preview·production Worker, state namespace, secret, allowed origin 분리
- lockfile install, typecheck, zero-warning lint, unit·PBT·Worker·backup·browser test, build
- dependency·secret scan, SBOM, pinned CI action
- build·schema version, safe structured log, metrics, alert
- beta token revoke, secret rotation, deployment·rollback runbook
- README, privacy, retention, deletion, platform, license documentation
- iOS·Android release checklist와 accessibility gate

### In Scope

- GitHub workflows와 deployment configuration
- PWA, AI Worker, Push Worker의 통합 release gate
- 운영·개인정보·라이선스 문서

### Out of Scope

- 다중 리전, 계정, 결제, 일반 프로덕션 SLA
- 별도 AI-DLC Operations stage

### Inputs

- U1–U6의 build, schema, tests, deployment artifacts
- 모든 Security Baseline evidence

### Outputs

- 보호된 CI/CD와 환경별 deployment
- security header, observability, alert, rollback
- 사용자·운영 문서와 release evidence

### Completion Criteria

- 모든 차단 CI gate가 통과해야 배포할 수 있다.
- preview와 production 리소스·secret·origin이 분리된다.
- 필수 security header가 실제 응답에서 검증된다.
- 운영자가 token revoke, secret rotation, rollback을 runbook대로 재현한다.
- iOS와 Android 핵심 여정, accessibility, backup, AI, Push smoke가 통과한다.
- SECURITY-01–SECURITY-06, SECURITY-08–SECURITY-15와 적용되는 PBT-02, PBT-03, PBT-07–09가 release evidence에 포함된다.

### Construction Stages

- Functional Design: Standard
- NFR Requirements: Execute
- NFR Design: Execute
- Infrastructure Design: Execute
- Code Generation: Execute

## Unit Ownership

1인 또는 소규모 팀을 기준으로 각 Unit에 한 명의 primary owner를 둔다. 별도 역할이 있으면 Worker reviewer와 release verifier를 추가하되 완료 책임은 primary owner가 유지한다.

| Unit | Primary Ownership | Required Review |
|---|---|---|
| U1 | Domain and data owner | Migration and PBT review |
| U2 | Browser media owner | Storage failure review |
| U3 | Product UI and media owner | Mobile and accessibility review |
| U4 | Data portability owner | Security and integrity review |
| U5 | AI integration owner | Security and privacy review |
| U6 | Push integration owner | Security and schedule review |
| U7 | Release owner | Cross-unit release review |

## Overall Unit Definition of Done

- Unit의 primary Story 수용 기준이 모두 증거와 함께 통과한다.
- 공개 interface와 runtime schema가 문서·타입·테스트에서 일치한다.
- Unit별 Security Baseline과 PBT 차단 규칙이 통과한다.
- 새 lint warning, 미처리 TypeScript 오류, 비밀정보가 없다.
- rollback 또는 실패 안전 경로를 검증한다.
- 다음 Unit이 사용할 output contract와 integration checkpoint가 승인된다.
