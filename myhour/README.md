# 하꾸 (hakku)

하꾸는 하루의 순간을 글·사진·영상·음성으로 기록하고 9:16 다이어리 영상으로 꾸미는 로컬 우선 PWA입니다.

## 개발

요구 환경은 Node.js 24, pnpm 11.9.0입니다.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
```

`pnpm check`는 zero-warning lint, 코어 커버리지, 단위 테스트, AI/Push Worker 인증, Web Push 암호화 왕복, 타입 검사와 프로덕션 빌드를 수행합니다. Chromium 설치 후 `pnpm test:e2e`로 주요 화면과 axe 검사를 실행할 수 있습니다.

## 데이터와 개인정보

- 설정·기록·아카이브는 브라우저 저장소, 미디어는 IndexedDB에 저장됩니다.
- 자동 원본 삭제는 하지 않습니다. 사용자가 삭제하거나 브라우저 데이터를 지우기 전까지 기기에 남습니다.
- 전체 백업은 `.hakku.zip`으로 내보내며 CRC·경로·크기·SHA-256·스키마를 복원 전에 검증합니다. 백업 파일 자체는 암호화되지 않습니다.
- AI는 기본적으로 꺼져 있습니다. 동의한 경우 텍스트와 캡션만 보호된 Worker로 전송하고 사진·영상·음성 원본은 보내지 않습니다.
- Push를 켜면 암호화된 브라우저 구독 정보와 알림 일정이 Push Worker에 저장됩니다.

## 미디어와 지원 환경

- 30초 영상, 60초 음성 캡처 한도와 저장공간 여유 검사를 적용합니다.
- BGM 18곡은 `public/bgm`의 정적 자산이며 초기 JS 번들과 서비스워커 precache에 포함되지 않습니다. 선택된 상대 URL만 영상 생성 시 로딩됩니다.
- Chromium 계열이 가장 안정적입니다. iOS Web Push는 16.4 이상에서 홈 화면 설치가 필요하며 영상 코덱 지원은 기기마다 다를 수 있습니다.
- BGM은 공개 배포 전에 각 파일의 출처·저작자·라이선스 증빙을 확인해야 합니다.

## 선택 서비스 설정

`.env.example`의 공개 빌드 변수를 설정합니다. AI 공급자 키, VAPID 비밀키, 설치 토큰 secret은 브라우저나 `.env`가 아니라 각 Worker의 `wrangler secret`으로만 등록합니다.

배포·개인정보·보안·백업 세부 절차는 저장소 루트의 `OPERATIONS.md`, `PRIVACY.md`, `SECURITY.md`, `BACKUP_FORMAT.md`, `RELEASE_CHECKLIST.md`를 참고하세요.
