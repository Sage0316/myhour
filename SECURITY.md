# Security

취약점은 공개 이슈 대신 저장소 소유자에게 비공개로 제보해 주세요. 재현 절차, 영향 범위, 브라우저/OS, 가능하면 최소 PoC를 포함해 주세요.

- 공급자 API 키와 VAPID 비밀키는 Worker secret으로만 관리합니다.
- `.env`, JWK, 토큰, 백업 파일은 커밋하지 않습니다.
- AI/Push Worker는 정확한 Origin 허용 목록, 본문 크기 제한, 입력 검증, 설치별 서명 토큰을 사용합니다.
- 설치 토큰 발급과 인증 API에는 Cloudflare rate-limit binding을 적용하며, Push 구독 endpoint는 허용된 공급자 HTTPS 호스트만 받습니다.
- 사용자 백업은 경로·크기·SHA-256을 검증한 뒤 트랜잭션에 준해 복원합니다.

의존성 경보와 CI 실패는 배포 전에 처리하고, 키 노출이 의심되면 즉시 폐기·회전합니다.
