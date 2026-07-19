# MYHOUR 푸시 서버 배포 순서

Cloudflare Workers 무료 플랜으로 동작. 이 디렉토리에서:

1. `npx wrangler login` (또는 `CLOUDFLARE_API_TOKEN` 환경변수)
2. `npx wrangler kv namespace create SUBS` → 출력된 id를 wrangler.toml의 `REPLACE_WITH_KV_ID`에 넣기
3. `npx wrangler secret put VAPID_PRIVATE_JWK` → vapid-keys.json의 `privateJwk` 객체를 JSON 문자열로 붙여넣기
4. `npx wrangler deploy` → 출력된 워커 URL (예: https://myhour-push.<계정>.workers.dev)
5. 앱의 `src/push.ts`에서 `PUSH_SERVER_URL`을 그 URL로 바꾸고 앱 재배포

## 확인
- `curl https://<워커URL>/health` → `{"ok":true}`
- 앱 설정에서 알림 켜기 → 즉시 테스트 푸시가 와야 정상

## 주의
- VAPID 비밀키(vapid-keys.json)는 절대 저장소에 커밋하지 말 것
- 크론은 30분 단위 — 앱의 기록 간격(30/60/120분)과 맞물려 동작
