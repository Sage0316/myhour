import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({
  server: { host: '127.0.0.1', port: 4174 },
  logLevel: 'error',
});

let browser;
let context;
try {
  await server.listen();
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));
  await page.goto('http://127.0.0.1:4174/myhour/', { waitUntil: 'networkidle' });

  const bodyText = (await page.locator('body').innerText()).trim();
  if (!bodyText || !(await page.title()).includes('하꾸')) {
    throw new Error('브랜드와 주요 콘텐츠가 렌더링되지 않았습니다.');
  }
  if (await page.locator('.vite-error-overlay').count()) throw new Error('Vite 오류 오버레이가 표시됐습니다.');
  const recordTrigger = page.locator('[data-modal-trigger="record"]').first();
  await recordTrigger.click();
  const recordDialog = page.locator('[role="dialog"][aria-modal="true"]');
  await recordDialog.waitFor({ state: 'visible' });
  const focusedInsideDialog = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
  });
  if (!focusedInsideDialog) throw new Error('기록 대화상자로 포커스가 이동하지 않았습니다.');
  await page.keyboard.press('Escape');
  await recordDialog.waitFor({ state: 'hidden' });
  const focusWasRestored = await page.evaluate(
    () => document.activeElement?.getAttribute('data-modal-trigger') === 'record',
  );
  if (!focusWasRestored) throw new Error('대화상자를 닫은 뒤 실행 버튼으로 포커스가 복귀하지 않았습니다.');
  await page.getByRole('button', { name: '오늘' }).click();
  if (await page.getByRole('button', { name: '오늘' }).getAttribute('aria-current') !== 'page') {
    throw new Error('주요 탭 탐색이 동작하지 않습니다.');
  }
  const axe = await new AxeBuilder({ page }).analyze();
  const critical = axe.violations.filter(violation => violation.impact === 'critical');
  if (critical.length) throw new Error(`치명적 접근성 위반: ${critical.map(item => item.id).join(', ')}`);
  if (consoleErrors.length) throw new Error(`브라우저 오류: ${consoleErrors.join(' | ')}`);

  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/browser-verify.png', fullPage: true });
  console.log('✅ BROWSER VERIFY OK: content, navigation, console, overlay, critical accessibility');
} finally {
  await context?.close();
  await browser?.close();
  await server.close();
}
