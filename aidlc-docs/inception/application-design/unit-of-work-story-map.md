# 하꾸 Unit-to-Story Map

## Assignment Rules

- 17개 Story는 각각 정확히 하나의 primary Unit을 가진다.
- supporting Unit은 계약, 저장, 배포 또는 통합 책임만 가진다.
- primary Unit은 Story의 사용자 수용 기준과 최종 증거를 소유한다.

## Complete Story Assignment

| Story | Primary Unit | Supporting Units | Integration Checkpoint |
|---|---|---|---|
| US-001 기록을 올바른 시간 슬롯에 저장 | U1 | U2, U3 | CP1, CP3 |
| US-002 모든 미디어를 영속 저장 | U2 | U1, U3, U4 | CP2, CP3 |
| US-003 미디어 수명과 저장공간을 안전하게 관리 | U2 | U1, U3 | CP2, CP3 |
| US-004 기존 데이터를 안전하게 마이그레이션 | U1 | U2, U4, U7 | CP1, CP5 |
| US-005 동작하는 마감 제어만 사용 | U3 | U1, U6 | CP3 |
| US-006 생성된 아카이브를 즉시 열기 | U3 | U1, U2 | CP3 |
| US-007 모바일에서 안정적으로 하루 영상 생성 | U3 | U1, U2, U7 | CP3, CP5 |
| US-008 전체 저널을 검증 가능한 파일로 백업 | U4 | U1, U2, U7 | CP3, CP5 |
| US-009 백업을 검증하고 원자적으로 복원 | U4 | U1, U2, U7 | CP3, CP5 |
| US-010 동의 후 보호된 AI 연출 사용 | U5 | U1, U3, U7 | CP4, CP5 |
| US-011 중복 없는 로컬 시간 Push 알림 | U6 | U1, U3, U7 | CP4, CP5 |
| US-012 설치가 소유한 Push 설정만 변경 | U6 | U1, U7 | CP4, CP5 |
| US-013 안전한 웹·Worker 실행 환경 구성 | U7 | U5, U6 | CP5 |
| US-014 변경을 자동 품질 게이트로 검증 | U7 | U1, U2, U3, U4, U5, U6 | CP5 |
| US-015 관측 가능하고 되돌릴 수 있는 베타 배포 | U7 | U5, U6 | CP5 |
| US-016 변경된 사용자 흐름을 접근 가능하게 사용 | U3 | U7 | CP3, CP5 |
| US-017 베타의 데이터 사용과 한계를 이해 | U7 | U1, U4, U5, U6 | CP5 |

## Unit Coverage

| Unit | Primary Story Count | Stories |
|---|---:|---|
| U1 | 2 | US-001, US-004 |
| U2 | 2 | US-002, US-003 |
| U3 | 4 | US-005, US-006, US-007, US-016 |
| U4 | 2 | US-008, US-009 |
| U5 | 1 | US-010 |
| U6 | 2 | US-011, US-012 |
| U7 | 4 | US-013, US-014, US-015, US-017 |
| **Total** | **17** | **US-001–US-017** |

## Requirements Coverage by Unit

| Requirement | Primary Unit | Supporting Unit |
|---|---|---|
| FR-001 | U1 | U2, U3 |
| FR-002 | U2 | U1 |
| FR-003 | U1 | U2, U4 |
| FR-004 | U4 | U1, U2 |
| FR-005 | U3 | U6 |
| FR-006 | U3 | U1, U2 |
| FR-007 | U3 | U2, U7 |
| FR-008 | U5 | U1, U3, U7 |
| FR-009 | U6 | U1, U3, U7 |
| FR-010 | U6 | U1, U7 |
| FR-011 | U7 | U5, U6 |
| FR-012 | U7 | U1–U6 |
| FR-013 | U7 | U1, U4, U5, U6 |
| NFR-001 | U7 | U1, U4, U5, U6 |
| NFR-002 | U7 | U4, U5, U6 |
| NFR-003 | U1 | U2–U6 |
| NFR-004 | U3 | U2, U4, U7 |
| NFR-005 | U7 | U1, U2, U3, U4, U6 |
| NFR-006 | U7 | U5, U6 |
| NFR-007 | U7 | U1–U6 |
| NFR-008 | U3 | U7 |

## Security Baseline Unit Map

| Rule | Primary Units | Status |
|---|---|---|
| SECURITY-01 | U4, U5, U7 | Compliant |
| SECURITY-02 | U6, U7 | Compliant |
| SECURITY-03 | U5, U6, U7 | Compliant |
| SECURITY-04 | U7 | Compliant |
| SECURITY-05 | U1, U2, U4, U5, U6 | Compliant |
| SECURITY-06 | U5, U7 | Compliant |
| SECURITY-07 | — | N/A: VPC와 network ACL 구성요소가 없음 |
| SECURITY-08 | U5, U6 | Compliant |
| SECURITY-09 | U5, U6, U7 | Compliant |
| SECURITY-10 | U7 | Compliant |
| SECURITY-11 | U5, U6 | Compliant |
| SECURITY-12 | U5, U6, U7 | Compliant |
| SECURITY-13 | U1, U2, U4, U6, U7 | Compliant |
| SECURITY-14 | U7 | Compliant |
| SECURITY-15 | U1–U7 | Compliant |

적용 가능한 Security Baseline 규칙이 최소 하나의 primary Unit과 완료 조건에 연결되었으며 차단 누락이 없다.

## Property-Based Testing Unit Map

| Rule | Primary Units | Status |
|---|---|---|
| PBT-02 | U1, U4, U7 | Compliant |
| PBT-03 | U1, U4, U6, U7 | Compliant |
| PBT-07 | U1, U4, U6, U7 | Compliant |
| PBT-08 | U1, U4, U6, U7 | Compliant |
| PBT-09 | U1, U7 | Compliant |

선택된 PBT 규칙은 생성기·실행 기반을 U1에서 소유하고 도메인별 속성을 U4와 U6이 추가하며 U7이 CI evidence를 통합한다.

## Story Completeness Validation

- Primary assignment rows: 17
- Unique primary Story IDs: 17
- Missing Story IDs: None
- Duplicate primary assignments: None
- Stories without acceptance criteria source: None
- Units without primary Stories: None
