import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        // 앱이 폰 언어를 따라가므로 기존 테스트는 한국어 폰으로 돈다 (영어는 app.spec.ts에서 따로 확인)
        locale: 'ko-KR',
        // 브라우저를 내려받을 수 없는 개발 컨테이너에서 미리 설치된 크로미움을 쓰기 위한 탈출구.
        // CI에서는 비어 있어서 playwright가 관리하는 브라우저를 그대로 쓴다.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : {
    command: 'node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/myhour/',
    reuseExistingServer: !process.env.CI,
  },
});
