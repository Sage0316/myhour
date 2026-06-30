# MYHOUR 프로젝트

## 개요
하루를 기록하고 영상으로 마무리하는 iOS 스타일 PWA. React + TypeScript + Vite.
배포: https://sage0316.github.io/myhour/

## 기술 스택
- Vite 8 + React + TypeScript
- GitHub Pages 배포 (`base: '/myhour/'`)
- Canvas API + MediaRecorder로 클라이언트 WebM 영상 생성

## 저장소 구조
- localStorage: records, settings, archive (`myhour_v1`, `myhour_settings_v1`, `myhour_archive_v1`)
- IndexedDB: 영상 blob (`myhour_videos_v1`), 키 형식: `wrapped_${sessionDate}`
- sessionDate: startTime 이전이면 전날 날짜 (getSessionDate 참조)

## 배포 방법
```bash
cd /home/claude/repo/myhour
npm run build
rm -rf /tmp/deploy && mkdir /tmp/deploy && cp -r dist/. /tmp/deploy/
cd /tmp/deploy && git init -q && git add -A && git commit -q -m "Deploy"
git remote add origin $(cd /home/claude/repo && git remote get-url origin)
git push origin HEAD:gh-pages --force
```

## 현재 앱 흐름
1. 홈/오늘 탭에서 기록 추가 (텍스트/사진/영상/음성)
2. 하루 마감 → WrapUpScreen → 영상 생성 → 아카이브 자동 저장 + 오늘 탭 클리어 → 아카이브 이동
3. 아카이브에서 과거 기록 및 영상 보기/다운로드

## 최근 수정 사항 (2026-06-30)
- getSessionDate: toISOString() 대신 로컬 날짜 사용 (KST 버그 수정)
- generateSlots: endMode='fixed'일 때 endTime이 그리드에 없으면 명시적으로 추가
- WrapUpScreen: 영상 생성 완료 후 자동 아카이브 + 아카이브 화면으로 이동
- saveVideoToIDB를 await 처리 (race condition 수정)
- addToArchive를 WrapUpScreen 내부에서 직접 호출하도록 구조 변경
