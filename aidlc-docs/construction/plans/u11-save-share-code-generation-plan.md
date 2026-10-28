# U11 영상 저장·공유 — 코드 생성 계획

## 목표
iOS 앱(WKWebView)에서는 `a.download`가 동작하지 않고 웹 공유 API도 믿을 수 없어서, 하루 영상 저장과 전체 백업 내보내기가 막힌다.
앱에서는 iOS 공유 시트를 직접 띄워 "동영상 저장"(사진 앱) / "파일에 저장"을 쓸 수 있게 한다. 웹 버전 동작은 그대로 둔다.

## 단계
- [x] `@capacitor/share` 8.0.3, `@capacitor/filesystem` 8.1.5 추가
- [x] `src/native/shareFile.ts` — `shareFileNative(blob, filename, title?)`
  - 앱이면 캐시 폴더 `share/`를 비우고, 1.5MB 조각씩 base64로 써서(큰 백업도 메모리 부담 적게) 공유 시트를 띄운 뒤 true
  - 웹이면 false → 기존 navigator.share / 다운로드 링크 그대로
  - 공유 시트를 닫은 것(cancel)은 오류로 보지 않음
- [x] 아카이브 영상 전체화면 "저장" 버튼 연결 (실패 시 안내)
- [x] 설정 > 전체 백업 내보내기 연결
- [x] 백업 가져오기(파일 선택)는 iOS 파일 선택기로 그대로 동작하므로 변경 없음
- [x] `pnpm build:app`로 iOS 프로젝트에 플러그인 반영 (Package.swift)
- [x] pnpm check, e2e 통과

## 실기기 확인 (TestFlight 이후)
- 영상 저장 → 사진 앱에 들어가는지
- 백업 내보내기 → 파일 앱에 저장되는지, 다시 가져오기 되는지
