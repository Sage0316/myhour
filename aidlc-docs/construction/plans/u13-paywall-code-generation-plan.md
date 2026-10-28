# U13 결제·페이월 — 코드 생성 계획 (2026-10-28 승인, 코드 생성 완료 · 결제 연결은 계정 생긴 뒤)

## 사용자가 정한 상품 (2026-10-28 질문 1~6 답변)
| 항목 | 결정 |
|---|---|
| 방식 | 한달 자동 갱신 구독 두 단계 (같은 구독 그룹) |
| Standard | 월 3,300원 · 한 결제 기간에 영상 15개 · 하루 최대 1개 |
| Premium | 월 5,500원 · 매일 영상 1개 |
| 1번 기준 | 하루 마감해서 영상 1개를 만들면 1번. 다시 연출 3번은 그 1개 안에 포함 |
| 무료 체험 | 두 요금제 모두 3일 무료 (애플 첫 구독 혜택, 한 사람당 한 번) |
| 구독 없을 때 | 기록·아카이브·이미 만든 영상은 무료. 영상 만들기(AI 연출 포함)를 누르면 결제 화면 |
| Standard 소진 | 다음 결제일(갱신일)에 15개로 다시 채움. 소진 뒤에는 Premium 안내 |

## 기술 선택
- 결제 연동: **RevenueCat** (`@revenuecat/purchases-capacitor`). 월 매출 2,500달러까지 무료. 영수증 검증·구독 상태·갱신일·체험 자격을 대신 관리해 준다.
  - 앱 사용자 ID = 기존 AI 서버 설치 ID(installationId). 앱을 지웠다 깔면 "구매 복원"으로 새 ID에 구독을 옮긴다.
- 상품 ID: `com.hakku.app.standard.monthly`, `com.hakku.app.premium.monthly` / RevenueCat 권한(entitlement): `standard`, `premium`
- 키가 없을 때(지금): 결제 기능은 "준비 중" 상태로 동작하고, 웹 버전은 지금처럼 제한 없이 쓴다.

## 단계 (모두 완료)
1. **이용권 판정 로직** `src/billing/access.ts` (순수 함수 + 속성 테스트)
   - 입력: 구독 상태(없음/standard/premium, 현재 결제 기간 시작·끝), 이번 기간에 영상 만든 날짜들, 오늘 날짜
   - 출력: 허용 / 결제 필요 / Standard 소진(다음 충전일) / 오늘 이미 만듦
2. **결제 연결 계층** `src/billing/purchases.ts`
   - 앱: RevenueCat 초기화, 상품·가격 불러오기(가격은 애플이 주는 현지 가격 그대로 표시), 구매, 구매 복원, 상태 변화 구독
   - 웹/키 없음: 결제 없음 상태
3. **결제 화면(페이월)** `src/screens/PaywallScreen.tsx` — 다꾸 디자인
   - 두 요금제 카드(Standard / Premium), "3일 무료로 시작하기", 체험 후 가격·자동 갱신 안내 문구(애플 필수), 구매 복원, 이용약관·개인정보처리방침 링크(애플 필수)
4. **연결 지점**
   - 하루 마감 → 영상 만들기 / AI 연출 버튼 앞에서 판정 → 필요하면 결제 화면
   - 설정에 "구독" 칸: 현재 요금제, Standard 남은 개수·충전일, 구독 관리(애플 구독 관리 화면 열기), 구매 복원
   - 기존 기기 원장(`videoEntitlement.ts`)은 "오늘 만듦" 판정에 계속 쓰고, 기간별 개수 세기를 추가
5. **AI 서버 확인** `ai-server/worker.js`
   - `/v1/direct` 요청 때 RevenueCat 서버 API로 구독 확인(5분 캐시) → 구독 없으면 `subscription_required`
   - Standard는 결제 기간마다 연출한 날짜 수를 세서 15일 넘으면 `standard_limit_reached`
   - `REQUIRE_SUBSCRIPTION` 스위치: 지금은 꺼 둠 → 웹 버전을 닫는 U16에서 켬 (그 전까지 펌킨 웹 테스트가 막히지 않게)
   - 서버 테스트 추가
6. **검증**: pnpm check, e2e, iOS 빌드 확인

## 계정 생긴 뒤 펌킨이 할 일 (연결 단계, 그때 하나씩 안내)
- 애플 개발자 가입 → App Store Connect에서 구독 그룹·상품 2개·3일 무료 체험 등록
- RevenueCat 가입(무료) → 앱 등록 → 키 2개(앱용 공개 키, 서버용 비밀 키) 받기
- 공개 키는 GitHub 저장소 변수, 비밀 키는 Cloudflare 비밀값으로 넣기 (방법은 그때 안내)
- 이용약관·개인정보처리방침 페이지는 U16에서 만든다 (지금은 링크 자리만)

## 구현 결과
- `src/billing/access.ts` + 테스트 6개(속성 테스트 포함): unrestricted / allowed(남은 개수) / subscribe / standard_used_up(충전일)
- `src/billing/purchases.ts` + 테스트 4개: RevenueCat 연결(`@revenuecat/purchases-capacitor` 13.8.0), 앱 사용자 ID = 설치 ID, 키(`VITE_REVENUECAT_IOS_KEY`)가 없거나 웹이면 결제 꺼짐
- `src/screens/PaywallScreen.tsx`: 요금제 카드 2개(Premium 추천), 3일 무료 문구(체험 자격 없으면 바로 구독 문구), 자동 갱신·해지 안내, 구매 복원·이용약관(애플 표준 EULA)·개인정보처리방침 링크
- 하루 마감: 구독 확인이 끝나기 전에는 AI를 부르지 않음, 잠겨 있으면 안내 카드 + 영상 만들기 누르면 결제 화면, Standard 남은 개수 표시
- 설정 > 구독(결제 켜진 앱에서만): 요금제·체험·남은 개수·다음 결제일, 요금제 보기, 구독 관리·해지, 구매 복원
- 웹 테스트 도구에 "결제 화면 미리보기"
- AI 서버: `REQUIRE_SUBSCRIPTION`(지금 "false") 켜지면 RevenueCat으로 구독 확인(있음만 5분 저장), 없으면 402 `subscription_required`, Standard는 결제 기간에 연출한 날짜 15개 넘으면 402 `standard_limit_reached`. 서버 테스트 추가
- iOS 빌드 워크플로에 `VITE_REVENUECAT_IOS_KEY` 저장소 변수 연결
- 검증: pnpm check(단위 테스트 87개 + 서버 테스트), e2e 2개 통과, 웹 화면 변화 없음 확인
