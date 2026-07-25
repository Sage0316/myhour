# 하꾸 백업 형식 v2

파일명은 `hakku-YYYY-MM-DD.hakku.zip`입니다. `manifest.json`은 형식/버전/생성 시각과 각 파일의 논리 경로, 바이트 수, MIME, SHA-256을 담습니다.

- `data/settings.json`: 앱 설정
- `data/current.json`: 현재 세션 기록
- `data/archive.json`: 아카이브
- `data/media-index.json`: IndexedDB 키와 ZIP 미디어 경로 매핑
- `media/*.bin`: 원본 및 생성 미디어

복원기는 CRC, 경로 순회, 항목 수, 총 압축 해제 크기, 파일 크기와 SHA-256, JSON 런타임 스키마, 중복 미디어 키를 검증합니다. 미디어를 먼저 쓰고 메타데이터를 커밋하며, 실패하면 덮어쓴 미디어와 이전 메타데이터를 복구합니다. 이 형식은 암호화 컨테이너가 아니므로 백업 파일 자체를 민감 정보로 취급하세요.
