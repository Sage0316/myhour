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

## 기록 화면 기본 모드를 사진으로 변경
**Timestamp**: 2026-09-22T00:00:00Z
**User Input**: "지금 하루 기록하기 누르면 글이 먼저 나오는데 사진이 제일 먼저 나오게 바꿔줘"
**AI Response**: "`RecordScreen`의 모드 탭 순서를 `사진 · 영상 · 음성 · 글`로 바꾸고, '매번 선택' 설정일 때의 기본 모드를 `글`에서 `사진`으로 바꿨다. '하나로 고정' 설정은 사용자가 고른 기본 기록 방식을 그대로 따르며 매칭 실패 시 폴백만 사진으로 바뀐다. `pnpm check` 전체 검증을 통과했다."
**Context**: U1 기록 화면 UX 조정, 저장 구조·데이터 호환성 변경 없음

---

## 관리자 모드 유지 실패와 영상 하루 한 편 제한 우회
**Timestamp**: 2026-09-22T00:00:00Z
**User Input**: "그리고 관리자모드가 안 돼 / 너가 시킨곳 7번 탭하면 관리자 모드가 되긴하는데 바로 풀림 / 영상을 나도 하루에 한 번 밖에 못 만들어 ㅡㅡ;;;"
**AI Response**: "관리자 모드 상태가 `SettingsScreen`의 `useState`에만 있어서 탭 전환·모달로 화면이 언마운트되면 꺼졌다. `src/devMode.ts`(localStorage `hakku_dev_mode_v1` + `useSyncExternalStore`)로 옮겨 앱을 다시 열어도 유지되게 했고, 끄는 버튼을 추가했다. 켜져 있는 동안은 이용권·마감 잠금 게이트 네 곳(`isDayWrapped`, `wrapUpService.complete`, `WrapUpScreen.alreadyGenerated`, 아카이브 '다시 만들기')을 모두 건너뛰어 같은 하루로 영상을 여러 번 만들 수 있다. `wrapLock.test.ts`에 유지·우회 테스트 4건을 추가하고 `pnpm check` 전체 검증을 통과했다."
**Context**: U6 테스트 도구 수정, 일반 사용자 정책(하루 한 편)은 그대로이며 관리자 모드에서만 우회

---
