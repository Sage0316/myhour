import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// 웹에서만 쓰는 파일은 앱 번들에서 뺀다 (BGM 시청 페이지, GitHub Pages 헤더 설정)
const WEB_ONLY_FILES = ['bgm.html', '_headers']

function dropWebOnlyFiles(): Plugin {
  let outDir = 'dist'
  return {
    name: 'drop-web-only-files',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir },
    closeBundle() {
      for (const file of WEB_ONLY_FILES) rmSync(resolve(outDir, file), { force: true })
    },
  }
}

// https://vite.dev/config/
// `vite build --mode app`은 iOS 앱(Capacitor)용 빌드다. 앱 안에서는 파일을 상대 경로로 읽는다.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'app' ? [react(), dropWebOnlyFiles()] : [react()],
  base: mode === 'app' ? './' : '/myhour/',
  build: {
    // 백업용 JSZip을 처음부터 함께 싣게 되면서(backupService.ts 참고) 본 번들이 500kB를 조금 넘는다 (gzip 약 180kB).
    // 일부러 한 묶음으로 둔 것이라 경고 기준만 올린다 — 다시 나눠 지연 로딩하면 배포 직후 백업이 실패한다
    chunkSizeWarningLimit: 700,
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(
      new Date().toISOString().slice(2, 16).replace('T', '.').replaceAll(':', '').replaceAll('-', ''),
    ),
  },
}))
