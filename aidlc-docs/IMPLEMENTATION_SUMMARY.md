# 하꾸 구현 요약

## U1–U7 결과

| Unit | 구현 결과 |
|---|---|
| U1 도메인·영속성 | 안정적인 ID, 런타임 스키마, 단계적 쓰기, 마이그레이션, 전체 미디어 저장소와 경계 테스트 도입 |
| U2 캡처·미디어 수명주기 | 모든 미디어를 IndexedDB에 저장하고 용량 검사, 실패 보상, 고아 Blob 정리, 슬롯별 복수 기록과 보이는 삭제 흐름 구현 |
| U3 영상 생성·아카이브 | 생성 서비스 경계, 취소·진행률·자원 해제, 720×1280 출력, 분위기·이모지·BGM 반영, 안정 ID 아카이브 구현 |
| U4 백업·복원 | `.hakku.zip` 내보내기, 경로·개수·크기·CRC·SHA·스키마·중복 검증, 복원 실패 보상과 고아 정리 구현 |
| U5 AI 연출 | 브라우저 API 키와 직접 호출 제거, 동의 UI, 최소 텍스트 DTO, HMAC 설치 토큰, Origin·크기·출력·할당량 검증 Worker 구현 |
| U6 Push | 설치 소유권, 일정 동기화, Origin·만료·멱등성 검증, 왕복·인증 테스트, endpoint allowlist와 환경 분리 구현 |
| U7 공개 베타 전달 | 하꾸 브랜딩, PWA, 접근성 개선, BGM 지연 로딩, CI·Pages·Worker preview/production·롤백 구성과 운영 문서 구현 |

## 주요 코드 위치

- 앱 진입·상태: `myhour/src/App.tsx`, `myhour/src/context.tsx`
- 도메인·저장: `myhour/src/store.ts`와 관련 저장소·스키마 모듈
- 화면: `myhour/src/screens/`
- 영상: `myhour/src/videoGenerator.ts`
- AI: `myhour/src/llmDirector.ts`, AI Worker 구성
- Push: `myhour/push-server/`
- PWA/BGM: `myhour/public/`, Vite/PWA 설정
- CI·배포: `.github/workflows/`, 배포·롤백 스크립트와 운영 문서

## 검증 완료 기준

구현 완료 시점의 로컬 검증은 ESLint zero-warning, Vitest 16개, Worker 검증 3개, 프로덕션 빌드, Chromium 핵심 사용자 흐름, dialog focus 복귀, 콘솔 오류, axe critical 항목을 포함해 통과했다.

## 의도적 제한과 후속 작업

- 백업은 무결성을 검증하지만 암호화하지 않는다.
- BGM 18곡은 삭제·축소하지 않았고 선택 시에만 지연 로딩한다.
- GitHub Pages는 `_headers`를 적용하지 않으므로 보안 헤더가 필요한 운영 호스팅을 결정해야 한다.
- 실제 Worker 자원과 secret은 저장소에 없으며 배포 환경에서 설정해야 한다.
- 현재 변경은 `main`에 있으나 외부 배포는 하지 않았다.
- 최근 원격 CI가 `pnpm run check`에서 실패했으므로 배포 전에 로그를 진단하고 전체 검증을 다시 통과시켜야 한다.
