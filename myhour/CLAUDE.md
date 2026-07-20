# MYHOUR 프로젝트

## 개요
하루를 기록하고 영상으로 마무리하는 iOS 스타일 PWA. React + TypeScript + Vite.
배포: https://sage0316.github.io/myhour/

## 기술 스택
- Vite 8 + React + TypeScript
- GitHub Pages 배포 (`base: '/myhour/'`)
- Canvas API + MediaRecorder로 클라이언트 WebM 영상 생성

## 저장소 구조
- localStorage: records, settings, archive (`myhour_v1`, `myhour_settings_v1`, `myhour_archive_v1`), API 키(`myhour_anthropic_key`), AI 결과(`myhour_director_${date}`)
- IndexedDB: 영상 blob (`myhour_videos_v1`), 키: 클립 `video_${ts}`, 완성 영상 `wrapped_${entry.id}` (구버전은 `wrapped_${date}`, archiveVideoKey 참조)
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

## 현재 앱 흐름
1. 홈/오늘 탭에서 기록 추가 (텍스트/사진/영상/음성)
2. 하루 마감 → WrapUpScreen → 영상 생성 → 아카이브 자동 저장 + 오늘 탭 클리어 → 아카이브 이동
3. 아카이브에서 과거 기록 및 영상 보기/다운로드

## 주요 구조 (2026-07-19 기준)
- `src/scenes.ts`: 영상 장면 렌더러. 글=그림일기 틀(진한 회색 테두리+낙서 원 안에 내용 이모지+줄노트), 사진=풀스크린+무드 이모지 스캐터, 음성=실제 녹음 파형이 무드 색으로 차오름(computeEnvelope), 짤(meme)=폴라로이드/스크랩북 2종이 id 기준 랜덤(사용자 캡션이 손글씨로, 테이프·밑줄은 무드색), 마무리=블랙 카드
- 손글씨 폰트: **개구(Gaegu, OFL)** public/fonts, ensureDiaryFont. 2026-07 크레파스 느낌으로 교체 (이전: 나눔손글씨 펜). 최종 후보였던 감자꽃(Gamja Flower)도 좋았음 — 나중에 폰트 바꿀 일 있으면 참고. 폰트는 fonts.googleapis.com css2 API에서 ttf URL 얻어 fonts.gstatic.com에서 받으면 됨 (이 세션 네트워크에서 열려 있었음)
- 앨범(meme) 타입: RecordType 'meme'(라벨 '앨범', 색 #F9E9A6). 별도 탭이 아니라 **사진 모드 안에서 "지금 촬영/앨범에서 선택" 두 갈래** — 촬영=photo(풀스크린 장면), 앨범 선택=meme(폴라로이드/스크랩북 장면, 캡션이 손글씨). 앨범 input은 capture 속성 없음(카메라 강제 방지). 정리 정책은 사진과 동일. **주의: seededRnd(LCG)는 이웃 시드의 첫 값이 거의 같아서 Date.now() 기반 id로 분기하려면 rnd() 두 번 버리고 써야 함** (drawMemeScene 참조)
- `src/llmDirector.ts`: **claude-sonnet-5** 1회 호출(thinking disabled 필수)로 제목·마무리·무드·이모지·장면 자막·BGM 무드·그림일기 이모지 수신. API 키는 localStorage, 브라우저 직접 호출(anthropic-dangerous-direct-browser-access 헤더)
- `src/videoGenerator.ts`: 1080×1920 렌더링. BGM 무드 6종×3곡(public/bgm, 전곡 CC0, 랜덤 선곡+랜덤 시작 지점) + 음성/클립 소리 믹싱(BGM 더킹, 컷 페이드아웃). 영상·음성 장면은 3~5초(MEDIA_MAX)
- 음성 녹음은 16kHz WAV 직접 인코딩 (iOS mp4는 decodeAudioData 실패하는 버그 회피)
- AudioContext는 탭 제스처 직후 생성 필수 (iOS suspended 버그), 폰트/디코딩엔 타임아웃, 생성 실패 시 onWarn으로 폰에 에러 표시
- 녹화/녹음 UI: 5초 넘으면 "앞 5초만 담겨요" 안내 + 영상 미리보기 회색 전환
- 미리보기 루프: `npm run dev -- --port 5199` 후 /myhour/preview.html (장면 스크린샷), /myhour/gentest.html (생성 통합테스트, window.__blob으로 오디오 검증). Playwright는 playwright-core + executablePath '/opt/pw-browsers/chromium'
- 설정 맨 아래 빌드 버전 표시 (vite define __BUILD_VERSION__) — "고쳤는데 안 돼요"는 먼저 버전 확인
- SW는 same-origin navigate만 처리 (외부 API 요청 건드리면 안 됨). 배포 반영은 CDN 캐시 때문에 최대 10분 + 앱 재시작 필요
- 무료 음원 추가는 GitHub의 0lhi/FreePD(퍼블릭 도메인) 미러에서. 시청 페이지: /myhour/bgm.html
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
