# 하꾸 Story Generation Plan

## 목적

승인된 공개 베타 요구사항을 사용자 가치 중심의 작은 이야기와 검증 가능한 수용 기준으로 전환한다. 구현 일정이나 스프린트 계획은 이 문서의 범위가 아니다.

## 입력 자료

- 승인된 종합 요구사항
- 역공학 결과와 코드 품질 평가
- Security Baseline 전체 적용 결정
- Property-Based Testing 부분 적용 결정

## Part 1 - Planning

- [x] 승인된 요구사항과 역공학 결과를 검토한다.
- [x] User Stories 실행 필요성을 평가하고 근거를 문서화한다.
- [x] 이야기 분해 방식의 선택지와 장단점을 정의한다.
- [x] 페르소나, 세분화, 형식, 수용 기준에 관한 질문을 작성한다.
- [x] 모든 `[Answer]:` 응답을 수집한다.
- [x] 응답의 누락, 모호성, 충돌을 분석하고 필요하면 후속 질문을 작성한다.
- [x] 선택된 이야기 생성 방법을 사용자에게 승인받는다.

## 이야기 분해 선택지

| 방식 | 장점 | 주의점 |
|---|---|---|
| 사용자 여정 기반 | 기록부터 마감·복원까지 실제 흐름을 이해하기 쉽다. | Worker·CI 같은 지원 작업의 위치가 불명확할 수 있다. |
| 기능 기반 | 저장, 백업, AI, Push처럼 소유 영역이 선명하다. | 사용자에게 전달되는 전체 가치가 분절될 수 있다. |
| 페르소나 기반 | 사용자와 운영자의 책임을 명확히 나눈다. | 공통 기능이 중복될 수 있다. |
| 도메인 기반 | 기록·미디어·운영 경계와 잘 맞는다. | 작은 프로젝트에는 구조가 무거울 수 있다. |
| Epic 기반 | 큰 범위와 하위 이야기를 함께 추적하기 쉽다. | Epic만 남으면 이야기가 구현 가능한 크기가 되지 않을 수 있다. |
| 여정·기능 혼합 | 사용자 여정을 중심으로 하되 보안·운영 지원 이야기를 별도로 관리한다. | 분류 규칙을 명확히 유지해야 한다. |

## 계획 질문

## Question 1

하꾸 이야기를 어떤 방식으로 묶을까요?

A) 사용자 여정과 기능을 혼합한다. 기록→마감→아카이브→복원의 흐름을 중심에 두고 AI, Push, 운영은 별도 지원 Epic으로 둔다. (권장)

B) 저장, 백업, 영상, AI, Push, 운영 같은 기능별 Epic으로만 묶는다.

C) Journal User와 Beta Operator 페르소나별로 묶는다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 2

이야기의 크기를 어느 수준으로 만들까요?

A) 하나의 Pull Request에서 구현·검증 가능한 작은 수직 이야기로 나눈다. (권장)

B) 여러 Pull Request를 포함할 수 있는 넓은 기능 이야기로 작성한다.

C) Epic은 넓게 두고 하위 이야기는 하나의 Pull Request 크기로 나눈다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 3

수용 기준은 어떤 형식으로 작성할까요?

A) Given/When/Then 시나리오와 정량적 품질 조건을 함께 사용한다. (권장)

B) 간결한 확인 목록만 사용한다.

C) 정상 흐름은 확인 목록, 오류·경계 흐름은 Given/When/Then으로 작성한다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 4

페르소나는 어떻게 구성할까요?

A) Journal User를 주 페르소나로, Beta Operator를 보조 페르소나로 유지한다. (권장)

B) Journal User만 정식 페르소나로 두고 운영 작업은 기술 지원 항목으로 처리한다.

C) Journal User와 Beta Operator를 동등한 주 페르소나로 둔다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 5

보안, 마이그레이션, CI처럼 직접 화면에 드러나지 않는 작업을 어떻게 표현할까요?

A) 사용자 안전·데이터 보존·운영 신뢰성이라는 결과에 연결된 별도 지원 이야기로 작성한다. (권장)

B) 사용자 이야기의 수용 기준에만 포함하고 별도 이야기는 만들지 않는다.

C) 사용자 이야기와 기술 Enabler를 구분해 두 종류로 작성한다.

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Part 2 - Generation

- [x] 승인된 방식에 따라 `personas.md`를 생성한다.
- [x] 요구사항을 Epic과 작은 사용자 이야기로 분해해 `stories.md`를 생성한다.
- [x] 각 이야기를 Independent, Negotiable, Valuable, Estimable, Small, Testable 기준으로 점검한다.
- [x] 각 이야기에 페르소나, 가치, 수용 기준, 요구사항 추적성을 포함한다.
- [x] Security Baseline과 선택된 Property-Based Testing 규칙의 적용 여부를 이야기별로 확인한다.
- [x] 모든 생성 파일의 Markdown 구조와 내용을 검증한다.
- [x] 생성된 이야기와 페르소나를 사용자 승인 대상으로 제시한다.

## 필수 산출물

- [x] `aidlc-docs/inception/user-stories/stories.md`
- [x] `aidlc-docs/inception/user-stories/personas.md`
- [x] 모든 이야기에 INVEST 점검 결과 포함
- [x] 모든 이야기에 수용 기준 포함
- [x] 모든 이야기를 관련 페르소나와 연결
