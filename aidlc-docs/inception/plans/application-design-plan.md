# 하꾸 Application Design Plan

## 목적

승인된 요구사항과 User Stories를 구현 가능한 컴포넌트, 인터페이스, 서비스, 의존성으로 구체화한다. 상세 알고리즘과 소스 구현은 이후 단계의 범위다.

## Design Scope

- 브라우저 도메인 모델과 상태 경계
- IndexedDB 미디어 저장소와 마이그레이션
- 마감·영상·아카이브 오케스트레이션
- 백업·복원 서비스
- AI와 Push의 클라이언트·Worker 계약
- 공개 베타 품질·보안·관측성 경계

## Plan

- [x] 요구사항, User Stories, 역공학 결과와 실행 계획을 검토한다.
- [x] 기존 컴포넌트와 새 컴포넌트 후보를 식별한다.
- [x] 설계 선택이 필요한 경계를 질문으로 정리한다.
- [x] 모든 `[Answer]:` 응답을 수집한다.
- [x] 응답의 누락, 모호성, 충돌을 분석한다.
- [x] 승인된 선택을 기준으로 컴포넌트와 인터페이스를 설계한다.
- [x] `components.md`에 컴포넌트 정의와 상위 책임을 생성한다.
- [x] `component-methods.md`에 메서드 시그니처와 입출력 타입을 생성한다.
- [x] `services.md`에 서비스와 오케스트레이션 패턴을 생성한다.
- [x] `component-dependency.md`에 의존성 행렬, 통신 패턴, 데이터 흐름을 생성한다.
- [x] `application-design.md`에 전체 설계를 통합한다.
- [x] Markdown, Mermaid, 추적성, Security Baseline, PBT 적용을 검증한다.
- [x] 완성된 Application Design을 사용자 승인 대상으로 제시한다.

## Design Questions

## Question 1

현재 `store.ts`와 `context.tsx`에 모인 책임을 어떤 방식으로 분리할까요?

A) 현재 React 구조는 유지하면서 `domain`, `repositories`, `services` 경계를 점진적으로 추가한다. (권장)

B) 상태 관리 라이브러리를 도입하고 저장·서비스 구조를 전면 재편한다.

C) 파일 구조는 유지하고 기존 `store.ts` 안에서 기능만 추가한다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 2

브라우저 앱과 Cloudflare Worker의 요청·응답 계약은 어떻게 공유할까요?

A) 런타임 검증 가능한 공통 TypeScript 스키마를 두고 앱과 Worker가 함께 사용한다. (권장)

B) 타입만 공유하고 런타임 검증은 각 Worker에서 별도로 구현한다.

C) 앱과 Worker가 독립적인 타입과 검증 코드를 유지한다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 3

서비스 오케스트레이션과 테스트 가능성은 어떤 패턴으로 확보할까요?

A) 순수 TypeScript 서비스에 저장소와 외부 클라이언트 인터페이스를 주입하고 React Context는 화면 어댑터 역할만 한다. (권장)

B) React Context가 저장소와 외부 호출을 직접 조정한다.

C) 이벤트 버스 중심으로 모든 컴포넌트를 느슨하게 연결한다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 4

AI와 Push의 Cloudflare Worker 경계는 어떻게 구성할까요?

A) 비밀키, KV, 사용량, 배포 권한을 분리하기 위해 별도 Worker로 유지한다. (권장)

B) 하나의 Worker와 라우터로 합치고 내부 모듈만 분리한다.

C) Push Worker는 유지하고 AI는 다른 관리형 백엔드로 둔다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 5

기존 로컬 데이터에서 새 스키마로 전환하는 방식은 무엇이 적합할까요?

A) 이전 데이터를 읽기 전용으로 보존한 채 새 저장소에 변환·검증한 뒤 원자적으로 활성 버전을 전환한다. (권장)

B) 앱 시작 시 기존 데이터를 제자리에서 직접 수정한다.

C) 사용자가 백업한 뒤 명시적으로 초기화하고 새 스키마를 사용한다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Mandatory Artifacts

- [x] `aidlc-docs/inception/application-design/components.md`
- [x] `aidlc-docs/inception/application-design/component-methods.md`
- [x] `aidlc-docs/inception/application-design/services.md`
- [x] `aidlc-docs/inception/application-design/component-dependency.md`
- [x] `aidlc-docs/inception/application-design/application-design.md`
