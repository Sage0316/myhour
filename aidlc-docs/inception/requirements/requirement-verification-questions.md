# 하꾸 개선 요구사항 확인 질문

현재 분석 범위는 슬롯 정합성, 푸시 알림, 미디어 저장, 백업, AI 보안, 접근성, 오프라인 지원, CI/CD를 포함합니다. 각 질문의 `[Answer]:` 뒤에 선택한 문자를 입력해 주세요.

## Question 1

이번 개선 작업의 1차 범위를 어디까지로 정할까요?

A) P0 안정화만 수행: 슬롯 불일치, 알림 중복, 작동하지 않는 UI, 저장공간 누수와 관련 테스트

B) P0와 P1을 함께 수행: 안정화에 더해 AI 키 보안, Push API 보호, 완전한 백업, 상태 구조, CI/CD까지 포함

C) P0부터 P2까지 전부 수행: 접근성, 오프라인, 대용량 에셋 최적화와 저장소 문서까지 포함

X) Other (please describe after `[Answer]:` tag below)

[Answer]: B

## Question 2

하꾸의 다음 배포 목표는 무엇인가요?

A) 본인만 사용하는 개인용 프로토타입

B) 소수 사용자를 받는 공개 베타

C) 일반 사용자가 신뢰하고 사용할 수 있는 프로덕션 서비스

X) Other (please describe after `[Answer]:` tag below)

[Answer]: B

## Question 3

기존 사용자 기기에 저장된 기록과 설정을 어떻게 처리해야 하나요?

A) 자동 마이그레이션으로 기존 데이터를 모두 보존해야 함

B) 가능한 데이터는 보존하되, 복구할 수 없는 미디어가 있으면 사용자에게 명확히 알림

C) 아직 사용자가 없으므로 데이터 초기화를 허용함

X) Other (please describe after `[Answer]:` tag below)

[Answer]: B

## Question 4

하루 마감 직후의 사용자 경험은 어떤 형태가 맞나요?

A) 생성 결과를 즉시 보여주는 Wrapped 홈 화면으로 이동한 뒤 사용자가 아카이브로 이동

B) 현재처럼 바로 아카이브로 이동하되, 생성된 날짜 카드를 자동으로 열어 결과 표시

C) 바로 아카이브 목록으로 이동하고 기존 `HomeWrapped` 코드는 제거

X) Other (please describe after `[Answer]:` tag below)

[Answer]: B

## Question 5

화면에 보이지만 현재 동작하지 않는 설정과 조절 기능은 어떻게 할까요?

A) 이모지, 차분함, 출력 비율, 알림 시점, BGM 설정을 모두 실제 동작에 연결

B) 1차 릴리스에서 필요한 기능만 연결하고 나머지는 UI에서 숨김

C) 복잡도를 낮추기 위해 해당 사용자 조절 기능을 모두 제거하고 자동값만 사용

X) Other (please describe after `[Answer]:` tag below)

[Answer]: B

## Question 6

미디어 저장과 백업 수준은 어디까지 필요하나요?

A) 사진·영상·음성을 IndexedDB에 안전하게 저장하고, 아카이브와 모든 미디어를 하나의 백업 파일로 내보내고 복원

B) 미디어 저장 누수만 해결하고, 백업은 텍스트·설정·아카이브 메타데이터까지만 지원

C) 미디어는 기기 로컬에만 유지하고 백업 기능은 현재 세션과 설정 수준으로 유지

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 7

Anthropic AI 기능의 운영 방식을 선택해 주세요.

A) Cloudflare Worker 프록시를 추가하고 서버 측 비밀키, 요청 제한, 사용량 제한을 적용

B) 개인용 앱으로 유지하고 사용자가 자신의 API 키를 입력하는 현재 방식을 유지하되 위험 안내와 키 삭제 UX를 강화

C) 외부 AI 호출을 제거하고 로컬 규칙 기반 제목·무드·BGM만 사용

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 8

Push 알림 기능의 우선순위는 무엇인가요?

A) 이번 범위에 포함해 Worker를 배포하고 중복 방지, 인증, 입력 검증, 시간대·자정 테스트까지 완료

B) 알림 계산과 보안 코드는 고치되 실제 Worker 배포는 다음 단계로 연기

C) 현재 릴리스에서는 Push 기능과 설정 UI를 제거

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 9

공식 지원 플랫폼 범위를 선택해 주세요.

A) iOS 16.4 이상 홈 화면 PWA만 공식 지원

B) iOS와 Android 모바일 PWA를 공식 지원

C) iOS, Android, 데스크톱 브라우저까지 공식 지원

X) Other (please describe after `[Answer]:` tag below)

[Answer]: B

## Question 10

영상 생성 성능의 우선 기준은 무엇인가요?

A) 화질 우선: 1080x1920을 유지하고 기기 성능이 낮으면 명시적으로 경고

B) 안정성 우선: 기본 720x1280과 낮은 비트레이트를 사용하고 고화질은 선택사항으로 제공

C) 적응형: 기기 성능과 저장공간을 감지해 해상도와 비트레이트를 자동 선택

X) Other (please describe after `[Answer]:` tag below)

[Answer]: B

## Question 11

보안 확장 규칙을 적용할까요?

A) Yes - 모든 Security Baseline 규칙을 차단 조건으로 적용

B) No - 개인용 프로토타입으로 간주하고 Security Baseline을 적용하지 않음

X) Other (please describe after `[Answer]:` tag below)

[Answer]: A

## Question 12

복원력 확장 규칙을 적용할까요?

A) Yes - 장애 허용, 관측성, 복구 가능성을 포함한 Resiliency Baseline을 설계 지침으로 적용

B) No - 신속한 프로토타이핑을 위해 Resiliency Baseline을 적용하지 않음

X) Other (please describe after `[Answer]:` tag below)

[Answer]: B

## Question 13

속성 기반 테스트 확장 규칙을 적용할까요?

A) Yes - 스케줄, 자정 경계, 저장/복원, 데이터 변환 전반에 Property-Based Testing 규칙 적용

B) Partial - 순수 함수, 스케줄 계산, 백업 직렬화 왕복에만 적용

C) No - 예제 기반 단위·통합 테스트만 사용

X) Other (please describe after `[Answer]:` tag below)

[Answer]: B

## Question 14

1차 개선 완료를 판단하는 가장 중요한 성공 기준은 무엇인가요?

A) 기존 핵심 사용자 흐름에서 데이터가 사라지거나 잘못 표시되는 결함이 없음

B) 공개 베타에 필요한 보안·백업·알림·자동 배포까지 모두 갖춤

C) 모바일에서 영상 생성 성공률과 체감 성능을 최우선으로 개선

X) Other (please describe after `[Answer]:` tag below)

[Answer]: B
