import { test, expect } from '@playwright/test';
test('SSR shell hydrates to dock layout and reload preserves custom tab', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/hydration|mismatch/i.test(m.text())) errors.push(m.text()); });
  await page.goto('/');
  await expect(page.getByTestId('ssr-shell')).toBeVisible();
  await expect(page.locator('.dv-tab')).toHaveCount(6);
  await expect(page.getByTestId('workspace-fallback')).toHaveCount(0);
  await page.getByRole('button', { name: '＋ 添加组件', exact: true }).click();
  await page.locator('select').selectOption('notes');
  await page.locator('.dialog input').fill('SSR hydration check');
  await page.getByRole('button', { name: '添加标签', exact: true }).click();
  await expect(page.locator('.dv-tab')).toHaveCount(7);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('vue-trading-workspace:v1'))).toContain('SSR hydration check');
  await page.reload();
  await expect(page.locator('.dv-tab')).toHaveCount(7);
  expect(errors).toEqual([]);
});
