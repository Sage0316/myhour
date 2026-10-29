import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// 첫 실행 설명서는 따로 확인하고, 나머지 테스트는 본 상태에서 시작한다
test.beforeEach(async ({ page }, info) => {
  if (info.title.includes('설명서')) return;
  await page.addInitScript(() => localStorage.setItem('hakku_onboarded_v1', '1'));
});

test('loads the main journey and exposes accessible navigation', async ({ page }) => {
  await page.goto('/myhour/');
  await expect(page).toHaveTitle(/하꾸/);
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
  await page.getByRole('button', { name: '오늘' }).click();
  await expect(page.getByRole('button', { name: '오늘' })).toHaveAttribute('aria-current', 'page');
});

test('has no critical automated accessibility violations', async ({ page }) => {
  await page.goto('/myhour/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => violation.impact === 'critical')).toEqual([]);
});

test.describe('영어 폰', () => {
  test.use({ locale: 'en-US' });

  test('shows the app in English when the phone is in English', async ({ page }) => {
    await page.goto('/myhour/');
    await expect(page.getByRole('navigation', { name: 'Main menu' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('첫 실행 설명서: 네 장을 넘기고 시작하면 홈이 나오고 다시 뜨지 않는다', async ({ page }) => {
  await page.goto('/myhour/');
  const guide = page.getByRole('dialog', { name: '하꾸 사용 설명서' });
  await expect(guide).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '다음' }).click();
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: /시작하기/ }).click();
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
  await expect(guide).toHaveCount(0);
});
