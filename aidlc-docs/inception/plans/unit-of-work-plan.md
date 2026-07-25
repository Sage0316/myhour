# 하꾸 Unit of Work Plan

## 목적

승인된 Application Design을 독립적으로 계획·검증 가능한 개발 Unit으로 분해하고, Story 누락 없이 의존 순서를 확정한다.

## Applicability

- **Project Type**: Brownfield
- **Deployable Services**: React PWA, AI Worker, Push Worker
- **Code Organization Question**: Greenfield multi-unit에만 필수이므로 해당 없음. 기존 저장소 구조를 점진적으로 확장한다.

## Part 1 - Planning

- [x] 요구사항, 17개 User Story, Application Design을 검토한다.
- [x] Story affinity와 컴포넌트 경계로 Unit 후보를 식별한다.
- [x] 의존성, 팀, 배포, 도메인 경계 질문을 작성한다.
- [x] 모든 `[Answer]:` 응답을 수집한다.
- [x] 응답의 누락, 모호성, 충돌을 분석한다.
- [x] Unit of Work 계획을 사용자에게 승인받는다.

## Decomposition Questions

## Question 1

17개 Story를 어느 크기의 Unit으로 묶을까요?

A) 설계안의 7개 Unit을 사용한다: 기반, 미디어, 마감·영상, 백업, AI, Push, 베타 배포. (권장)

B) 연관 기능을 합쳐 5개 큰 Unit으로 구성한다.

C) Story와 거의 일대일로 10개 이상의 작은 Unit으로 구성한다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 2

Unit 사이의 구현·통합 순서는 어떻게 운영할까요?

A) 기반 Unit은 순차 진행하고, 기반 완료 후 AI·Push 및 일부 UI Unit을 병렬화하는 hybrid 방식을 사용한다. (권장)

B) 7개 Unit을 전부 순차적으로 진행한다.

C) 공통 계약만 먼저 고정한 뒤 가능한 모든 Unit을 동시에 진행한다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 3

현재 개발 팀 규모를 Unit 소유권에 어떻게 반영할까요?

A) 1인 또는 소규모 팀을 기준으로 Unit별 단일 책임자와 명확한 인수 조건을 둔다. (권장)

B) 프론트엔드, Worker, QA 전담 팀이 있다고 가정하고 Unit을 팀별로 분리한다.

C) 소유권을 정의하지 않고 Story 우선순위에 따라 담당자가 바뀌게 한다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 4

배포 경계와 Unit 경계를 어떻게 맞출까요?

A) React PWA 안의 Unit은 논리 Module로 두고 AI Worker와 Push Worker만 독립 배포 Service로 둔다. (권장)

B) 7개 Unit을 각각 독립 package와 배포 단위로 만든다.

C) PWA와 두 Worker를 하나의 배포 단위로 합친다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 5

공통 runtime contracts와 테스트 기반은 어디에서 소유할까요?

A) 첫 번째 Domain and Persistence Foundation Unit에서 만들고 이후 모든 Unit이 버전형 계약으로 사용한다. (권장)

B) 별도의 Shared Platform Unit을 추가해 8개 Unit으로 구성한다.

C) 각 Unit이 필요한 계약과 테스트 유틸리티를 자체 소유한다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Part 2 - Generation

- [x] 승인된 분해 방식으로 `unit-of-work.md`를 생성한다.
- [x] Unit별 목적, 책임, 포함·제외 범위, 입력·출력, 완료 조건을 정의한다.
- [x] `unit-of-work-dependency.md`에 의존성 행렬과 critical path를 생성한다.
- [x] `unit-of-work-story-map.md`에 17개 Story를 빠짐없이 하나의 primary Unit에 할당한다.
- [x] 교차 Unit Story에는 supporting Unit과 integration checkpoint를 기록한다.
- [x] Security Baseline과 선택된 PBT 규칙을 Unit별로 매핑한다.
- [x] Unit 경계, 순환 의존성, Story 완전성, Markdown·Mermaid를 검증한다.
- [x] 생성된 Unit을 사용자 승인 대상으로 제시한다.

## Mandatory Artifacts

- [x] `aidlc-docs/inception/application-design/unit-of-work.md`
- [x] `aidlc-docs/inception/application-design/unit-of-work-dependency.md`
- [x] `aidlc-docs/inception/application-design/unit-of-work-story-map.md`
- [x] 모든 Story가 정확히 하나의 primary Unit에 할당됨
- [x] Unit 의존성에 순환이 없음
