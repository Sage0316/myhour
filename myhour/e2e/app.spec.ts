import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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
