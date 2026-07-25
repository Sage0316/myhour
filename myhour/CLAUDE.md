# MYHOUR 프로젝트

## 개요
하루를 기록하고 영상으로 마무리하는 iOS 스타일 PWA. React + TypeScript + Vite.
배포: https://sage0316.github.io/myhour/

**로고(2026-07-22 확정)**: `public/brand/hakku-wordmark.svg`(흰 배경, 가로 한 줄 "HAKKU") / `hakku-wordmark-transparent.svg`(투명 배경) / `hakku-icon-mark.svg`(정사각형, "HA"/"KKU" 두 줄 — 앱 아이콘용). 순수 검정(#000000, 절대 `#1A1A1A` 같은 따뜻한 회색 쓰지 말 것 — 크림 배경과 동시대비로 갈색/똥색처럼 보임) 두꺼운 사각 블록을 이어붙여 만든 워드마크, 획마다 삐뚤빼뚤 지터(고정 시드라 항상 같은 모양). 정사각형 아이콘 버전만 글자당 한 획씩 **하늘색(#3FA0E0, "하꾸=하늘" 연상)** 포인트 — 가로 워드마크는 포인트 컬러 없이 순수 검정 단색. **주황(#D9743F)은 시그니처 컬러 아님** — scenes.ts의 drawMemeScene 기본 인자값일 뿐, 사용자가 정한 적 없음. 홈 화면 앱 아이콘(`favicon.svg`/`icon-192.png`/`icon-512.png`/`apple-touch-icon.png`) 전부 이 정사각형 마크로 교체 완료 — 이전엔 브랜드와 무관한 보라색 추상 마크(예전 템플릿 잔재)였음. maskable 안전영역(중심 반경 40%) 고려해 콘텐츠를 캔버스의 60%로 넉넉히 여백.

**표시 이름은 "하꾸"(2026-07-22 확정), 내부 작업명은 그대로 MYHOUR/myhour.**
저장소명·리포·URL(`/myhour/`)·워커명(`myhour-push`)·localStorage 키(`myhour_*`)는 전부 변경 비용이라 그대로 두고,
**사용자에게 실제로 보이는 텍스트만** "하꾸"로 교체함: `index.html`(title, apple-mobile-web-app-title),
`manifest.json`(name/short_name — 홈 화면 아이콘 이름), `App.tsx`(데스크톱 미리보기 프레임 라벨),
`push.ts`/`SettingsScreen.tsx`(에러 문구), `scenes.ts`(영상 인트로 카드 "하 꾸" 워터마크 + 마무리 카드 자막),
`push-server/worker.js`/`public/sw.js`(푸시 알림 제목). 새 코드 작성 시 사용자 노출 문자열에 "MYHOUR" 쓰지 말 것 — "하꾸"로.

## 기술 스택
- Vite 8 + React + TypeScript
- GitHub Pages 배포 (`base: '/myhour/'`)
- Canvas API + MediaRecorder로 클라이언트 WebM 영상 생성

## 저장소 구조
- localStorage: records, settings, archive (`myhour_v1`, `myhour_settings_v1`, `myhour_archive_v1`), API 키(`myhour_anthropic_key`), AI 결과(`myhour_director_${date}`)
- IndexedDB: 미디어 blob 전부 (`myhour_videos_v1`), 키: 클립 `video_${ts}`, 완성 영상 `wrapped_${entry.id}` (구버전은 `wrapped_${date}`, archiveVideoKey 참조), **사진·짤·음성 원본 `media_${record.id}`**
- **미디어는 절대 localStorage에 넣지 말 것** (2026-07-24 이전엔 사진·음성 data URL이 records에 그대로 들어가서 iOS Safari 5MB 한도에 사진 25~50장이면 걸렸음). 지금은 `addRecord`가 IDB에 blob으로 넣고 `content=''` + `mediaKey`만 남긴다 — 사진 1장+글 1개 기록이 약 300바이트
- 표시할 때는 `useMediaSrc(record)` 훅을 쓴다 (IDB에서 object URL 생성 + 언마운트 시 revoke). 존재 여부만 볼 땐 `hasMedia(record)`. **구버전 기록은 mediaKey 없이 content에 data URL이 있으니 두 경로를 다 지원해야 함** — 훅과 hasMedia가 알아서 처리하니 `content.startsWith('data:')`를 직접 쓰지 말 것
- sessionDate: startTime 이전이면 전날 날짜 (getSessionDate 참조)
- 아카이브: 마감할 때마다 고유 id로 누적 (같은 날 여러 개 가능), 카드 ✕로 삭제 가능
- 원본 정리 정책: 영상 완성 시 미디어 원본(사진/음성/클립) 즉시 정리(trimRecords), 영상 없이 마감한 항목은 3일 후 자동 정리(sweepArchive). 글 텍스트는 남음

## 배포 방법
이전 JS 번들을 지우면 캐시된 옛 index.html이 404를 맞아 하얀 화면이 되므로,
gh-pages를 clone한 뒤 덮어써서 이전 assets를 유지한다 (force push 금지).
```bash
cd /home/claude/repo/myhour
npm run build
cd /tmp && rm -rf deploy
git clone -q --depth 1 -b gh-pages <origin-url> deploy
cp -r /home/claude/repo/myhour/dist/. /tmp/deploy/
cd /tmp/deploy && git add -A && git commit -q -m "Deploy" && git push -q origin gh-pages
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
- `src/llmDirector.ts`: **claude-sonnet-5** 1회 호출(thinking disabled 필수)로 제목·마무리·무드·무드이모지·장면 자막·BGM 무드·기록별 이모지(recordEmojis) 수신. API 키가 있으면 localStorage에 저장해 브라우저 직접 호출(anthropic-dangerous-direct-browser-access 헤더), **없으면 자동으로 push-server의 `/director` 프록시로 대체 호출** (aiAvailable() 참조) — 친구 등 키 없는 사용자도 무료 체험 가능. 워커가 서버 키로 대신 호출하고 하루 총량 80회·기기(IP)당 15회로 제한(worker.js handleDirector)
- `src/videoGenerator.ts`: 1080×1920 렌더링. **mimeType 우선순위는 mp4를 webm보다 먼저** (2026-07-22 변경) — iOS Safari가 MediaRecorder로 webm '녹화' 자체는 지원해도 사진 앱이 webm을 영상으로 인식 못 해서, 에어드랍/공유해도 파일 앱에만 들어가고 사진 앱엔 저장 안 되는 문제가 있었음. mp4(h264)는 어디서든 정상 저장됨. 절대 webm을 다시 앞으로 올리지 말 것 BGM 무드 6종×3곡(public/bgm, 전곡 CC0, 랜덤 선곡+랜덤 시작 지점) + 음성/클립 소리 믹싱(BGM 더킹, 컷 페이드아웃). 영상·음성 장면은 3~5초(MEDIA_MAX)
- 음성 녹음은 16kHz WAV 직접 인코딩 (iOS mp4는 decodeAudioData 실패하는 버그 회피)
- AudioContext는 탭 제스처 직후 생성 필수 (iOS suspended 버그), 폰트/디코딩엔 타임아웃, 생성 실패 시 onWarn으로 폰에 에러 표시
- 녹화/녹음 UI: 5초 넘으면 "앞 5초만 담겨요" 안내 + 영상 미리보기 회색 전환
- 미리보기 루프: `npm run dev -- --port 5199` 후 /myhour/preview.html (장면 스크린샷), /myhour/gentest.html (생성 통합테스트, window.__blob으로 오디오 검증). Playwright는 playwright-core + executablePath '/opt/pw-browsers/chromium'
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

## 다음 과제 후보
- 앱스토어 출시 준비: Capacitor 래핑, API 프록시 서버(푸시 워커에 합치면 됨), 백업 강화, 과금 모델
