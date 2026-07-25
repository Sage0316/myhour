# 운영 안내

## 품질 게이트

1. `myhour`에서 `pnpm install --frozen-lockfile && pnpm check`를 실행합니다.
2. Chromium 설치 후 `pnpm test:e2e`로 주요 흐름과 axe 검사를 실행합니다.
3. PR은 `hakku-preview-<PR 번호>`라는 14일 보존 빌드 artifact를 만듭니다. GitHub Pages의 공식 PR preview 배포 기능은 공개 제공 상태가 아니므로 이 artifact는 검토용이며 URL 배포가 아닙니다.
4. `main` CI는 `hakku-dist`와 `SHA256SUMS`를 30일 보존합니다.

## 배포

- GitHub Actions Variables에 `VITE_AI_WORKER_URL`, `VITE_PUSH_SERVER_URL`, `VITE_VAPID_PUBLIC_KEY`를 등록합니다.
- `Deploy GitHub Pages`에 성공한 `main` CI run ID를 입력합니다. 워크플로는 해당 run의 `hakku-dist`를 내려받아 SHA-256을 검증한 뒤, 다시 빌드하지 않고 그 artifact를 배포합니다.
- `Deploy Workers`는 `preview`와 `production` 환경을 분리합니다. 각 GitHub Environment에 Cloudflare 자격 증명을 두고, Worker별 KV ID·허용 Origin·모델 ID·secret을 먼저 설정합니다.
- AI/Push Worker는 Cloudflare rate-limit binding을 사용합니다. 설치 토큰 발급은 연결 IP, 인증된 API는 설치 ID 기준으로 제한합니다.

## 롤백

- Pages: `Roll back GitHub Pages`에 정상 동작했던 `main` CI run ID와 `ROLLBACK`을 입력합니다. 보존 기간이 지난 artifact는 사용할 수 없습니다.
- Worker: Cloudflare 배포 내역에서 정상 버전 ID를 확인한 뒤 `Roll back Worker`에 Worker, 버전 ID, `ROLLBACK`을 입력합니다. KV 등 외부 상태는 Worker 버전 롤백에 포함되지 않으므로 스키마 호환성을 먼저 확인합니다.

## 장애 대응

- AI 장애: `VITE_AI_WORKER_URL`을 비운 검증 artifact로 롤백하면 로컬 추천으로 자동 전환됩니다.
- Push 장애: 앱의 기록 기능은 계속 동작합니다. Worker 오류율, KV, VAPID 만료와 구독 정리 상태를 확인합니다.
- 데이터 문제: 쓰기를 중단하고 `.hakku.zip` 백업을 보존한 뒤 무결성 검사 로그를 확인합니다.
- 비밀 노출: 공급자 키, VAPID private JWK, 설치 토큰 secret을 폐기·회전하고 Worker를 재배포합니다.

GitHub Pages에서는 `public/_headers`가 응답 헤더로 적용되지 않습니다. 보안 헤더가 필수인 운영 환경은 해당 파일을 지원하는 정적 호스팅을 사용하고 실제 응답을 점검해야 합니다.
