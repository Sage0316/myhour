# 하꾸 AI-DLC 상태

최종 갱신: 2026-09-10

## 현재 상태

- 제품: 하꾸(hakku, 하루 꾸미기)
- 저장소: `Sage0316/myhour`
- 앱 루트: `myhour/`
- 개발 방식: Brownfield, 로컬 우선 PWA
- AI-DLC 단계: 설계, Units Generation, U1–U7 구현과 로컬 검증 완료
- Git 상태: OpenAI 전환과 AI 전용 배포 범위를 `main` 커밋 `ab1ca7e`까지 게시함
- 배포 상태: GitHub Pages와 운영 `hakku-ai` Worker에 OpenAI 전환 배포 완료, Push Worker는 재배포하지 않음
- 원격 CI: `ab1ca7e` CI, Pages, AI Worker 배포 모두 성공

## 2026-09-10 진행 상태

- U5 AI Worker의 외부 호출을 Anthropic/AI Gateway에서 OpenAI Responses API로 교체했다.
- 모델은 `gpt-5.6-sol`, reasoning effort는 `low`로 고정했고 Structured Outputs와 `store: false`를 적용했다.
- `OPENAI_API_KEY`는 2026-09-10 Cloudflare 운영 Worker secret으로 등록했으며 값은 저장소와 문서에 남기지 않았다.
- `pnpm run check`에서 lint, 단위 테스트 72개, Worker 테스트, 타입 검사와 프로덕션 빌드가 모두 통과했다.
- 비용 없는 운영 `/health` 검증은 HTTP 200, `{"ok":true}`, GitHub Pages Origin CORS 허용으로 통과했다.
- 다음 단계는 사용자의 실제 앱에서 AI 영상 생성 1회를 확인하는 것이다. 이 요청부터 OpenAI API 비용이 발생할 수 있다.

## 적용된 확장

- Security Baseline: 적용
- Property-Based Testing: 슬롯·저장·백업·Worker 경계에 적용
- Resiliency: 별도 확장 미적용, 필요한 보상·재시도·멱등성은 Unit 설계에 포함

## 검증 근거

최신 로컬 구현 기준:

- ESLint zero-warning
- Vitest 72개 통과
- AI·Push·Media Worker 검증 통과
- 프로덕션 빌드 통과
- Chromium 핵심 흐름, dialog 포커스 복귀, 콘솔 오류, axe critical 검증 통과

위 결과는 OpenAI 전환의 외부 배포 성공을 의미하지 않는다.

## 출시 전 게이트

1. 원격 CI 실패 원인 수정 및 전체 품질 게이트 재통과
2. BGM 18곡의 출처·저작자·배포 라이선스 근거 확정
3. 실제 iOS 16.4+ 및 Android Chromium 기기 검증
4. GitHub/Cloudflare 환경 변수, KV, secret, VAPID 설정
5. Pages와 Worker의 preview/production 배포 및 롤백 리허설
6. GitHub Pages에서 지원되지 않는 보안 헤더의 운영 호스팅 결정

## 다음 작업

코드 구현 직전 단계가 아니라 출시 준비 단계다. 다음 담당자는 먼저 실패한 CI 로그를 확인하고, 수정 후 전체 검증을 재실행해야 한다. 실제 배포는 사용자 승인을 받은 뒤 진행한다.
