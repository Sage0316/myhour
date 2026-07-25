# U7 Code Summary

- 제품명을 하꾸/HAKKU로 통일하고 기존 URL·저장 식별자는 호환성을 위해 유지했다.
- PWA 오프라인 셸, 보안 헤더, reduced-motion/포커스/시맨틱 탐색을 적용했다.
- BGM 18곡을 `public/bgm` 정적 자산으로 유지하고, 초기 JavaScript 번들과 서비스워커 precache에서는 제외했다. 사용자가 선택한 상대 URL 한 곡만 영상 생성 시 지연 로딩하고 이후 런타임 캐시한다.
- zero-warning lint, 16개 단위 테스트, 3개 Worker 검증, 프로덕션 빌드, Chromium/axe 검증을 자동화했다.
- CI, 수동 Pages 배포 워크플로와 README·개인정보·보안·운영·기여·출시 체크리스트를 추가했다.

외부 배포는 실행하지 않았다. BGM 18곡의 배포 라이선스 근거 확인이 출시 게이트로 남는다.
## Gap completion

- 모든 모달에 포커스 진입·순환·ESC 닫기·실행 요소 복귀를 적용하고 브라우저에서 실제 흐름을 검증했다.
- `main` CI가 SHA-256 manifest를 포함한 `hakku-dist`를 만들며, Pages 배포와 롤백은 지정한 CI run의 동일 artifact만 검증 후 사용한다.
- PR은 14일 보존 preview artifact를 만들고, Worker preview/production 환경과 정확한 버전 ID 롤백 워크플로를 분리했다.
- 앱 폴더 README와 운영·보안·출시 문서를 현재 로컬 우선 저장, AI/Push 전송, 18곡 지연 로딩, 배포·롤백 동작에 맞췄다.
