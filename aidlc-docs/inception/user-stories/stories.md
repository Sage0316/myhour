# 하꾸 User Stories

## Story Model

- **Organization**: 사용자 여정을 중심으로 하고 AI, Push, 운영은 지원 Epic으로 분리한다.
- **Granularity**: 각 이야기는 하나의 Pull Request에서 구현하고 검증 가능한 크기를 목표로 한다.
- **Acceptance Criteria**: Given/When/Then 시나리오와 정량적 조건을 함께 사용한다.
- **Personas**: Journal User가 주 페르소나이며 Beta Operator가 지원 페르소나다.
- **Scope**: 공개 베타를 위한 P0·P1 요구사항.

## Epic 1: 신뢰할 수 있는 기록 기반

### US-001 기록을 올바른 시간 슬롯에 저장

**Persona**: Journal User  
**Story**: 사용자는 실제 캡처 시각과 표시되는 슬롯을 모두 보존하고 싶다. 그래야 기록이 올바른 타임라인에 나타나고 같은 슬롯의 여러 순간도 잃지 않는다.  
**Value**: 기록 누락과 덮어쓰기를 막고 타임라인에 대한 신뢰를 회복한다.

**Acceptance Criteria**

1. Given 현재 슬롯이 13:00일 때, When 13:17에 기록을 저장하면, Then `slotId`는 13:00이고 `capturedAt`은 실제 캡처 시각이다.
2. Given 같은 슬롯에 기존 기록이 있을 때, When 새 기록을 추가하면, Then 서로 다른 안정적 ID를 가진 두 기록이 모두 표시된다.
3. Given 세션이 자정을 지날 때, When 기록을 추가하면, Then 사용자의 로컬 날짜와 세션 규칙에 따라 결정적으로 분류된다.
4. 렌더링 키와 조회 키는 배열 인덱스나 현재 시각을 사용하지 않는다.

**Traceability**: FR-001, NFR-003, NFR-005  
**Extensions**: PBT-03 일정·ID 불변성, PBT-07 경계값 생성기, PBT-08 seed 재현, PBT-09 Vitest+fast-check  
**INVEST Check**: Independent, Negotiable, Valuable, Estimable, Small, Testable 모두 충족.

### US-002 모든 미디어를 영속 저장

**Persona**: Journal User  
**Story**: 사용자는 앱을 닫았다가 다시 열어도 사진, 영상, 음성, 생성 결과가 남아 있기를 원한다.  
**Value**: 메모리 URL과 브라우저 세션 수명에 의한 데이터 손실을 제거한다.

**Acceptance Criteria**

1. Given 지원되는 미디어를 캡처했을 때, When 저장이 완료되면, Then Blob은 타입이 지정된 IndexedDB 저장소에 있고 메타데이터는 안정적 미디어 ID를 참조한다.
2. Given 앱을 다시 시작했을 때, When 기록이나 아카이브를 열면, Then 모든 저장 미디어가 재생된다.
3. Given Blob 쓰기가 실패했을 때, When 저장 흐름이 종료되면, Then UI는 성공으로 표시하지 않고 원본 상태를 보존한다.
4. `localStorage`에는 설정과 작은 메타데이터만 저장한다.

**Traceability**: FR-002, NFR-003, NFR-005, NFR-007  
**Extensions**: SECURITY-13 데이터 무결성, SECURITY-15 실패 안전 예외 처리  
**INVEST Check**: 저장소 경계 하나에 집중하며 독립적으로 검증 가능하므로 모두 충족.

### US-003 미디어 수명과 저장공간을 안전하게 관리

**Persona**: Journal User  
**Story**: 사용자는 저장공간 부족이나 재촬영 때문에 기존 기록이 손상되지 않기를 원한다.  
**Value**: 고아 Blob, 무제한 WAV, 조용한 저장 실패로 인한 기기 저장공간 고갈을 방지한다.

**Acceptance Criteria**

1. Given 재촬영, 모드 변경, 기록 삭제 또는 캡처 취소가 발생했을 때, When 참조가 사라지면, Then 참조되지 않는 Blob과 Object URL이 정리된다.
2. Given 저장공간이 부족할 때, When 새 캡처를 시작하면, Then 크기·종류·가용 공간을 검사하고 기존 원본을 삭제하지 않은 채 안내한다.
3. Given 메타데이터 커밋이 실패했을 때, When 롤백이 실행되면, Then 새 고아 Blob이 남지 않는다.
4. 오디오와 영상 캡처에는 공개 베타용 최대 길이와 크기 제한이 적용된다.

**Traceability**: FR-002, NFR-003, NFR-004  
**Extensions**: SECURITY-05 입력 크기 검증, SECURITY-15 자원 정리와 실패 안전  
**INVEST Check**: 미디어 수명 관리라는 단일 사용자 가치에 집중해 모두 충족.

### US-004 기존 데이터를 안전하게 마이그레이션

**Persona**: Journal User  
**Story**: 기존 사용자는 앱이 업데이트되어도 가능한 기록을 자동으로 보존하고 복구 불가능한 항목을 이해하고 싶다.  
**Value**: 스키마 변경 때문에 기존 저널을 잃는 위험을 줄인다.

**Acceptance Criteria**

1. Given 이전 스키마 데이터가 있을 때, When 새 버전을 처음 실행하면, Then 순서가 지정된 마이그레이션이 안정적 ID와 새 참조 구조를 생성한다.
2. Given 같은 마이그레이션을 반복할 때, When 두 번째 실행이 끝나면, Then 첫 번째 완료 상태와 동일하다.
3. Given 변환 중 오류가 발생할 때, When 마이그레이션이 중단되면, Then 원본은 보존되고 부분 상태가 활성 데이터로 확정되지 않는다.
4. 변환, 건너뜀, 누락 미디어 수와 복구 불가능한 항목을 사용자에게 보고한다.

**Traceability**: FR-003, NFR-003, NFR-005  
**Extensions**: SECURITY-13 무결성, SECURITY-15 실패 안전, PBT-02 마이그레이션 왕복, PBT-03 멱등성, PBT-07–09  
**INVEST Check**: 마이그레이션과 보고에 한정된 작은 수직 흐름으로 모두 충족.

## Epic 2: 믿을 수 있는 하루 마감

### US-005 동작하는 마감 제어만 사용

**Persona**: Journal User  
**Story**: 사용자는 마감 화면에서 선택한 항목이 실제 결과에 반영된다고 믿고 싶다.  
**Value**: 아무 효과가 없는 UI가 만드는 혼란과 신뢰 저하를 제거한다.

**Acceptance Criteria**

1. Given 마감 화면을 열었을 때, Then 무드와 알림 시점처럼 실제 연결된 제어만 표시된다.
2. Given 무드를 바꿨을 때, When 결과를 생성하면, Then 정의된 결과 메타데이터 또는 연출에 반영된다.
3. Given 알림 시점을 바꿨을 때, When 마감을 확정하면, Then 저장되는 Push 일정에 반영된다.
4. 이모지, 차분함, 출력 비율, 수동 BGM처럼 미연결 옵션은 화면과 접근성 트리에서 숨긴다.
5. 표시되는 기록 수와 빈 상태는 실제 저장 데이터와 일치한다.

**Traceability**: FR-005, NFR-008  
**Extensions**: SECURITY-15 저장 실패 시 성공 표시 금지  
**INVEST Check**: 마감 제어의 진실성에 집중하고 UI 테스트가 가능하므로 모두 충족.

### US-006 생성된 아카이브를 즉시 열기

**Persona**: Journal User  
**Story**: 사용자는 마감 직후 방금 만든 아카이브와 영상을 바로 확인하고 싶다.  
**Value**: 죽은 Wrapped 상태와 불명확한 화면 전환을 하나의 예측 가능한 여정으로 정리한다.

**Acceptance Criteria**

1. Given 마감 저장이 성공했을 때, When 아카이브로 이동하면, Then 방금 생성한 날짜 카드가 자동으로 열린다.
2. Given 방금 생성한 카드가 열렸을 때, Then 아카이브 ID를 사용해 영속 저장된 영상을 재생한다.
3. Given 직접 URL을 새로고침했을 때, Then 같은 아카이브를 다시 열 수 있다.
4. 사용하지 않는 `HomeWrapped`, `setWrapped`, 임시 `videoUrl` 상태가 제거되고 Object URL이 해제된다.

**Traceability**: FR-006, NFR-003, NFR-007  
**Extensions**: SECURITY-15 자원 정리  
**INVEST Check**: 화면 인계와 재조회라는 완결된 사용자 가치로 모두 충족.

### US-007 모바일에서 안정적으로 하루 영상 생성

**Persona**: Journal User  
**Story**: 사용자는 자신의 모바일 기기에서 원본을 잃지 않고 하루 영상을 생성하고 싶다.  
**Value**: 공개 베타의 핵심 결과물을 iOS와 Android에서 신뢰할 수 있게 만든다.

**Acceptance Criteria**

1. Given 지원되는 기기와 혼합 미디어 기록이 있을 때, When 기본 생성을 시작하면, Then 720×1280과 보수적인 비트레이트로 완료된다.
2. Given 시작 전 검사에서 코덱, 저장공간, 오디오 또는 캔버스 기능이 부족할 때, Then 작업을 시작하지 않고 가능한 대안을 안내한다.
3. Given 생성 중일 때, Then 준비·인코딩·저장 단계별 진행률과 취소를 제공한다.
4. Given 취소 또는 실패가 발생했을 때, Then 타이머, 스트림, Object URL, 임시 Blob을 정리하고 원본과 기존 아카이브를 보존한다.
5. 생성 결과는 앱 재시작 후 재생되며 대표 iOS와 Android PWA 스모크 테스트를 통과한다.

**Traceability**: FR-007, NFR-003, NFR-004, NFR-005  
**Extensions**: SECURITY-15 자원 정리와 오류 처리  
**INVEST Check**: 기본 모바일 생성 경로에 한정하며 명확한 기기 검증이 가능해 모두 충족.

## Epic 3: 사용자가 소유하는 저널 데이터

### US-008 전체 저널을 검증 가능한 파일로 백업

**Persona**: Journal User  
**Story**: 사용자는 설정, 기록, 아카이브, 원본과 생성 미디어를 하나의 완전한 백업으로 보관하고 싶다.  
**Value**: 실제로 복구할 수 있는 사용자 소유 데이터 사본을 제공한다.

**Acceptance Criteria**

1. Given 백업을 시작할 때, Then 예상 크기와 포함 범위를 먼저 표시한다.
2. When 내보내기가 완료되면, Then 버전형 컨테이너에 설정, 현재 기록, 아카이브, 감독 메타데이터, 원본과 생성 미디어가 포함된다.
3. 매니페스트에는 스키마 버전, 파일 목록, 바이트 크기, 콘텐츠 해시가 있다.
4. 대용량 내보내기는 진행률과 취소를 제공하며 실패 시 불완전 파일을 성공으로 표시하지 않는다.

**Traceability**: FR-004, NFR-002, NFR-003, NFR-004  
**Extensions**: SECURITY-13 해시 기반 무결성, SECURITY-15 실패 안전, PBT-02 백업 직렬화 왕복, PBT-07–09  
**INVEST Check**: 내보내기 경로만 다루며 독립적인 왕복 테스트가 가능해 모두 충족.

### US-009 백업을 검증하고 원자적으로 복원

**Persona**: Journal User  
**Story**: 사용자는 손상되거나 악의적인 백업이 기존 기록을 망가뜨리지 않도록 안전하게 복원하고 싶다.  
**Value**: 백업 기능의 실제 복구 가능성과 가져오기 보안을 보장한다.

**Acceptance Criteria**

1. Given 유효한 백업이 있을 때, When 로컬 데이터를 삭제한 뒤 가져오면, Then 논리 데이터와 미디어 해시가 내보내기 전과 같다.
2. Given 변조된 해시, 지원하지 않는 스키마, 경로 순회 또는 압축 폭탄 위험이 있을 때, When 가져오면, Then 커밋 전에 거부된다.
3. Given 복원 중 오류가 발생할 때, Then 기존 데이터는 그대로 유지된다.
4. Given 같은 백업을 다시 가져올 때, Then 안정적 ID 기준으로 중복이 생기지 않는다.
5. 복원 UI는 진행률, 누락 항목, 충돌, 최종 결과를 명확히 보여준다.

**Traceability**: FR-004, NFR-003, NFR-005  
**Extensions**: SECURITY-05 입력 검증, SECURITY-13 무결성, SECURITY-15 실패 안전, PBT-02 복원 왕복, PBT-03 멱등성, PBT-07–09  
**INVEST Check**: 가져오기와 원자적 커밋에 한정되어 모두 충족.

## Epic 4: 안전한 AI와 정확한 알림

### US-010 동의 후 보호된 AI 연출 사용

**Persona**: Journal User  
**Story**: 사용자는 어떤 데이터가 AI로 전송되는지 알고 동의한 경우에만 연출 추천을 받고 싶다.  
**Value**: 브라우저 비밀키를 제거하면서 선택 가능한 AI 가치를 유지한다.

**Acceptance Criteria**

1. Given AI를 처음 사용할 때, Then 전송되는 텍스트 필드, 공급자, 목적, 보존 범위를 설명하고 명시적 동의를 받는다.
2. Given 동의하지 않았거나 Worker 호출이 실패했을 때, Then 로컬 규칙 기반 연출을 사용한다.
3. When AI를 호출하면, Then 원본 사진·영상·음성은 전송하지 않고 명시적으로 선택한 텍스트와 캡션만 보낸다.
4. Worker는 설치 단위 회수 가능 토큰, 요청·응답 스키마, 본문 크기, 모델 허용 목록, 타임아웃, 속도·사용량 한도를 적용한다.
5. AI 출력은 스키마 검증 후 사용하며 공급자 비밀키는 클라이언트 번들, 저장소, 로그, 오류에 존재하지 않는다.

**Traceability**: FR-008, NFR-001, NFR-002, NFR-003  
**Extensions**: SECURITY-01, SECURITY-03, SECURITY-05, SECURITY-06, SECURITY-08, SECURITY-11, SECURITY-12, SECURITY-15  
**INVEST Check**: 동의부터 안전한 대체 결과까지 하나의 사용자 흐름으로 모두 충족.

### US-011 중복 없는 로컬 시간 Push 알림

**Persona**: Journal User  
**Story**: 사용자는 설정한 간격과 시점에 자신의 시간대 기준으로 알림을 한 번만 받고 싶다.  
**Value**: 중복 알림과 자정·시간대 오류를 제거한다.

**Acceptance Criteria**

1. Given 60분 또는 120분 간격과 `before`, `exact`, `both` 설정이 있을 때, When 일정을 계산하면, Then 예상 로컬 시각과 정확히 일치한다.
2. Given Cron이 재시도되거나 겹칠 때, When 같은 슬롯 알림을 평가하면, Then 설치·일정 버전·슬롯·종류 멱등 키로 한 번만 전송한다.
3. Given 시간대나 일정 설정이 바뀔 때, When 새 일정을 저장하면, Then 이전 버전은 더 이상 전송되지 않는다.
4. Given 구독이 만료되거나 일정이 없을 때, Then 안전하게 정리되고 추가 전송을 시도하지 않는다.

**Traceability**: FR-009, NFR-003, NFR-005  
**Extensions**: SECURITY-13 일정 상태 무결성, SECURITY-15 실패 처리, PBT-03 경계·정렬·중복 없음 불변성, PBT-07–09  
**INVEST Check**: 일정 계산과 멱등 전송에 집중하며 결정적 테스트가 가능해 모두 충족.

### US-012 설치가 소유한 Push 설정만 변경

**Persona**: Beta Operator  
**Story**: 운영자는 각 설치가 자기 Push 구독과 일정만 안전하게 관리하도록 하고 싶다.  
**Value**: 알림 스팸, 다른 설치 데이터 변경, 공개 테스트 엔드포인트 남용을 방지한다.

**Acceptance Criteria**

1. Given 인증되지 않거나 다른 설치의 토큰을 사용한 요청일 때, When 구독·해지·테스트·일정 변경을 호출하면, Then 안전한 오류로 거부된다.
2. 모든 변경 요청은 서버 측 소유권 검증, 엄격한 스키마, 본문 크기, 속도 제한을 통과해야 한다.
3. CORS는 명시된 미리보기·프로덕션 출처만 허용한다.
4. Push 엔드포인트는 지원되는 HTTPS 공급자 호스트만 허용하며 사용자 입력에 따른 임의 서버 요청을 하지 않는다.
5. 오류와 로그는 내부 구현, 토큰, 전체 Push 엔드포인트를 노출하지 않는다.

**Traceability**: FR-010, NFR-001, NFR-002  
**Extensions**: SECURITY-02, SECURITY-03, SECURITY-05, SECURITY-08, SECURITY-11, SECURITY-12, SECURITY-15  
**INVEST Check**: Push API 접근 경계 하나를 강화하며 계약 테스트가 가능해 모두 충족.

## Epic 5: 공개 베타 운영 준비

### US-013 안전한 웹·Worker 실행 환경 구성

**Persona**: Beta Operator  
**Story**: 운영자는 브라우저와 Worker가 최소 권한과 안전한 기본 설정으로 실행되기를 원한다.  
**Value**: XSS, 프레임 삽입, 환경 간 데이터 혼용, 과도한 권한 위험을 낮춘다.

**Acceptance Criteria**

1. 프로덕션 응답은 CSP, HSTS, `X-Content-Type-Options`, 프레임 제한, Referrer Policy를 제공한다.
2. 현재 정적 호스팅에서 필수 헤더를 보장할 수 없으면 이를 지원하는 호스팅으로 이전한다.
3. AI와 Push Worker는 미리보기·프로덕션별 KV, 비밀키, 허용 출처, 배포 권한을 분리한다.
4. 외부 통신은 TLS를 사용하고 Worker별로 필요한 최소 리소스만 접근한다.
5. 안전하지 않은 런타임 옵션과 상세 내부 오류는 프로덕션에서 비활성화한다.

**Traceability**: FR-011, NFR-001  
**Extensions**: SECURITY-01, SECURITY-04, SECURITY-06, SECURITY-09, SECURITY-12  
**INVEST Check**: 실행 환경의 보안 설정에 한정되며 헤더·권한 검사로 검증 가능해 모두 충족.

### US-014 변경을 자동 품질 게이트로 검증

**Persona**: Beta Operator  
**Story**: 운영자는 검증되지 않은 변경이 공개 베타에 배포되지 않기를 원한다.  
**Value**: 현재 성공하는 빌드를 유지하면서 회귀와 공급망 위험을 조기에 차단한다.

**Acceptance Criteria**

1. Pull Request와 보호된 브랜치에서 잠금 파일 기반 설치, TypeScript, 경고 0개의 Oxlint, 단위·Worker·백업·브라우저 테스트, 프로덕션 빌드를 실행한다.
2. Vitest와 fast-check가 일정, ID, 마이그레이션, 백업 왕복·불변성 테스트를 실행하고 실패 seed와 축소 입력을 남긴다.
3. 의존성·비밀 탐지와 SBOM 생성을 실행한다.
4. 배포 액션과 외부 CI 액션은 검토된 고정 버전 또는 커밋을 사용한다.
5. 핵심 검사가 실패하면 병합과 프로덕션 배포가 차단된다.

**Traceability**: FR-012, NFR-001, NFR-007  
**Extensions**: SECURITY-10, SECURITY-13, PBT-02, PBT-03, PBT-07, PBT-08, PBT-09  
**INVEST Check**: CI 품질 게이트라는 독립 가치로 모두 충족.

### US-015 관측 가능하고 되돌릴 수 있는 베타 배포

**Persona**: Beta Operator  
**Story**: 운영자는 사용자 콘텐츠를 보지 않고도 장애를 발견하고 검증된 버전으로 되돌리고 싶다.  
**Value**: 소규모 운영에서도 보안 이벤트와 장애에 일관되게 대응할 수 있다.

**Acceptance Criteria**

1. 배포물과 로그에 빌드 버전과 스키마 버전이 포함된다.
2. Worker는 인증 실패, 속도 제한, AI 오류율, Push 실패율을 구조화하고 민감정보 없이 중앙 기록한다.
3. 정의된 임계치를 넘으면 운영 경보가 발생하고 보안 이벤트 로그는 90일 보관을 목표로 한다.
4. 운영 문서대로 설치 토큰 회수, 비밀키 교체, 장애 확인, 이전 버전 롤백을 재현할 수 있다.
5. 프로덕션 배포는 보호된 브랜치와 승인된 워크플로에서만 실행된다.

**Traceability**: FR-011, NFR-006, NFR-007  
**Extensions**: SECURITY-02, SECURITY-03, SECURITY-06, SECURITY-13, SECURITY-14, SECURITY-15  
**INVEST Check**: 배포 관측과 롤백 흐름으로 범위가 명확하고 운영 리허설로 검증 가능해 모두 충족.

### US-016 변경된 사용자 흐름을 접근 가능하게 사용

**Persona**: Journal User  
**Story**: 사용자는 보조 기술이나 키보드를 사용해도 기록, 마감, 복원 흐름을 완료하고 싶다.  
**Value**: 핵심 기능을 특정 입력 방식에 제한하지 않는다.

**Acceptance Criteria**

1. 변경된 버튼, 아이콘, 진행 상태, 대화상자에는 의미 있는 접근성 이름과 역할이 있다.
2. 대화상자를 열고 닫을 때 포커스가 예측 가능하게 이동하고 원래 제어로 돌아온다.
3. 기록 삭제와 필수 동작은 길게 누르기에만 의존하지 않고 보이는 대안을 제공한다.
4. 자동 접근성 검사와 대표 수동 키보드·스크린리더 점검이 릴리스 체크에 포함된다.

**Traceability**: NFR-008, FR-005, FR-007  
**Extensions**: SECURITY-15 오류 상태를 접근 가능하게 전달  
**INVEST Check**: 변경 표면에 한정된 접근성 가치이며 자동·수동 검증이 가능해 모두 충족.

### US-017 베타의 데이터 사용과 한계를 이해

**Persona**: Journal User  
**Story**: 사용자는 설치 전에 지원 플랫폼, 저장 위치, 권한, AI 전송, 삭제와 백업 범위를 이해하고 싶다.  
**Value**: 공개 베타의 기대 수준과 개인정보 선택을 투명하게 만든다.

**Acceptance Criteria**

1. README와 제품 내 안내에 지원 플랫폼, 로컬 우선 저장, 필요한 권한, 오프라인 한계, 알려진 제한이 있다.
2. 개인정보 안내에 AI 전송 필드, Push 서버 저장 필드, 보존·삭제 방법이 있다.
3. 사용자는 로컬 데이터와 서버 측 설치 데이터를 삭제할 수 있다.
4. 번들 BGM, 글꼴, 기타 미디어의 라이선스와 출처가 기록된다.
5. 백업 범위와 복원 전 검증 동작을 사용자 문서에서 확인할 수 있다.

**Traceability**: FR-013, NFR-002, NFR-005  
**Extensions**: SECURITY-12 자격증명 안내, SECURITY-14 지원 가능한 이벤트 정보  
**INVEST Check**: 공개 베타 투명성이라는 명확한 사용자 가치로 모두 충족.

## Requirements Coverage

| Requirement | Stories |
|---|---|
| FR-001 | US-001 |
| FR-002 | US-002, US-003 |
| FR-003 | US-004 |
| FR-004 | US-008, US-009 |
| FR-005 | US-005 |
| FR-006 | US-006 |
| FR-007 | US-007 |
| FR-008 | US-010 |
| FR-009 | US-011 |
| FR-010 | US-012 |
| FR-011 | US-013, US-015 |
| FR-012 | US-014 |
| FR-013 | US-017 |
| NFR-001–NFR-007 | US-002–US-015, US-017 |
| NFR-008 | US-005, US-016 |

## Extension Compliance Summary

### Security Baseline

| Rule | Status | Story Coverage |
|---|---|---|
| SECURITY-01 | Compliant | US-010, US-013 |
| SECURITY-02 | Compliant | US-012, US-015 |
| SECURITY-03 | Compliant | US-010, US-012, US-015 |
| SECURITY-04 | Compliant | US-013 |
| SECURITY-05 | Compliant | US-003, US-009, US-010, US-012 |
| SECURITY-06 | Compliant | US-010, US-013, US-015 |
| SECURITY-07 | N/A | VPC, subnet, firewall, network ACL 구성요소가 없다. |
| SECURITY-08 | Compliant | US-010, US-012 |
| SECURITY-09 | Compliant | US-013 |
| SECURITY-10 | Compliant | US-014 |
| SECURITY-11 | Compliant | US-010, US-012 |
| SECURITY-12 | Compliant | US-010, US-012, US-013, US-017 |
| SECURITY-13 | Compliant | US-002, US-004, US-008, US-009, US-011, US-014, US-015 |
| SECURITY-14 | Compliant | US-015, US-017 |
| SECURITY-15 | Compliant | US-002–US-013, US-015, US-016 |

적용 가능한 모든 Security Baseline 규칙이 이야기와 수용 기준에 연결되었으며 차단 항목은 없다.

### Property-Based Testing

| Rule | Status | Story Coverage |
|---|---|---|
| PBT-02 | Compliant | US-004, US-008, US-009, US-014 |
| PBT-03 | Compliant | US-001, US-004, US-009, US-011, US-014 |
| PBT-07 | Compliant | US-001, US-004, US-008, US-009, US-011, US-014 |
| PBT-08 | Compliant | US-001, US-004, US-008, US-009, US-011, US-014 |
| PBT-09 | Compliant | US-001, US-004, US-008, US-009, US-011, US-014 |

선택한 부분 적용 범위의 모든 차단 규칙이 이야기와 CI 검증에 연결되었다. Resiliency Baseline은 비활성화되어 적용하지 않았다.
