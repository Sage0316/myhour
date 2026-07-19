import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/myhour/',
  define: {
    __BUILD_VERSION__: JSON.stringify(
      new Date().toISOString().slice(2, 16).replace('T', '.').replaceAll(':', '').replaceAll('-', ''),
    ),
  },
})
