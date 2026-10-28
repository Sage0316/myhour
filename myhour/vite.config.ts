import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `vite build --mode app`은 iOS 앱(Capacitor)용 빌드다. 앱 안에서는 파일을 상대 경로로 읽는다.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'app' ? './' : '/myhour/',
  define: {
    __BUILD_VERSION__: JSON.stringify(
      new Date().toISOString().slice(2, 16).replace('T', '.').replaceAll(':', '').replaceAll('-', ''),
    ),
  },
}))
