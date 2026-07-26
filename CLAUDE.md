# 하꾸 Claude Code Continuity

하꾸(hakku, 하루 꾸미기)는 `myhour/`에 있는 React 19 + TypeScript + Vite 기반 로컬 우선 PWA입니다. 저장소 식별자와 공개 경로는 호환성을 위해 `myhour`를 유지하지만 사용자 노출 제품명은 하꾸/HAKKU입니다.

모든 소프트웨어 작업을 시작하기 전에 반드시 루트 `AGENTS.md`를 끝까지 읽고 그 AI-DLC 규칙을 우선 적용하세요. `AGENTS.md`가 참조하는 세부 규칙은 `.aidlc-rule-details/`에서 읽습니다.

## 세션 시작 시 읽을 문서

1. `AGENTS.md` — 이 저장소에 설치된 AI-DLC 실행 규칙
2. `aidlc-docs/README.md` — 통합 문서 안내
3. `aidlc-docs/aidlc-state.md` — 현재 단계, 검증 결과, 외부 출시 게이트
4. `aidlc-docs/PROJECT_CONTEXT.md` — 제품·UX·아키텍처·데이터·보안 요구사항
5. `aidlc-docs/IMPLEMENTATION_SUMMARY.md` — U1–U7 구현 결과와 의도적 제한
6. `aidlc-docs/audit.md` — 사용자 승인과 핵심 결정
7. 세부 작업을 시작할 때 `AGENTS.md`가 지정한 `.aidlc-rule-details/` 규칙

앱 내부 명령과 구조는 `myhour/CLAUDE.md` 및 `myhour/README.md`를 따릅니다.

## 현재 구현 상태

- U1–U7 설계와 로컬 구현 완료
- `myhour`에서 `pnpm check` 통과: zero-warning lint, 16개 테스트, Worker 검증, 프로덕션 빌드
- Chromium 브라우저 흐름, dialog 포커스 복귀, 콘솔 오류, axe critical 검증 통과
- GitHub Actions CI, 동일 artifact Pages 배포·롤백, Worker preview/production 및 버전 롤백 구성 완료
- 앱과 AI-DLC/Claude Code 자료는 `main`에 병합됨
- 외부 배포는 하지 않았으며 최근 원격 CI가 `pnpm run check`에서 실패해 진단이 필요함

## 지켜야 할 제품 정책

- **BGM 21곡은 R2(`myhour-media`)에 두고 `hakku-media` 워커가 정적 파일로 내보낸다.**
  2026-07-26 사용자 승인으로 `myhour/public/bgm`에서 옮겼다 — 배포본 118MB 중 114MB(96.6%)가
  오디오였다. 원래 정책의 의도(앱 시작을 오디오가 막지 않게)는 그대로 유지된다.
- BGM을 초기 JavaScript 번들이나 서비스워커 install precache에 포함하지 않는다.
- 사용자가 선택한 곡의 URL만 영상 생성 시 지연 로딩한다.
- **BGM은 CORS 허용 응답으로 받아야 한다.** 영상 생성이 `fetch → arrayBuffer → decodeAudioData`로
  바이트를 읽기 때문이다. `<audio src>` 재생만 하는 시청 페이지는 CORS 없이도 되므로,
  이걸 빼면 "시청 페이지에선 들리는데 영상엔 음악이 없다"는 헷갈리는 증상이 된다.
- 기록과 미디어는 로컬 우선으로 보관하며, AI에는 명시적 동의 후 텍스트와 캡션만 보호된 Worker를 통해 전송한다.
- 비밀키와 private JWK는 저장소에 추가하지 않는다.
- 기존 `myhour` URL, 저장 키, 데이터 마이그레이션 호환성을 임의로 깨지 않는다.

## 외부 출시 전 남은 게이트

- BGM 21곡의 출처·저작자·배포 라이선스 근거 확정 (2026-07-20 감사에서 전곡 CC0 확인 — myhour/CLAUDE.md 참고)
- 실제 iOS 16.4+ 및 Android Chromium 기기 검증
- GitHub/Cloudflare 환경 변수·KV·secret 설정
- 실제 배포와 Pages/Worker 롤백 리허설
- GitHub Pages에서 지원되지 않는 `_headers` 요구사항의 운영 호스팅 결정
