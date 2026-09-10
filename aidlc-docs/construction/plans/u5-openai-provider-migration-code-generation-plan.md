# U5 OpenAI 제공자 전환 코드 생성 계획

- [x] 요구사항과 경계 확정: 기존 Worker 보안·할당량 유지, `gpt-5.6-sol` 사용, 실제 배포·유료 호출 제외
- [x] OpenAI Responses API 요청 계약을 모의 테스트로 고정
- [x] Worker 제공자 호출을 OpenAI Responses API로 교체
- [x] Worker 설정·오류 안내·운영 문서를 최소 범위로 갱신
- [x] 운영 배포가 무관한 Push Worker를 건드리지 않도록 AI 전용 배포 범위 추가
- [x] 로컬 품질 검증 실행
- [x] 결과와 다음 배포 조건 기록

## 검증 결과

- `pnpm run check` 통과: lint, 단위 테스트 72개, Worker 테스트, 타입 검사, 프로덕션 빌드
- OpenAI 요청은 모의 응답으로 검증했으며 실제 API 호출은 하지 않았다.
- `OPENAI_API_KEY`는 Cloudflare 운영 Worker secret으로 등록했고, 승인 후 변경 코드와 Worker 및 앱 배포까지 완료했다.
- `Deploy Workers`의 `worker: ai` 범위로 운영 AI Worker만 배포하고 Push Worker는 재배포하지 않는다.
- `ab1ca7e` 기준 CI, GitHub Pages, 운영 AI Worker 배포가 성공했고 `/health`와 CORS 검증도 통과했다.

## 승인 근거

- 사용자가 OpenAI API로의 전환을 요청했다.
- Mini보다 좋은 모델을 원했고, `gpt-5.6-sol` 추천에 “응”으로 승인했다.
- OpenAI API 키 값은 저장소·문서·채팅에 남기지 않고 Cloudflare 운영 Worker secret으로만 등록했다.
