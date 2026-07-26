# 하꾸 AI-DLC 문서

AI-DLC 진행 중 생성된 132개 문서를 실제 유지보수에 필요한 5개 문서로 통합했다. 삭제된 세부 산출물은 Git 기록에서 복구할 수 있다.

1. `aidlc-state.md` — 현재 단계, 검증 결과, 출시 게이트
2. `PROJECT_CONTEXT.md` — 제품·UX·아키텍처·데이터·보안 요구사항
3. `IMPLEMENTATION_SUMMARY.md` — U1–U7 구현 결과와 코드 위치
4. `audit.md` — 사용자 승인과 핵심 결정
5. `README.md` — 문서 안내

AI-DLC 실행 규칙은 문서 수에 포함하지 않고 저장소 루트 `AGENTS.md`와 `.aidlc-rule-details/`에 유지한다. Claude Code는 루트 `CLAUDE.md`에서 위 문서를 순서대로 읽는다.
