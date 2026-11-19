import { test, expect } from '@playwright/test';

// Playwright otherwise hides scrollbar painting even when overflow scrolling works.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });
const tab = (page, title) => page.locator('.dv-tab').filter({ hasText: title });
const group = (page, title) => page.locator('.dv-groupview').filter({ has: tab(page, title) });

async function visibleScroll(page, body) {
  await expect.poll(() => body.evaluate(e => e.scrollHeight - e.clientHeight)).toBeGreaterThan(10);
  expect(await body.evaluate(e => getComputedStyle(e).overflowY)).toMatch(/auto|scroll/);
  expect(await body.evaluate(e => e.offsetWidth - e.clientWidth)).toBeGreaterThan(0);
  await body.hover();
  await page.mouse.wheel(0, 80);
  await expect.poll(() => body.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
}

test('header divider, label inset and hover are stable with reduced motion support', async ({ page }) => {
  await page.goto('/');
  const orders = tab(page, '当前委托');
  const header = group(page, '当前委托').locator('.dv-tabs-and-actions-container');
  const checkDivider = async () => {
    const line = await header.evaluate(e => getComputedStyle(e).boxShadow);
    expect(line).toContain('inset');expect(line).toMatch(/0px -1px 0px/);
  };
  await checkDivider();
  const tabDividers = await header.locator('.dv-tab').evaluateAll(elements => elements.map(e=>getComputedStyle(e).boxShadow));
  expect(tabDividers.every(value=>value.includes('inset') && /0px -1px 0px/.test(value))).toBeTruthy();
  const content = orders.locator('.dv-default-tab-content');
  const box = await orders.boundingBox(), text = await content.boundingBox();
  expect(text.x-box.x).toBeGreaterThanOrEqual(14);
  expect(text.x-box.x).toBeLessThanOrEqual(16);
  const typography = await content.evaluate(e => { const s=getComputedStyle(e);return {size:parseFloat(s.fontSize),height:parseFloat(s.lineHeight)}; });
  expect(typography.height).toBeGreaterThanOrEqual(typography.size);
  expect(typography.height).toBeLessThanOrEqual(24);
  const motion = await orders.evaluate(e => { const s=getComputedStyle(e);return {duration:s.transitionDuration,property:s.transitionProperty}; });
  const durations=motion.duration.split(',').map(v=>parseFloat(v)*1000);
  expect(durations.every(v=>v>=120&&v<=160)).toBeTruthy();
  expect(motion.property).toContain('color');
  const pillElement = orders.locator('.dv-default-tab');
  const pill = await pillElement.evaluate(e => {const s=getComputedStyle(e,'::before');return {duration:s.transitionDuration,property:s.transitionProperty};});
  expect(pill.property).toBe('opacity');expect(parseFloat(pill.duration)*1000).toBeGreaterThanOrEqual(120);expect(parseFloat(pill.duration)*1000).toBeLessThanOrEqual(160);
  await orders.hover();await page.waitForTimeout(180);
  expect(await content.boundingBox()).toEqual(text);
  expect(await pillElement.evaluate(e=>getComputedStyle(e,'::before').opacity)).toBe('1');
  await header.screenshot({path:'test-results/02-tab-hover-current.png'});
  await orders.click();await checkDivider();
  expect(await content.boundingBox()).toEqual(text);
  await page.mouse.move(1,1);
  await page.screenshot({path:'test-results/01-workspace-current.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced = await orders.evaluate(e => getComputedStyle(e).transitionDuration);
  expect(reduced.split(',').every(v=>parseFloat(v)<=0.001)).toBeTruthy();
});

test('Chart and orderbook render real scrollbar thumbs only when content overflows', async ({ page }) => {
  await page.goto('/');
  const chart = group(page,'图表');
  const body = chart.locator('.panel-body');
  await expect(chart.locator('svg.chart')).toBeVisible();
  expect(await body.evaluate(e=>e.scrollHeight-e.clientHeight)).toBeLessThanOrEqual(1);
  // A real splitter gesture shrinks Chart below its usable content minimum.
  const sashes=page.locator('.dv-sash.dv-enabled');let horizontal;
  for(let i=0;i<await sashes.count();i++) {const b=await sashes.nth(i).boundingBox();if(b&&b.width>100&&b.height<20){horizontal=sashes.nth(i);break;}}
  expect(horizontal).toBeTruthy();
  const h=await horizontal.boundingBox();
  await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();
  await page.mouse.move(h.x+h.width/2, (await chart.boundingBox()).y+110,{steps:24});await page.mouse.up();
  await visibleScroll(page,body);
  await chart.screenshot({path:'test-results/04-chart-visible-scrollbar.png'});
  await page.setViewportSize({width:1440,height:420});
  await tab(page,'订单簿').click();
  const book=group(page,'订单簿');await visibleScroll(page,book.locator('.panel-body'));
  await book.screenshot({path:'test-results/03-orderbook-visible-scrollbar.png'});
  await page.screenshot({path:'test-results/05-both-overflow.png'});
});
