import { test, expect } from '@playwright/test';

const tab = (page, title) => page.locator('.dv-tab').filter({ hasText: title });
const labelBox = locator => locator.locator('.dv-default-tab-content').evaluate(element => {
  // Measure the actual rendered label, not merely the outer tab hit area.
  const range = document.createRange();
  range.selectNodeContents(element);
  const { x, y, width, height } = range.getBoundingClientRect();
  return { x, y, width, height };
});
function expectSameBox(before, after) {
  for (const key of ['x', 'y', 'width', 'height']) {
    expect(Math.abs(before[key] - after[key]), `${key} label position/size drift`).toBeLessThanOrEqual(0.25);
  }
}

test('tab label geometry stays stable when selected, deselected and group focus changes', async ({ page }) => {
  await page.goto('/');
  const orders = tab(page, '当前委托'), positions = tab(page, '当前仓位');
  await orders.click();
  await expect(orders).toHaveClass(/dv-active-tab/);
  await expect(positions).toHaveClass(/dv-inactive-tab/);
  const selectedOrders = await labelBox(orders), inactivePositions = await labelBox(positions);
  await positions.click();
  await expect(orders).toHaveClass(/dv-inactive-tab/);
  await expect(positions).toHaveClass(/dv-active-tab/);
  expectSameBox(selectedOrders, await labelBox(orders));
  expectSameBox(inactivePositions, await labelBox(positions));
  await tab(page, '图表').click();
  expectSameBox(selectedOrders, await labelBox(orders));
  expectSameBox(inactivePositions, await labelBox(positions));
  await orders.click();
  expectSameBox(selectedOrders, await labelBox(orders));
});

for (const orientation of ['vertical', 'horizontal']) {
  test(`${orientation} splitter highlights on hover and active drag and resizes geometry`, async ({ page }) => {
    await page.goto('/');
    await expect(tab(page, '图表')).toBeVisible();
    const sashes = page.locator('.dv-sash.dv-enabled');
    let sash;
    for (let i = 0; i < await sashes.count(); i++) {
      const box = await sashes.nth(i).boundingBox();
      if (box && (orientation === 'vertical' ? box.height > 100 && box.width < 20 : box.width > 100 && box.height < 20)) {
        sash = sashes.nth(i); break;
      }
    }
    expect(sash, `${orientation} enabled splitter`).toBeTruthy();
    const chart = page.locator('.dv-groupview').filter({ has: tab(page, '图表') });
    const before = await chart.boundingBox();
    const colour = () => sash.evaluate(e => getComputedStyle(e, '::after').backgroundColor);
    const thickness = () => sash.evaluate((e, axis) => parseFloat(getComputedStyle(e, '::after')[axis]), orientation === 'vertical' ? 'width' : 'height');
    await page.mouse.move(1, 1);
    const idleColour = await colour();
    expect(await thickness()).toBe(2);
    const box = await sash.boundingBox();
    expect(orientation === 'vertical' ? box.width : box.height).toBeGreaterThanOrEqual(10);
    // Start 3px off centre, outside the old 4px grab region.
    const x = box.x + box.width / 2 + (orientation === 'vertical' ? 3 : 0), y = box.y + box.height / 2 + (orientation === 'horizontal' ? 3 : 0);
    await page.mouse.move(x, y);
    // Await the completed CSS transition, not an intermediate blended colour.
    const highlighted = 'rgb(15, 95, 255)';
    await expect.poll(colour).toBe(highlighted);
    await expect.poll(thickness).toBe(3);
    const hoverBox = await sash.boundingBox();
    expect(orientation === 'vertical' ? hoverBox.width : hoverBox.height).toBe(orientation === 'vertical' ? box.width : box.height);
    expect(highlighted).not.toBe(idleColour);
    expect(highlighted).not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
    await page.mouse.down();
    await page.mouse.move(x + (orientation === 'vertical' ? -45 : 0), y + (orientation === 'horizontal' ? -45 : 0), { steps: 12 });
    await expect.poll(colour).toBe(highlighted);
    const axis = orientation === 'vertical' ? 'width' : 'height';
    await expect.poll(async () => Math.abs((await chart.boundingBox())[axis] - before[axis])).toBeGreaterThan(10);
    await expect.poll(thickness).toBe(3);
    const dragBox = await sash.boundingBox();
    expect(orientation === 'vertical' ? dragBox.width : dragBox.height).toBe(orientation === 'vertical' ? box.width : box.height);
    await page.screenshot({ path: `test-results/splitter-${orientation}-active.png` });
    if (orientation === 'horizontal') {
      const bounds = await sash.boundingBox();
      await page.screenshot({ path: 'test-results/02-splitter-detail.png', clip: { x: bounds.x, y: Math.max(0, bounds.y - 65), width: bounds.width, height: 134 } });
    }
    await page.mouse.up();
    await page.mouse.move(1, 1);
    await expect.poll(colour).toBe(idleColour);
    await expect.poll(thickness).toBe(2);
    const chartBody = chart.locator('.panel-body');
    expect(await chartBody.evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1);
    await expect(page.locator('.dv-tab')).toHaveCount(6);
  });
}


test('chart fits its viewport, real overflowing panel scrolls, and blank headers match inactive tabs', async ({ page }) => {
  await page.goto('/');
  const chart = page.locator('.dv-groupview').filter({ has: tab(page, '图表') });
  await expect(chart.locator('svg.chart')).toBeVisible();
  expect(await chart.locator('.panel-body').evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1);
  const inactive = tab(page, '当前委托');
  const header = inactive.locator('xpath=ancestor::*[contains(@class,"dv-tabs-and-actions-container")][1]');
  const background = element => element.evaluate(e => getComputedStyle(e).backgroundColor);
  expect(await background(inactive)).toBe(await background(header));
  await page.screenshot({ path: 'test-results/01-workspace.png' });
  // The trade form is intentionally taller than a small viewport. Do not hide real overflow.
  await page.setViewportSize({ width: 1440, height: 420 });
  const trade = page.locator('.dv-groupview').filter({ has: tab(page, '交易') }).locator('.panel-body');
  await expect.poll(() => trade.evaluate(e => e.scrollHeight - e.clientHeight)).toBeGreaterThan(20);
  expect(await trade.evaluate(e => getComputedStyle(e).overflowY)).toMatch(/auto|scroll/);
  const scrollbarWidth = await trade.evaluate(e => getComputedStyle(e, '::-webkit-scrollbar').width);
  expect(parseFloat(scrollbarWidth)).toBeGreaterThan(0);
  await trade.hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => trade.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/overflow-scrolling.png' });
  await tab(page, '订单簿').click();
  const bookGroup = page.locator('.dv-groupview').filter({ has: tab(page, '订单簿') });
  const book = bookGroup.locator('.panel-body');
  await expect.poll(() => book.evaluate(e => e.scrollHeight - e.clientHeight)).toBeGreaterThan(20);
  await book.hover();
  await page.mouse.wheel(0, 100);
  await expect.poll(() => book.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
  await bookGroup.screenshot({ path: 'test-results/03-orderbook-scroll.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => chart.locator('.panel-body').evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/workspace-polished.png' });
});
