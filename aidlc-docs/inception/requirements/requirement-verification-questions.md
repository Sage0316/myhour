# iOS 앱스토어 출시 — 요구사항 확인 질문

하꾸를 iOS 앱으로 앱스토어에 유료 출시하기 위한 질문이에요.
각 질문의 `[Answer]:` 뒤에 알파벳을 적어 주세요. 대화에서 이미 정한 건 `[Answer]:`에 미리 채워 두었어요. 맞으면 그대로 두고, 다르면 고쳐 주세요.

---

## 1. 계정과 출시 범위

## Question 1
Apple Developer 계정을 어떤 형태로 만들까요? (개인 계정은 개발자 이름에 본명(영문)이 나와요)

A) 개인 계정으로 바로 시작 (본명 노출, 가장 빠름)

B) 법인을 세운 뒤 조직 계정으로 시작 (회사 이름 노출, D-U-N-S 번호 필요, 시간·비용 더 듦)

C) 개인 계정으로 먼저 출시하고, 나중에 법인으로 앱 이전

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 2
어느 나라 앱스토어에 출시할까요? (EU에서 유료로 팔면 판매자 주소·전화번호·이메일이 앱 페이지에 공개돼요)

A) 한국만

B) EU를 뺀 전 세계

C) EU 포함 전 세계 (판매자 연락처 공개 감수)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 3
지원 기기는요?

A) 아이폰 전용

B) 아이폰 + 아이패드

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## 2. 가격과 유료 범위

## Question 4
가격 구성을 확인해 주세요. (애플 자동 구독에는 15일 주기가 없어서, 15일권은 자동 갱신 없는 1회 이용권으로 만들어요)

A) 3일 무료 체험(한달권 구독에 붙임) + 한달권 5,500원 자동 갱신 구독 + 15일권 3,300원 1회 이용권

B) 3일 무료(결제 수단 등록 없이 앱에서 바로 열어 줌) + 한달권 5,500원 + 15일권 3,300원 — 단, 재설치하면 다시 무료가 되는 구멍이 생겨요

X) Other (please describe after [Answer]: tag below)

[Answer]: A (대화에서 3일 무료 + 15일권 3,300원 + 한달권 5,500원으로 정함 — 체험 방식만 확인)

## Question 5
돈을 내야 쓸 수 있는 기능은 어디까지인가요?

A) 기록하기·오늘·아카이브 보기는 무료, **영상 만들기 + AI 연출**은 유료

B) 기록하기와 영상 만들기(기본 연출)는 무료, **AI 연출**만 유료

C) 앱 전체가 유료 (체험이 끝나면 기록하기도 막힘)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 6
체험이나 이용권이 끝난 뒤, 이미 만든 기록·영상은 어떻게 할까요?

A) 계속 보고 저장(다운로드)할 수 있고, 새로 만드는 것만 막는다

B) 보기는 되지만 저장(다운로드)은 막는다

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## 3. 지금 웹앱(PWA)과의 관계

## Question 7
앱이 나오면 지금 웹 버전(sage0316.github.io/myhour)은 어떻게 할까요? (웹 버전이 계속 무료면 앱 결제를 피해서 웹에서 쓸 수 있어요)

A) 앱 출시 후 웹 버전 종료 (앱 설치 안내 페이지만 남김)

B) 웹 버전은 남기되 AI 연출은 끔 (AI 서버가 앱 요청만 받음)

C) 웹 버전도 그대로 유지 (무료로 열어 둠)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 8
웹 버전에 이미 쌓인 기록을 앱으로 옮길 사람이 있나요?

A) 있다 — 웹에서 백업 내보내기 → 앱에서 가져오기로 옮길 수 있게 한다 (지금 백업 기능 재사용)

B) 없다 — 출시 전이라 옮길 데이터가 없다

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## 4. 기능 변경

## Question 9
기록 시간 알림은 어떻게 할까요?

A) 폰 자체 예약 알림으로 바꾼다 (알림 서버가 필요 없고, 기록 시간이 정해져 있어서 충분함 — 추천)

B) 애플 푸시 서버(APNs)를 붙여 지금처럼 서버에서 보낸다

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 10
디자인 리뉴얼(다꾸 시안)은 언제 넣을까요? (앱스토어 스크린샷이 첫인상이에요)

A) 출시 전에 넣는다 (추천)

B) 지금 디자인으로 먼저 출시하고 업데이트로 넣는다

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 11
결제 확인(구독 상태 확인)은 어떻게 만들까요?

A) RevenueCat 같은 결제 관리 서비스를 쓴다 (빠르고 검증된 방식, 일정 매출까지 무료, 결제 정보가 외부 서비스를 거침)

B) 애플 StoreKit 2를 직접 쓰고, 지금 AI 서버(Cloudflare)에서 영수증을 검증한다 (외부 서비스 없음, 직접 만들 게 많음)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## 5. 앱 정보

## Question 12
앱스토어에 표시할 앱 이름은요?

A) 하꾸

B) 하꾸 - 하루 꾸미기

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 13
앱 고유 ID(번들 ID, 한 번 정하면 못 바꿔요)는요? 보통 갖고 있는 도메인을 거꾸로 써요.

A) `com.hakku.app` 같은 새 이름 (도메인이 없어도 됨, 다른 앱이 이미 쓰고 있으면 바꿔야 함)

B) 갖고 있는 도메인 기반 (Other에 도메인 적어 주세요)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 14
빌드 환경을 확인해 주세요. (2013년형 Mac은 최신 Xcode를 못 깔아서 앱 제출용 빌드를 못 만들어요)

A) GitHub Actions의 Mac 서버로 클라우드 빌드 → TestFlight로 펌킨 폰에서 테스트 (공개 저장소라 무료)

B) 새 Mac(또는 빌려 쓸 Mac)을 쓴다

X) Other (please describe after [Answer]: tag below)

[Answer]: A (대화에서 Windows + 2013년형 Mac만 있다고 확인)
