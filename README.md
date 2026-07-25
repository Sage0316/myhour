# 하꾸 (Hakku)

하꾸는 하루의 순간을 짧게 기록하고 세로형 다이어리 영상으로 꾸미는 로컬 우선 PWA입니다. 기존 프로젝트명 `myhour`는 URL과 마이그레이션 호환성을 위해 일부 내부 경로에 남아 있습니다.

## 실행

Node.js 24와 pnpm 11.9.0을 사용합니다.

```bash
cd myhour
pnpm install --frozen-lockfile
pnpm dev
```

품질 검사는 `pnpm check`, 브라우저 검사는 최초 Chromium 설치 후 `pnpm test:e2e`로 실행합니다. 선택 기능은 [`.env.example`](myhour/.env.example)을 참고하세요.

## 구조

- `myhour/src/domain`, `repositories`, `persistence`: 스키마·로컬 데이터·IndexedDB
- `myhour/src/media`, `services`: 캡처·정리·영상 생성·마감 유스케이스
- `myhour/src/backup`: 해시 매니페스트 기반 전체 백업/복원
- `myhour/ai-server`: 공급자 키를 격리하는 AI Worker
- `myhour/push-server`: 인증된 Web Push Worker
- `aidlc-docs`: AI-DLC 요구사항·설계·작업 단위·검증 기록

외부 배포는 자동 실행되지 않습니다. GitHub Pages 워크플로는 수동 실행만 지원합니다.

## 데이터 원칙

기록과 미디어는 기본적으로 기기 안에 저장됩니다. AI 기능에 동의한 경우에만 텍스트와 캡션이 AI Worker로 전송되며 사진·영상·음성 원본은 전송하지 않습니다. 자세한 내용은 [PRIVACY.md](PRIVACY.md)를 참고하세요.
