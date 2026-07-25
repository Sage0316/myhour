# U6 Code Summary

- 푸시 구독 등록·수정·삭제에 설치별 HMAC bearer token과 소유권 검사를 적용했다.
- 시간/간격 변경 시 원격 일정을 자동 동기화한다.
- 요청 크기·스키마·Origin 제한, 만료 구독 정리와 전달 슬롯 멱등성을 구현했다.
- Web Push aes128gcm 왕복, 인증/Origin/구독 검증 테스트를 통과했다.

배포 전 KV, VAPID 및 token secret, 공개 빌드 변수를 설정해야 한다.
## Gap completion

- `PUSH_RATE_LIMITER` binding을 추가해 설치 토큰 발급은 연결 IP, 인증된 변경 요청은 설치 ID 기준으로 제한한다.
- 허용된 Web Push 공급자 HTTPS endpoint만 구독할 수 있게 했고 거부·속도 제한 테스트를 추가했다.
- preview와 production의 KV, Origin, rate-limit namespace를 분리하고 정확한 Worker 버전 롤백 경로를 추가했다.
