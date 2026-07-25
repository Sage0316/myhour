# U5 Code Summary

- 브라우저의 Anthropic 키 입력·저장·직접 호출을 제거했다.
- 명시적 동의, 최소 텍스트 DTO, 설치별 HMAC bearer token, 정확한 Origin, 본문/출력 검증과 일일 한도를 구현했다.
- 공급자 키는 AI Worker secret으로만 사용하고 사진·영상·음성은 전송하지 않는다.
- Worker 인증/Origin/입력 거부 테스트와 운영 설정 문서를 추가했다.

배포 전 KV ID, 지원 모델 ID, Origin, provider/token secret 설정이 필요하다.
## Gap completion

- `AI_RATE_LIMITER` binding을 추가해 설치 토큰 발급은 연결 IP, 인증된 AI 요청은 설치 ID 기준으로 제한한다.
- preview와 production의 KV, Origin, rate-limit namespace를 분리하고 수동 배포 워크플로와 정확한 Worker 버전 롤백 경로를 추가했다.
