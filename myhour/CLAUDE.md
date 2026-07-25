# 하꾸 개발 메모

하꾸(hakku, 하루 꾸미기)는 React 19 + TypeScript + Vite 8 기반의 로컬 우선 PWA입니다. GitHub Pages 호환을 위해 공개 경로와 Vite base는 `/myhour/`를 유지합니다.

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
