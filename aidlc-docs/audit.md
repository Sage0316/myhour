# 하꾸 결정 기록

이 문서는 반복 대화와 중간 산출물을 압축한 결정 로그다. 상세 이력은 Git 기록에서 복구할 수 있다.

| 날짜 | 결정 | 반영 결과 |
|---|---|---|
| 2026-07-25 | AI-DLC 질문은 추천값으로 진행 | 권장 보안·테스트·설계 기준을 기본값으로 채택 |
| 2026-07-25 | 제품 출시명은 하꾸(hakku, 하루 꾸미기) | 사용자 노출 브랜드를 하꾸로 통일하고 저장소·경로 `myhour`는 호환성을 위해 유지 |
| 2026-07-25 | 코드 구현 직전까지 설계를 완료 | Application Design, Units Generation, U1–U7 Unit 설계 완료 |
| 2026-07-25 | 전수 검토에서 나온 개선점을 모두 구현 | 데이터·미디어·백업·AI·Push·접근성·성능·CI/배포 구조를 U1–U7로 구현 |
| 2026-07-25 | BGM 18곡을 삭제하지 않음 | `public/bgm`에 유지하되 초기 번들·서비스워커 precache에서 제외하고 선택 시 상대 URL로 지연 로딩 |
| 2026-07-25 | 변경사항을 GitHub에 게시하고 `main`에 병합 | 앱과 AI-DLC/Claude Code 자료가 원격 `main`에 반영됨 |
| 2026-07-25 | 132개 AI-DLC 문서를 합쳐 요약 | 실행에 필요한 상태·맥락·구현·결정 문서 5개로 축약 |

## 변하지 않는 제품 원칙

- 기록과 미디어는 로컬 우선이다.
- AI에는 명시적 동의 후 최소한의 텍스트·캡션만 전송한다.
- 비밀키와 private JWK를 저장소 또는 브라우저 저장소에 넣지 않는다.
- 데이터 마이그레이션과 기존 `myhour` 공개 경로의 호환성을 임의로 깨지 않는다.
- 실제 배포와 외부 시스템 변경은 별도 승인과 출시 게이트 통과 후 수행한다.

---

## Git 동기화 요청
**Timestamp**: 2026-07-25T23:48:14Z
**User Input**: "지금 메인 브랜치 내려받아"
**AI Response**: "미커밋 문서 변경을 보존한 채 원격 main을 내려받고 로컬 main 참조를 fast-forward 방식으로 최신화한다."
**Context**: 기존 작업 트리를 변경하지 않는 Git 동기화

---

## Git 명령 실행
**Timestamp**: 2026-07-26T00:16:19Z
**User Input**: "git fetch origin main && git checkout main && git pull"
**AI Response**: "`git fetch origin main`을 실행했으나 실행 환경의 GitHub 네트워크 연결 차단으로 실패했다. 후속 checkout과 pull은 실행하지 않았고 작업 트리를 보존했다."
**Context**: Git 동기화 실패 기록

---

## Git 명령 재실행
**Timestamp**: 2026-07-26T00:20:25Z
**User Input**: "git fetch origin main
git checkout main
git pull --ff-only"
**AI Response**: "`git fetch origin main`을 재실행했으나 현재 작업이 여전히 managed network-restricted 권한으로 실행되어 실패했다. 후속 명령은 실행하지 않았다."
**Context**: 네트워크 권한 변경 전 재시도

---

## localStorage 키 접두사 변경 사후 승인
**Timestamp**: 2026-07-26T01:05:00Z
**User Input**: "내가 분명히 저장 방식을 myhour_*로 하라고 했는데 (비용 절감) 왜 그렇게 바뀟지?" → (설명 후) "A로하고 배포도 하자"
**AI Response**: "2026-07 하드닝 PR이 localStorage 키를 `myhour_*`에서 `hakku_*`로 바꿨고, 이는 `myhour/CLAUDE.md`에 기록된 기존 결정과 상충하며 승인 기록이 없음을 확인했다. 실제로 변경 비용이 드는 저장소명·URL·워커명은 유지됐고, 접두사 변경이 추가한 위험은 없으며(스키마 v2 마이그레이션은 접두사와 무관하게 필요) 되돌리는 비용이 더 크다고 보고했다. 사용자가 '유지하되 문서를 사실대로 고친다'를 선택해 `myhour/CLAUDE.md`를 수정했다."
**Context**: 사후 승인. 결정 기록 없이 뒤집힌 결정을 문서와 일치시킴
**Decision**: `hakku_*` 유지. 구버전 `myhour_*`는 읽기 전용 마이그레이션 소스로 보존

---

## BGM을 R2로 이전
**Timestamp**: 2026-07-26T07:20:00Z
**User Input**: "내가 cloudflare R2에 우리 bgm 다 올려놨어" → (정책 충돌·CORS 설명 후) "정적 자산으로 유지한다는 게 무슨 말인지 먼저 듣고 결정할래" → "응 잘 들려ㅋㅋ 그럼 배포할 때 용량도 가벼워지는건가"
**AI Response**: "루트 CLAUDE.md의 'BGM을 public/bgm에 정적 자산으로 유지한다' 정책과 충돌함을 먼저 보고했다. 그 정책의 실제 의도가 '번들·precache에 넣어 앱 시작을 막지 않는다'이며 R2로 옮겨도 그 의도는 유지되고 오히려 강화됨을 설명했다. 배포본 118MB 중 114MB(96.6%)가 오디오이며, git 히스토리 용량은 줄지 않는다는 점도 정정해 전달했다."
**Context**: 사전 승인. 결정 근거를 남기기 위해 기록
**Decision**: BGM은 R2(myhour-media) + hakku-media 워커로 서빙. public/bgm 삭제. VITE_MEDIA_BASE_URL이 비면 예전 경로로 폴백

---

## AI 연출 403 오류 진단
**Timestamp**: 2026-09-10T12:54:30Z
**User Input**: "지금 여기서 막혔어"
**AI Response**: "첨부 화면의 `provider_forbidden` 경로를 조사했다. GitHub Pages 최신 배포, 앱의 AI Worker URL 주입, `hakku-ai` Worker `/health`, 허용 Origin은 정상이다. Worker가 AI Gateway 또는 Anthropic에서 받은 HTTP 403을 동일 오류 코드로 반환하는 외부 AI 권한 단계의 장애로 판정했다."
**Context**: 첨부 화면 기반 읽기 전용 장애 진단. 코드와 배포 설정은 변경하지 않음

---

## OpenAI 제공자 전환 요청
**Timestamp**: 2026-09-10T13:02:09Z
**User Input**: "고쳐줘 그리고 나 api를 지피티껄로 바꾸고 싶어"
**AI Response**: "기존 Cloudflare Worker의 보안·할당량 경계는 유지하고 외부 공급자를 OpenAI Responses API로 교체하는 변경으로 분류했다. 비용과 구조화 출력 적합성을 근거로 `gpt-5-mini`를 추천하며 구현 전 확인을 요청한다. 실제 배포와 유료 호출은 별도 승인 전 실행하지 않는다."
**Context**: U5 AI 연출 제공자 마이그레이션 요구사항 확인

---

## OpenAI 모델 품질 우선 재검토
**Timestamp**: 2026-09-10T13:05:41Z
**User Input**: "근데 굳이 미니를 쓸 필요가 있을까 나는 좀 더 좋은 모델 쓰고 싶은데"
**AI Response**: "OpenAI 공식 모델 문서를 기준으로 Mini급보다 높은 품질을 원하는 요구를 반영했다. 최고가 `gpt-6-astra`는 하꾸의 짧은 구조화 연출 작업에 과도하므로, 전문 작업용 플래그십 `gpt-5.6-sol`과 낮은 reasoning effort를 추천하고 확인을 요청한다."
**Context**: U5 AI 연출 모델 선택 재검토

---

## OpenAI 전환 승인 및 API 키 확인
**Timestamp**: 2026-09-10T13:12:16Z
**User Input**: "응 근데 api키가 있어?"
**AI Response**: "`gpt-5.6-sol` 전환 승인으로 기록했다. 현재 프로세스·사용자·시스템 환경과 저장소 및 GitHub Actions secret 이름을 확인했지만 사용 가능한 `OPENAI_API_KEY`는 없었다. 키 없이 가능한 코드 전환과 모의 테스트만 진행하고, 실제 유료 호출·배포는 새 키를 Worker secret으로 등록한 뒤 별도 승인하에 수행한다."
**Context**: U5 OpenAI 제공자 전환 구현 승인과 비밀값 경계 확인

---

## OpenAI 제공자 전환 로컬 구현 완료
**Timestamp**: 2026-09-10T13:20:57Z
**User Input**: "고쳐줘 그리고 나 api를 지피티껄로 바꾸고 싶어" → `gpt-5.6-sol` 추천에 "응"
**AI Response**: "기존 Worker의 설치 토큰·Origin·요청 크기·속도·일일 할당량 경계를 유지하면서 외부 호출만 OpenAI Responses API로 교체했다. `gpt-5.6-sol`/low reasoning, Structured Outputs, `store: false`, Bearer 인증과 OpenAI 응답 파싱을 적용했다. 화면 오류 안내와 운영 설정을 갱신하고 `pnpm run check` 전체 검증을 통과했다. 실제 OpenAI 호출과 배포는 하지 않았다."
**Context**: U5 AI 연출 제공자 마이그레이션 Build/Test 완료, 외부 적용 대기

---

## OpenAI API 키 운영 secret 등록
**Timestamp**: 2026-09-10T13:42:46Z
**User Input**: "입력했어" → `Add variable and deploy` 실행 확인에 "ㅇㅇ"
**AI Response**: "Cloudflare의 운영용 `hakku-ai` Worker에 `OPENAI_API_KEY`를 Secret 유형으로 저장했다. 완료 후 키 값은 읽지 않고 `OPENAI_API_KEY`와 `Value encrypted` 표시만 확인했다. 이 단계에서는 새 OpenAI 코드 게시나 실제 OpenAI 호출을 수행하지 않았다."
**Context**: 사용자가 직접 입력한 비밀값의 운영 Worker 등록, 최소 범위 외부 변경

---

## OpenAI 전환 운영 배포 승인
**Timestamp**: 2026-09-10T13:45:34Z
**User Input**: "ㅇㅇ"
**AI Response**: "GitHub `main`에 검증된 변경을 게시해 Pages 자동 배포를 시작하고, 해당 커밋의 CI를 확인한 뒤 GitHub Actions로 운영 `hakku-ai` Worker를 배포한다. 운영 전환 후 사용자의 실제 AI 생성 요청부터 OpenAI API 비용이 발생할 수 있다."
**Context**: GitHub Pages와 Cloudflare AI Worker 운영 배포 승인

---

## AI Worker 전용 배포 범위 승인
**Timestamp**: 2026-09-10T13:54:50Z
**User Input**: "ㅇㅇ"
**AI Response**: "기존 배포 워크플로가 AI와 Push Worker를 함께 배포하므로, 무관한 Push Worker를 건드리지 않도록 `ai`/`all` 범위 선택을 추가한다. 이번 운영 배포는 `worker: ai`로 실행한다."
**Context**: 최소 변경 원칙에 따른 GitHub Actions Worker 배포 범위 축소

---

## OpenAI 전환 운영 배포 완료
**Timestamp**: 2026-09-10T13:59:20Z
**User Input**: 운영 배포와 AI Worker 전용 배포 범위에 각각 "ㅇㅇ"
**AI Response**: "OpenAI 전환을 `main`에 게시하고 CI 및 GitHub Pages 배포 성공을 확인했다. `worker: ai`로 운영 `hakku-ai`만 배포했으며 Push Worker 단계는 건너뛰었다. 비용 없는 `/health` 확인에서 HTTP 200, `ok: true`, `https://sage0316.github.io` CORS 허용을 확인했다. 실제 OpenAI 생성 호출은 수행하지 않았다."
**Context**: U5 OpenAI 제공자 마이그레이션 운영 배포와 무과금 상태 검증 완료

---

## 기록하기 기본값·글 길이 변경 (AI-DLC 절차 밖 소규모 변경, 사후 기록)
**Timestamp**: 2026-10-28T07:28:51Z
**User Input**: "좋아 그럼 25자로 하고 일단 푸시 한 번 하자" → "메인에 먼저 올리자 그냥 너가 바로 올려"
**AI Response**: "기록 방식을 고정하지 않았을 때 기록하기 화면의 기본 모드를 '글'에서 '사진'으로, 글 기록 최대 길이를 90자에서 25자로 바꿨다. `pnpm check` 통과, 브라우저에서 기본 '사진' 선택과 25자 제한을 확인한 뒤 커밋 `536fccb`를 `main`에 게시했다. CI와 GitHub Pages 배포 성공을 확인했다. 디자인 시안 논의 중 결정된 소규모 변경이라 AI-DLC 단계 문서 없이 진행했고, 이 항목으로 사후 기록한다."
**Context**: 사용자 승인에 따른 `main` 게시 및 Pages 자동 배포

---

## AI 연출 횟수 제한 변경 및 운영 Worker 배포
**Timestamp**: 2026-10-28T07:45:24Z
**User Input**: "연출은 최대 3번까지만 다시 하도록 바꿔야 해 미친 거 아님? 20번이나 바꾸게 해주게 ,ㅡㅡㅡ" → "서버 배포해"
**AI Response**: "AI Worker 한도를 설치당 하루 20회에서 날짜별 4회(첫 연출 1번 + 다시 연출 3번)와 하루 전체 상한 8회로 바꾸고, 공급자 오류로 실패한 시도는 세지 않도록 성공 후에만 차감하게 했다. 한도 초과는 `redo_limit_exceeded`로 구분해 앱 안내 문구를 추가했다. Worker 테스트를 추가하고 `pnpm check` 통과 후 커밋 `fe3413f`를 `main`에 게시했다. GitHub 앱 권한으로 워크플로 실행이 403으로 막혀 사용자가 직접 Deploy Workers를 실행했다. preview는 KV ID가 `REPLACE_WITH_PREVIEW_KV_ID` 그대로라 실패했고(미구성 환경), production `worker: ai` 배포는 성공했다(버전 `d7b718dd-c2e2-4ccb-adf0-489a741c959b`). Push Worker는 건드리지 않았다."
**Context**: 사용자 승인에 따른 운영 `hakku-ai` Worker 배포, 비용 통제 변경

---

## iOS 앱스토어 출시 워크플로 시작 — Workspace Detection
**Timestamp**: 2026-10-28T07:47:53Z
**User Input**: "이제 앱스토어 작업 시작하자"
**AI Response**: "AI-DLC 새 워크플로를 시작한다. 기존 `aidlc-state.md`를 확인해 brownfield(U1–U7 구현·운영 중)로 판단했다. 별도 reverse-engineering 폴더는 없지만 `PROJECT_CONTEXT.md`와 `IMPLEMENTATION_SUMMARY.md`가 통합 맥락 문서 역할을 하므로 Reverse Engineering은 생략하고 Requirements Analysis로 진행한다. 확장 설정은 기존 결정(Security Baseline 적용, Property-Based Testing 적용, Resiliency 미적용)을 유지한다."
**Context**: Workspace Detection 완료, 대화에서 이미 나온 결정(개인 계정 고민, 유료 출시, 3일 무료+15일권 3,300원+한달권 5,500원, Windows·2013년형 Mac만 보유, Apple Developer 미가입)을 요구사항 질문 파일에 반영

---

## Requirements Analysis — 질문 답변
**Timestamp**: 2026-10-28T07:55:25Z
**User Input**: "나한테 하나씩 물어봐줘 엠디파일 안 열려" → 선택형 질문 답변: 계정 "개인으로 시작 (추천)", 출시 국가 "EU 빼고 전 세계 (추천)", 지원 기기 "아이폰 전용 (추천)", 무료 체험 "애플 구독 체험 (추천)", 유료 범위 "영상 + AI 연출만 유료", 만료 후 "보기·저장 계속 가능 (추천)", 웹 버전 "웹 버전 종료 (추천)", 데이터 이전 "없어, 새로 시작", 알림 "폰 예약 알림 (추천)", 디자인 "출시 전에 넣기 (추천)", 결제 확인 "RevenueCat 사용 (추천)", 앱 이름 "하꾸 - 하루 꾸미기", 번들 ID "com.hakku.app (추천)", 빌드 환경 "클라우드 빌드 (추천)"
**AI Response**: "사용자가 md 파일을 열 수 없어 질문 14개를 대화의 선택형 질문으로 나눠 받았고, 답을 requirement-verification-questions.md에 옮겨 적었다. 추가 모호점이 없어 requirements.md를 작성했다. User Stories는 사용자 유형이 하나라 생략을 제안한다."
**Context**: Requirements Analysis 답변 수집 및 요구사항 문서 작성, 승인 요청

---

## Requirements Analysis — 가입 시점 질문
**Timestamp**: 2026-10-28T07:56:44Z
**User Input**: "일단 내가 앱 며칠 써보고 디벨롭퍼 가입해도 되나"
**AI Response**: "가능하다고 답했다. 계정이 필요한 건 서명·TestFlight·App Store Connect 상품·RevenueCat 상품 연결뿐이고, 디자인 반영·Capacitor 틀·예약 알림·서버 허용 주소·페이월 화면은 계정 없이 먼저 할 수 있다고 안내했다. 요구사항 승인은 아직 대기 중이다."
**Context**: Requirements Analysis 승인 대기 중 일정 질문

---

## Requirements Analysis — 승인
**Timestamp**: 2026-10-28T08:00:27Z
**AI Prompt**: "요구사항 정리는 승인이라고 해주면 다음 단계(작업 순서 짜기)로 넘어갈게."
**User Response**: "승인 그럼 그동안 계정 없이 되는 거 먼저 해줘"
**Status**: Approved
**Context**: Requirements Analysis 완료, Workflow Planning 시작

---

## Workflow Planning — 승인 요청
**Timestamp**: 2026-10-28T08:00:27Z
**AI Prompt**: "Ready to proceed with this plan?" — execution-plan.md: 작업 단위 U8–U16, 계정 없이 가능한 단위 우선, 디자인(U12) 첫 순서, U10·U13만 Functional Design, 계정 불필요 단위는 실행 계획 승인으로 코드 생성 계획 승인 갈음 제안
**Context**: Workflow Planning 완료, 사용자 승인 대기

---

## Workflow Planning — 승인
**Timestamp**: 2026-10-28T08:20:00Z
**AI Prompt**: "Ready to proceed with this plan?"
**User Response**: "승인

아니 그리고 디자인 반영을 아직도 안 했어??"
**Status**: Approved
**Context**: 실행 계획 승인, U12 디자인 리뉴얼부터 코드 생성 시작. 지금까지는 캔버스 시안만 있었고 코드 반영은 이번이 처음이라고 안내함

---

## U12 디자인 리뉴얼 — 코드 생성 완료
**Timestamp**: 2026-10-28T08:16:51Z
**AI Response**: "공통 디자인 값(src/design.ts), Gaegu 글꼴 포함, 탭바와 6개 화면(홈·오늘·기록하기·하루 마감·아카이브·설정)을 다꾸 스타일로 바꿨다. 기능·화면 순서·접근성 이름은 유지했다. TYPE_COLORS는 영상 렌더링에 쓰여 그대로 두었다. pnpm check 통과(단위 테스트 72개), Playwright e2e 2개 통과(axe critical 포함), 390px 화면 캡처로 정렬을 확인했다. 실행 계획 근거(사용자가 며칠 써보며 새 디자인 확인)에 따라 main에 게시해 Pages로 배포한다."
**Context**: U12 Code Generation 완료, 사용자 확인 요청

---

## U12 디자인 리뉴얼 — 시안 차이 수정
**Timestamp**: 2026-10-28T08:22:14Z
**User Input**: "너가 만들어준 디자인 시안이랑 다른데?? 첫 기록을 남겨볼까요 페이지도 안 들어강ㅆ고"
**AI Response**: "시안과 코드를 대조해 빠진 요소를 반영했다. 홈: 72px 날짜, 기울인 기록 수 스티커, 테이프 붙인 92px 폴라로이드(번갈아 기울임), 형광펜 밑줄 제목, 글 기록 말풍선, 낙서(별·하트·물결). 첫 기록 전: hakku.exe 창의 YES!/이따가 버튼, 다음 기록 시간 테이프와 안내 문구, 하단 버튼 숨김. 하루 마감: 두 줄 제목(둘째 줄 빨강), 폴라로이드 기록 썸네일, 카드 테이프, 영상 버튼 별. 아카이브: 카드 기울임. 설정: 알림·데이터·AI 줄 아이콘 타일. 한국 시간 기준 캡처로 확인, pnpm check와 e2e 통과."
**Context**: U12 시안 일치 보정

---
