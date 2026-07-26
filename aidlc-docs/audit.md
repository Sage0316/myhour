# 하꾸 결정 기록

이 문서는 반복 대화와 중간 산출물을 압축한 결정 로그다. 상세 이력은 Git 기록에서 복구할 수 있다.

| 날짜 | 결정 | 반영 결과 |
|---|---|---|
| 2026-07-25 | AI-DLC 질문은 추천값으로 진행 | 권장 보안·테스트·설계 기준을 기본값으로 채택 |
| 2026-07-25 | 제품 출시명은 하꾸(hakku, 하루 꾸미기) | 사용자 노출 브랜드를 하꾸로 통일하고 저장소·경로 `myhour`는 호환성을 위해 유지 |
| 2026-07-25 | 코드 구현 직전까지 설계를 완료 | Application Design, Units Generation, U1–U7 Unit 설계 완료 |
| 2026-07-25 | 전수 검토에서 나온 개선점을 모두 구현 | 데이터·미디어·백업·AI·Push·접근성·성능·CI/배포 구조를 U1–U7로 구현 |
| 2026-07-25 | BGM 18곡을 삭제하지 않음 | `public/bgm`에 유지하되 초기 번들·서비스워커 precache에서 제외하고 선택 시 상대 URL로 지연 로딩 |
| 2026-07-25 | 변경사항을 GitHub에 게시하고 `main`에 병합 | 앱과 AI-DLC/Claude Code 자료가 원격 `main`에 반영됨 |
| 2026-07-25 | 132개 AI-DLC 문서를 합쳐 요약 | 실행에 필요한 상태·맥락·구현·결정 문서 5개로 축약 |

## 변하지 않는 제품 원칙

- 기록과 미디어는 로컬 우선이다.
- AI에는 명시적 동의 후 최소한의 텍스트·캡션만 전송한다.
- 비밀키와 private JWK를 저장소 또는 브라우저 저장소에 넣지 않는다.
- 데이터 마이그레이션과 기존 `myhour` 공개 경로의 호환성을 임의로 깨지 않는다.
- 실제 배포와 외부 시스템 변경은 별도 승인과 출시 게이트 통과 후 수행한다.

---

## Git 동기화 요청
**Timestamp**: 2026-07-25T23:48:14Z
**User Input**: "지금 메인 브랜치 내려받아"
**AI Response**: "미커밋 문서 변경을 보존한 채 원격 main을 내려받고 로컬 main 참조를 fast-forward 방식으로 최신화한다."
**Context**: 기존 작업 트리를 변경하지 않는 Git 동기화

---

## Git 명령 실행
**Timestamp**: 2026-07-26T00:16:19Z
**User Input**: "git fetch origin main && git checkout main && git pull"
**AI Response**: "`git fetch origin main`을 실행했으나 실행 환경의 GitHub 네트워크 연결 차단으로 실패했다. 후속 checkout과 pull은 실행하지 않았고 작업 트리를 보존했다."
**Context**: Git 동기화 실패 기록

---

## Git 명령 재실행
**Timestamp**: 2026-07-26T00:20:25Z
**User Input**: "git fetch origin main
git checkout main
git pull --ff-only"
**AI Response**: "`git fetch origin main`을 재실행했으나 현재 작업이 여전히 managed network-restricted 권한으로 실행되어 실패했다. 후속 명령은 실행하지 않았다."
**Context**: 네트워크 권한 변경 전 재시도

---
