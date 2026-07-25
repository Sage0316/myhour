# 하꾸 AI Worker

브라우저에 공급자 키를 노출하지 않고 하루 기록의 텍스트와 캡션만 분석하는 Cloudflare Worker입니다.

1. `wrangler.toml`의 KV ID, 허용 Origin, 지원 모델 ID, 고유 rate-limit namespace ID를 설정합니다.
2. `ANTHROPIC_API_KEY`, `INSTALL_TOKEN_SECRET`을 Worker secret으로 등록합니다.
3. 배포 URL을 앱 빌드의 `VITE_AI_WORKER_URL`로 지정합니다.

설치별 서명 토큰, Origin 제한, 220KB 본문 제한, 입력·출력 스키마 검증, 설치별 일 20회 제한을 적용합니다. `AI_RATE_LIMITER`는 토큰 발급을 연결 IP 기준, 인증 요청을 설치 ID 기준으로 분당 제한합니다.
