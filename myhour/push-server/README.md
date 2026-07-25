# 하꾸 Push Worker

Cloudflare Workers와 KV로 설치별 알림 구독 및 30분 크론을 처리합니다.

1. `wrangler kv namespace create SUBS`의 ID를 `wrangler.toml`에 설정합니다.
2. 고유 rate-limit namespace ID와 허용 Origin·Push endpoint 호스트·VAPID 공개키를 설정합니다.
3. `VAPID_PRIVATE_JWK`, `INSTALL_TOKEN_SECRET`을 Worker secret으로 등록합니다.
4. 앱 빌드에 `VITE_PUSH_SERVER_URL`, `VITE_VAPID_PUBLIC_KEY`를 지정합니다.

설치별 서명 토큰, 구독 소유권 검증, 요청 크기·입력 스키마·Origin·Push 공급자 제한, 전달 슬롯 멱등성을 적용합니다. `PUSH_RATE_LIMITER`는 토큰 발급을 연결 IP 기준, 인증 요청을 설치 ID 기준으로 분당 제한합니다. 비밀키는 저장소에 커밋하지 마세요.
