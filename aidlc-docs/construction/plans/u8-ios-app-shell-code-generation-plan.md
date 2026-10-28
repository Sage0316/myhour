# U8 iOS 앱 틀 — 코드 생성 계획

실행 계획 승인으로 계획 승인을 갈음한 단위다. Apple 계정 없이 할 수 있는 범위만 다룬다.

## 단계
- [x] Capacitor 8.5.3 설치 (`@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`)
- [x] `capacitor.config.ts`: 앱 ID `com.hakku.app`, 이름 `하꾸`, `webDir: dist`, 웹뷰 contentInset never, 종이색 배경
- [x] 앱용 빌드 모드: `vite build --mode app`은 상대 경로(`./`), 웹 빌드는 기존 `/myhour/` 유지. `pnpm build:app` 스크립트
- [x] 앱 안(`capacitor:`)에서는 서비스워커 등록 생략
- [x] `cap add ios`로 Xcode 프로젝트 생성 (Swift Package Manager, iOS 15+)
- [x] Info.plist: 한국어 기본, 아이폰 전용(TARGETED_DEVICE_FAMILY 1), 세로 고정, 라이트 모드, 어두운 상태 표시줄 글씨, arm64, 카메라·마이크·사진 읽기·사진 저장 권한 문구, 암호화 수출 규정 면제(HTTPS만 사용)
- [x] 앱 아이콘(기존 하꾸 브랜드 마크, 1024px, 알파 채널 없음), 실행 화면은 캐패시터 로고 대신 종이색 단색
- [x] GitHub Actions `iOS build check`: macOS 러너에서 서명 없이 시뮬레이터용 컴파일 확인
- [x] `pnpm check`, e2e 통과, 웹 빌드 경로 변화 없음 확인

## 다음 단위로 넘기는 것
- 웹 푸시 → 폰 예약 알림 (U10)
- 다운로드 링크·navigator.share → 사진 앱 저장·공유 시트 (U11)
- AI·Media Worker 허용 주소에 `capacitor://localhost` 추가 (U9) — 그 전까지 앱에서는 AI 연출과 BGM이 막힌다
- 서명·TestFlight (U15, Apple 계정 필요)
