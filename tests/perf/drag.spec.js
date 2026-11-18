import { test, expect } from '@playwright/test';
const KEY = 'vue-trading-workspace:v1';
const tab = (page, title) => page.locator('.dv-tab').filter({ hasText: title });
const group = (page, title) => page.locator('.dv-groupview').filter({ has: tab(page, title) });
async function gesture(page, source, x, y) {
  const b = await source.boundingBox();
  if (!b) throw new Error('Drag source is not visible');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 8, b.y + b.height / 2 + 8, { steps: 4 });
  await page.mouse.move(x, y, { steps: 24 });
  await page.mouse.up();
}
test('tab content follows cross-group merge and edge split; persists after reload', async ({ page }) => {
  await page.goto('/');
  await expect(tab(page, '图表')).toBeVisible();
  expect((await group(page, '图表').boundingBox()).height).toBeGreaterThan(200);
  const initial = await page.locator('.dv-groupview').count();
  let target = await group(page, '市场异动').boundingBox();
  await gesture(page, tab(page, '当前仓位'), target.x + target.width / 2, target.y + target.height / 2);
  await expect(group(page, '市场异动').locator('.dv-tab').filter({ hasText: '当前仓位' })).toHaveCount(1);
  await expect(group(page, '市场异动').getByText('持仓展示')).toBeVisible();
  // Edge hit creates a new split group, rather than merely reordering a tab.
  target = await group(page, '图表').boundingBox();
  await gesture(page, tab(page, '当前仓位'), target.x + 12, target.y + target.height / 2);
  await expect(page.locator('.dv-groupview')).toHaveCount(initial + 1);
  await expect(group(page, '当前仓位').getByText('持仓展示')).toBeVisible();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), KEY)).not.toBeNull();
  await page.waitForTimeout(800);
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).layout, KEY);
  await page.reload();
  await expect(page.locator('.dv-groupview')).toHaveCount(initial + 1);
  await expect(tab(page, '当前仓位')).toBeVisible();
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).layout, KEY);
  expect(after.grid).toEqual(before.grid);
});

test('splitter resize changes actual geometry without losing panels', async ({ page }) => {
  await page.goto('/'); await expect(tab(page, '图表')).toBeVisible();
  const before = await group(page, '图表').boundingBox();
  const sashes = page.locator('.dv-sash');
  let sash;
  for (let i=0; i<await sashes.count(); i++) {
    const b=await sashes.nth(i).boundingBox();
    if(b && b.height>100 && b.width<20) { sash=sashes.nth(i); break; }
  }
  expect(sash, 'visible vertical resize sash').toBeTruthy();
  const b = await sash.boundingBox();
  await gesture(page, sash, b.x + b.width/2 - 80, b.y + b.height/2);
  await expect.poll(async()=>Math.abs((await group(page,'图表').boundingBox()).width-before.width)).toBeGreaterThan(10);
  await expect(page.locator('.dv-tab')).toHaveCount(6);
});
