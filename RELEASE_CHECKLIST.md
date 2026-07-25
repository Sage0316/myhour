# 하꾸 공개 베타 체크리스트

## 공통

- [ ] `pnpm check`, Worker 테스트, Chromium 브라우저 검증 통과
- [ ] 백업 내보내기→새 프로필 복원→기록/미디어 재생 확인
- [ ] BGM 18곡의 출처·저작자·라이선스 근거 확정
- [ ] Worker 허용 Origin, KV, 모델 ID, secret, 일일 한도 확인
- [ ] Worker rate-limit namespace·허용 Push endpoint·preview/production 분리 확인
- [ ] `main` CI의 `hakku-dist` SHA-256 검증 후 동일 artifact로 Pages 배포
- [ ] Pages 및 AI/Push Worker의 정상 버전 ID로 롤백 리허설
- [ ] 개인정보 안내와 지원 연락 경로 최종 검토

## iOS 16.4+

- [ ] Safari 홈 화면 설치, 카메라·마이크 권한 거부/허용
- [ ] 사진·30초 영상·60초 음성 저장과 앱 재시작 후 재생
- [ ] WebM 지원 여부에 따른 생성 실패 안내와 원본 보존
- [ ] 푸시 허용·일정 변경·해제·만료 구독 정리
- [ ] 오프라인 재실행과 safe-area UI 확인

## Android Chromium

- [ ] 설치 프롬프트/standalone 실행
- [ ] 카메라 방향, MediaRecorder MIME, 영상 생성·다운로드
- [ ] 저장공간 부족/권한 거부/복원 실패 메시지
- [ ] 푸시 일정과 알림 클릭 이동

## 접근성

- [ ] 키보드만으로 탭·기록·설정·아카이브 이동
- [ ] 보이는 포커스, 스크린리더 버튼명, dialog 진입/닫기
- [ ] 200% 확대와 모션 감소 설정
- [ ] axe critical 0건 및 수동 대비 점검
