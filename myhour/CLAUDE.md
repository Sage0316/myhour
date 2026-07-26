# 하꾸 개발 메모

하꾸(hakku, 하루 꾸미기)는 React 19 + TypeScript + Vite 8 기반의 로컬 우선 PWA입니다. GitHub Pages 호환을 위해 공개 경로와 Vite base는 `/myhour/`를 유지합니다.

**로고(2026-07-22 확정)**: `public/brand/hakku-wordmark.svg`(흰 배경, 가로 한 줄 "HAKKU") / `hakku-wordmark-transparent.svg`(투명 배경) / `hakku-icon-mark.svg`(정사각형, "HA"/"KKU" 두 줄 — 앱 아이콘용). 순수 검정(#000000, 절대 `#1A1A1A` 같은 따뜻한 회색 쓰지 말 것 — 크림 배경과 동시대비로 갈색/똥색처럼 보임) 두꺼운 사각 블록을 이어붙여 만든 워드마크, 획마다 삐뚤빼뚤 지터(고정 시드라 항상 같은 모양). 정사각형 아이콘 버전만 글자당 한 획씩 **하늘색(#3FA0E0, "하꾸=하늘" 연상)** 포인트 — 가로 워드마크는 포인트 컬러 없이 순수 검정 단색. **주황(#D9743F)은 시그니처 컬러 아님** — scenes.ts의 drawMemeScene 기본 인자값일 뿐, 사용자가 정한 적 없음. 홈 화면 앱 아이콘(`favicon.svg`/`icon-192.png`/`icon-512.png`/`apple-touch-icon.png`) 전부 이 정사각형 마크로 교체 완료 — 이전엔 브랜드와 무관한 보라색 추상 마크(예전 템플릿 잔재)였음. maskable 안전영역(중심 반경 40%) 고려해 콘텐츠를 캔버스의 60%로 넉넉히 여백.

**표시 이름은 "하꾸"(2026-07-22 확정), 내부 작업명은 그대로 MYHOUR/myhour.**
저장소명·리포·URL(`/myhour/`)·워커명(`myhour-push`)은 변경 비용이라 그대로 두고,
**사용자에게 실제로 보이는 텍스트만** "하꾸"로 교체함: `index.html`(title, apple-mobile-web-app-title),
`manifest.json`(name/short_name — 홈 화면 아이콘 이름), `App.tsx`(데스크톱 미리보기 프레임 라벨),
`push.ts`/`SettingsScreen.tsx`(에러 문구), `scenes.ts`(영상 인트로 카드 "하 꾸" 워터마크 + 마무리 카드 자막),
`push-server/worker.js`/`public/sw.js`(푸시 알림 제목). 새 코드 작성 시 사용자 노출 문자열에 "MYHOUR" 쓰지 말 것 — "하꾸"로.

**localStorage 키는 예외다.** 원래 결정은 `myhour_*` 유지였지만, 2026-07 하드닝에서 Zod 스키마 v2와
함께 `hakku_*`로 바뀌었다(구버전 `myhour_v1`·`myhour_archive_v1`·`myhour_settings_v1`·`myhour_videos_v1`은
읽기 전용 마이그레이션 소스로 보존). **이 변경은 사전 승인 없이 들어갔다.** 되돌리는 비용(마이그레이션
재작성 + 실데이터 위험)이 이름을 되찾는 이득보다 커서 유지하기로 했다(2026-07-26 결정).
새 스키마 버전을 새 키에 쓰는 것 자체는 구버전 데이터를 건드리지 않아 롤백 여지를 남기는 이점이 있다.

## 기술 스택
- Vite 8 + React + TypeScript
- GitHub Pages 배포 (`base: '/myhour/'`)
- Canvas API + MediaRecorder로 클라이언트 WebM 영상 생성

## 저장소 구조
- localStorage: 현재 기록·아카이브·설정은 `hakku_journal_v2_active` / `hakku_archive_v2_active` / 설정 키 (구버전 `myhour_v1`, `myhour_archive_v1`은 읽기 전용 마이그레이션), AI 결과(`hakku_director_v1_${date}`)
- IndexedDB: 미디어 blob 전부 (`hakku_local_v2`, 구버전 `myhour_videos_v1`), 키: 클립·완성 영상은 archiveVideoKey 참조, **사진·짤·음성 원본은 `media_*`(createStableId)**
- **미디어는 절대 localStorage에 넣지 말 것** (2026-07-24 이전엔 사진·음성 data URL이 records에 그대로 들어가서 iOS Safari 5MB 한도에 사진 25~50장이면 걸렸음). 지금은 `addRecord`가 IDB에 blob으로 넣고 `content=''` + `mediaId`만 남긴다 — 사진 1장+글 1개 기록이 약 300바이트. **영상만 예외**: content에 작은 썸네일 data URL을 남긴다(`keepInline` 참조). RecordScreen이 blob을 IDB에 넣어 `media`를 넘겨주면 addRecord가 content를 비우는 구조라, 둘 중 한쪽만 고치면 조용히 예전 동작으로 돌아간다
- 표시할 때는 `useMediaSrc(record)` 훅을 쓴다 (IDB에서 object URL 생성 + 언마운트 시 revoke). 존재 여부만 볼 땐 `hasMedia(record)`. **구버전 기록은 mediaId 없이 content에 data URL이 있으니 두 경로를 다 지원해야 함** — 훅과 hasMedia가 알아서 처리하니 `content.startsWith('data:')`를 직접 쓰지 말 것 (영상 썸네일만 예외)
- **아카이브 항목의 `title`은 저장·읽기 양쪽에 다 있어야 한다.** journalRepository.loadArchive는 candidate를 새로 조립하므로 필드를 명시적으로 옮기지 않으면 읽을 때마다 조용히 사라진다 (journalRepository.test.ts가 왕복을 지킨다)
- sessionDate: startTime 이전이면 전날 날짜 (getSessionDate 참조)
- 아카이브: 마감할 때마다 고유 id로 누적 (같은 날 여러 개 가능), 카드 ✕로 삭제 가능
- 원본 정리 정책: 영상 완성 시 미디어 원본(사진/음성/클립) 즉시 정리(trimRecords), 영상 없이 마감한 항목은 3일 후 자동 정리(sweepArchive). 글 텍스트는 남음
## 핵심 원칙

- 신규 메타데이터는 `hakku_*` 키와 Zod 스키마 v2를 사용하되, 기존 `myhour_*` 데이터는 읽기 전용 마이그레이션으로 보존합니다.
- 설정·현재 기록·아카이브는 Repository, 모든 미디어는 `hakku_local_v2` IndexedDB를 사용합니다.
- 영상 생성이나 아카이브 완료 뒤에도 원본 기록을 자동 삭제하지 않습니다.
- AI 공급자 키와 VAPID 비밀키를 브라우저 또는 저장소에 넣지 않습니다.
- AI는 명시적 동의 후 텍스트·캡션만 Worker로 보내며 미디어 원본은 전송하지 않습니다.
- 외부 배포와 GitHub push는 별도 사용자 승인 없이 실행하지 않습니다.

## 검사

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:e2e
```

## 이모지 규칙 (2026-07-25 정리)
**무드 이모지와 기록 이모지를 절대 섞지 말 것.** 예전엔 그날 무드 세트에서 매번 `rnd()`로 뽑아 각 장면에 붙여서, 신발 사진에 💍가 붙는 식으로 내용과 무관한 이모지가 나왔다.
- **기록 이모지** (기록 1개 단위): AI `recordEmojis[i]`(모든 타입에 대해 요청) → 없으면 `pickContentEmoji()` 키워드 사전 → **그래도 없으면 붙이지 않는다** (그림일기 그림 칸만 중립 연필 🖊️). 쓰이는 곳: 그림일기 그림 칸, 사진 위 1개, 글 문장 끝
- **무드 이모지** (하루 1개 단위): `overrides.emojis`의 첫 글자 또는 `fallbackEmojisFor(mood)[0]`. 그림일기 '오늘' 칸에만 쓴다
- AI 프롬프트에서 `emojis`는 감정/분위기 계열만, 구체적 사물은 `recordEmojis`로 가도록 명시해 둠 (예전엔 AI가 `emojis`에 💍📚를 넣어 무드 칸이 이상해졌다)
- 구버전 AI 응답 필드명 `diaryEmojis`도 `recordEmojis`로 받아준다 (llmDirector 파싱부)

## 주의: 슬롯 매칭
`record.slotTime`엔 **정확한 시계 시각**("23:42")이 들어간다 — 슬롯 문자열("23:00")과 그대로 일치하지 않는다.
오늘 탭 격자처럼 슬롯별로 배치할 땐 `groupRecordsBySlot()`을 써야 한다 (문자열 비교로 매칭하면 격자가 늘 "기록 안 함"으로 보이는 버그가 있었음, 2026-07-24 수정).

## 현재 앱 흐름
1. 홈/오늘 탭에서 기록 추가 (텍스트/사진/영상/음성)
2. 하루 마감 → WrapUpScreen → 영상 생성 → 아카이브 자동 저장 + 오늘 탭 클리어 → 아카이브 이동
3. 아카이브에서 과거 기록 및 영상 보기/다운로드

## 주요 구조 (2026-07-19 기준)
- `src/scenes.ts`: 영상 장면 렌더러. 글=그림일기 틀(진한 회색 테두리+낙서 원 안에 내용 이모지+줄노트), 사진=풀스크린+무드 이모지 스캐터, 음성=실제 녹음 파형이 무드 색으로 차오름(computeEnvelope), 짤(meme)=폴라로이드/스크랩북 2종이 id 기준 랜덤(사용자 캡션이 손글씨로, 테이프·밑줄은 무드색), 마무리=블랙 카드
- 손글씨 폰트: **개구(Gaegu, OFL)** public/fonts, ensureDiaryFont. 2026-07 크레파스 느낌으로 교체 (이전: 나눔손글씨 펜). 최종 후보였던 감자꽃(Gamja Flower)도 좋았음 — 나중에 폰트 바꿀 일 있으면 참고. 폰트는 fonts.googleapis.com css2 API에서 ttf URL 얻어 fonts.gstatic.com에서 받으면 됨 (이 세션 네트워크에서 열려 있었음)
- 앨범(meme) 타입: RecordType 'meme'(라벨 '앨범', 색 #F9E9A6). 별도 탭이 아니라 **사진 모드 안에서 "지금 촬영/앨범에서 선택" 두 갈래** — 촬영=photo(풀스크린 장면), 앨범 선택=meme(폴라로이드/스크랩북 장면, 캡션이 손글씨). 앨범 input은 capture 속성 없음(카메라 강제 방지). 정리 정책은 사진과 동일. **주의: seededRnd(LCG)는 이웃 시드의 첫 값이 거의 같아서 Date.now() 기반 id로 분기하려면 rnd() 두 번 버리고 써야 함** (drawMemeScene 참조)
- `src/llmDirector.ts`: **AI 키는 브라우저에 절대 넣지 않는다.** 클라이언트는 얇은 호출부일 뿐이고, 프롬프트·모델·검증은 전부 `ai-server/worker.js`에 있다. 흐름: 설정에서 AI 동의 → `/v1/install`로 설치 토큰 받기(30일, HMAC 서명) → `/v1/direct`로 {date, records(텍스트·캡션만)} 전송 → 제목·마무리·무드·moodChip·무드이모지·장면 자막·BGM 무드·기록별 이모지(recordEmojis) 수신. 설치당 하루 20회 제한(AI_STATE KV) + Origin 허용목록 + rate limiter. 사진·영상·음성 원본은 전송하지 않는다. **2026-07의 push-server `/director` 프록시는 이 구조로 대체됐다** — AI 경로를 두 개 두지 말 것
- **ai-server는 `env.PROVIDER_URL`에 Cloudflare AI Gateway 엔드포인트를 넣어야 동작한다.** Workers에서 api.anthropic.com을 직접 부르면 Cloudflare→Cloudflare 봇 방어로 403 "Request not allowed"가 난다(UA 헤더로는 안 풀림). 게이트웨이 인증을 켰으면 `CF_AIG_TOKEN`도 시크릿으로 넣고 `cf-aig-authorization` 헤더로 나간다. 계정 게이트웨이: `https://gateway.ai.cloudflare.com/v1/f68efd92d83fa98ee254ffd8c8a0ab6e/sage/anthropic/v1/messages`
- 프롬프트 규격을 바꿀 때는 **worker.js의 buildPrompt/validResult/normalizeResult와 llmDirector의 zod 스키마를 같이** 손대야 한다. `recordEmojis`가 현재 필드명이고 구버전 응답의 `diaryEmojis`는 normalizeResult에서 받아준다. `meme`이 RECORD_TYPES에 없으면 짤이 든 하루는 서버에서 invalid_request로 전부 거절된다
- `src/videoGenerator.ts`: 1080×1920 렌더링. **mimeType 우선순위는 mp4를 webm보다 먼저** (2026-07-22 변경) — iOS Safari가 MediaRecorder로 webm '녹화' 자체는 지원해도 사진 앱이 webm을 영상으로 인식 못 해서, 에어드랍/공유해도 파일 앱에만 들어가고 사진 앱엔 저장 안 되는 문제가 있었음. mp4(h264)는 어디서든 정상 저장됨. **절대 webm을 다시 앞으로 올리지 말 것** — 2026-07-25 병합에서 한 번 되돌아갔다. 우선순위는 `videoGenerator.ts`와 `services/video-generation-service.ts`(capabilities) **두 곳**에 있어서 같이 봐야 한다. BGM 무드 7종×3곡(public/bgm, 전곡 CC0, 랜덤 선곡 + `pickAudibleOffset`로 소리 나는 지점에서 시작) + 음성/클립 소리 믹싱(BGM 더킹, 컷 페이드아웃). 영상·음성 장면은 3~5초(MEDIA_MAX)
- BGM 파일명은 `llmDirector.BGM_FILES`와 public/bgm이 정확히 일치해야 한다 — 어긋나면 fetch가 404 나고 영상에 음악만 조용히 빠진다. llmDirector.test.ts가 카탈로그 21곡의 실제 파일 존재를 검사한다
- 음성 녹음은 16kHz WAV 직접 인코딩 (iOS mp4는 decodeAudioData 실패하는 버그 회피)
- AudioContext는 탭 제스처 직후 생성 필수 (iOS suspended 버그), 폰트/디코딩엔 타임아웃, 생성 실패 시 onWarn으로 폰에 에러 표시
- 녹화/녹음 UI: 5초 넘으면 "앞 5초만 담겨요" 안내 + 영상 미리보기 회색 전환
- 미리보기 루프: `npm run dev -- --port 5199` 후 /myhour/preview.html (장면 스크린샷), /myhour/gentest.html (생성 통합테스트, window.__blob으로 오디오 검증). Playwright는 playwright-core + executablePath '/opt/pw-browsers/chromium'
- 개발 컨테이너에 설치된 크로미움 버전이 playwright가 원하는 빌드와 다를 때(`Executable doesn't exist`) `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`을 주면 playwright.config.ts와 scripts/browser-verify.mjs가 그 바이너리를 쓴다. CI에서는 비어 있어 기본 동작 그대로. `playwright install`은 돌리지 말 것
- 설정 맨 아래 빌드 버전 표시 (vite define __BUILD_VERSION__) — "고쳤는데 안 돼요"는 먼저 버전 확인
- SW는 same-origin navigate만 처리 (외부 API 요청 건드리면 안 됨). 배포 반영은 CDN 캐시 때문에 최대 10분 + 앱 재시작 필요
- 무료 음원 추가는 GitHub의 0lhi/FreePD(퍼블릭 도메인) 미러에서 — raw.githubusercontent.com은 네트워크 정책에서 접근 가능(2026-07 기준). freepd.com 본 사이트는 폐쇄됨. 시청 페이지: /myhour/bgm.html
- **BGM 라이선스 감사 (2026-07-20): 전곡(21곡) CC0 확정** — 전부 0lhi/FreePD(CC0 1.0) 미러 출처 (15곡 md5 대조 + 6곡 미러에서 직접 다운로드). 상업 사용 무제한, 표기 불필요. 원곡명 매핑: ukulele=Happy Whistling Ukulele, ukulele-song=Ukulele Song, landras-dream=Landra's Dream, piano=Lovely Piano Song, nostalgic=Nostalgic Piano, piano-magic=Piano Magic Motive, magic-garden=Magic in the Garden, just-like-that=And Just Like That, tournesol=Champ de tournesol, lagoon=The Lagoon (+ 원곡명 그대로인 곡들). 소스 미상이던 bright/calm/emotional은 삭제하고 Pickled Pink/Study and Relax/Cornfield Chase로 교체함
- BGM 무드 풀 7종 (llmDirector BGM_FILES): calm/bright/emotional/piano/ukulele/nostalgic + **sad(차분한 슬픔·위로: Winter, Isolation Waltz, Cold Journey)** — 슬픔·지침 무드 추가에 맞춰 신설. bgmTrack 프롬프트 enum은 BGM_TRACKS에서 자동 생성
- 사용자 데이터는 전부 폰 안 — 홈 화면 아이콘 삭제 = 데이터 소실. 백업/가져오기는 설정에 있음

## 푸시 알림 (배포 완료 — 2026-07-19)
iOS 16.4+ PWA 푸시. 워커 배포됨: **https://myhour-push.sage0316.workers.dev**
- `push-server/`: 워커 코드(worker.js — Web Push aes128gcm 암호화+VAPID 직접 구현, 라운드트립 테스트 통과), wrangler.toml(KV id 기입됨), README(배포 순서)
- 앱 쪽: `src/push.ts`(구독, `PUSH_SERVER_URL` 기입됨 — string 타입 명시 필수, 리터럴이면 `=== ''` 비교가 TS2367), sw.js(push/notificationclick 핸들러), 설정에 알림 섹션
- Cloudflare: 계정 f68efd92d83fa98ee254ffd8c8a0ab6e, workers.dev 서브도메인 `sage0316`(API로 등록함), KV `SUBS`=7c47c7793fdd44d19f7476317399b038, 시크릿 `VAPID_PRIVATE_JWK` 등록됨, 크론 */30. 재배포는 push-server/에서 `npx wrangler deploy` (CLOUDFLARE_API_TOKEN 환경변수)
- 비밀키(vapid-keys.json)는 사용자가 파일로 보관 중 — 저장소에 커밋 금지
- 세션 네트워크 정책이 api.cloudflare.com만 허용 → workers.dev로 /health 직접 확인 불가, 배포 상태는 API(scripts/myhour-push/subdomain·secrets·schedules)로 검증
- 크론 30분 단위, 사용자별 interval(30/60/120)·시작/종료시간·타임존 반영. 만료 구독(410) 자동 정리

## ⚠️ 배포 상태 (2026-07-25 기준 — 코드는 준비됐고 배포가 남았다)
main의 하드닝 병합으로 워커 프로토콜이 새로 짜였다. 앱은 이제 `.env` 빌드 변수로 워커를 찾는다:
`VITE_AI_WORKER_URL`, `VITE_PUSH_SERVER_URL`, `VITE_VAPID_PUBLIC_KEY` (.env.example 참고, CI는 GitHub repo `vars`에서 주입).
- **비어 있으면 AI와 푸시가 조용히 꺼진다** — 설정 화면에 "서버 연결 전"으로 뜬다
- 새 프로토콜(`/v1/install` + 서명 토큰)은 기존에 배포된 `myhour-push`의 옛 엔드포인트와 호환되지 않는다 → push-server 재배포 필요
- ai-server는 아직 배포 안 됨 → 배포 + `ANTHROPIC_API_KEY`/`INSTALL_TOKEN_SECRET`/`PROVIDER_URL`(AI Gateway)/`CF_AIG_TOKEN` 시크릿 + `AI_STATE` KV 필요
- 배포는 workflow_dispatch 수동 (`.github/workflows/deploy-workers.yml`, `deploy-pages.yml`) — main push만으로는 배포되지 않으니, GitHub Pages가 안 바뀌었다고 당황하지 말 것

## 다음 과제 후보
- 위 배포 3종(ai-server, push-server 재배포, Pages) 실행 + repo vars 설정
- 앱스토어 출시 준비: Capacitor 래핑, 백업 강화, 과금 모델
`pnpm check`는 zero-warning lint, 단위/백업 테스트, AI·Push Worker 인증 테스트, Web Push 암호화 왕복, 타입 검사와 프로덕션 빌드를 실행합니다.

## 주요 위치

- `src/domain`, `repositories`, `persistence`: 데이터 모델과 저장
- `src/media`, `services`: 캡처·정리·영상 마감
- `src/backup`: SHA-256 매니페스트 전체 백업/원자적 복원
- `ai-server`: 보호된 AI Worker
- `push-server`: 인증된 Web Push Worker
- `public/_headers`, `public/sw.js`: 정적 보안 정책과 오프라인 셸
- 저장소 루트의 `PRIVACY.md`, `SECURITY.md`, `OPERATIONS.md`: 출시·운영 기준

Worker URL과 VAPID 공개키는 `.env.example`의 빌드 변수로 주입합니다. Worker의 provider/VAPID/설치 토큰 비밀값은 `wrangler secret`으로만 설정합니다.
