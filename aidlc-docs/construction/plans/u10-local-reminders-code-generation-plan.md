# U10 예약 알림 — 코드 생성 계획

- [x] 기능 설계 `construction/u10-local-reminders/functional-design.md`
- [x] `@capacitor/local-notifications` 8.3.1 설치, iOS 프로젝트에 동기화
- [x] `planReminders` 순수 함수와 테스트 5개(속성 테스트 포함)
- [x] `localReminders` 래퍼: 권한 요청, 3일분 예약, 전체 취소
- [x] 설정 스위치: 앱이면 예약 알림, 웹이면 웹 푸시
- [x] 앱 전역 다시 걸기: 설정·마감 변경, 앱 복귀
- [x] `pnpm check`(테스트 77개), e2e 통과
