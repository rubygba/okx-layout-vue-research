import { test, expect } from '@playwright/test';
const tab=(page,title)=>page.locator('.dv-tab').filter({hasText:title});

// Selectors are deliberately shared with the rendered tab, not a simulated UI.
test('shared tab pill stays stable from title to close badge and closes only its own tab', async ({page})=>{
  await page.goto('/');
  const target=tab(page,'当前委托');
  const label=target.locator('.dv-default-tab-content');
  const close=target.locator('.dv-default-tab-action');
  const pill=target.locator('.dv-default-tab');
  const header=target.locator('xpath=ancestor::*[contains(@class,"dv-tabs-and-actions-container")][1]');
  await label.hover();await page.waitForTimeout(180);
  const before={tab:await target.boundingBox(),label:await label.boundingBox(),pill:await pill.boundingBox()};
  const paint=()=>pill.evaluate(e=>{const s=getComputedStyle(e,'::before');return {opacity:s.opacity,background:s.backgroundColor,left:s.left,top:s.top,width:s.width,height:s.height,borderRadius:s.borderRadius};});
  const grip=await pill.evaluate(e=>{const s=getComputedStyle(e,'::after');return {opacity:s.opacity,width:parseFloat(s.width),height:parseFloat(s.height)};});
  expect(grip.opacity).toBe('1');expect(grip.width).toBeGreaterThan(0);expect(grip.height).toBeGreaterThan(0);
  const titlePaint=await paint();expect(titlePaint.opacity).toBe('1');
  await header.screenshot({path:'test-results/06-tab-title-hover.png'});
  await close.hover();await page.waitForTimeout(180);
  expect(await paint()).toEqual(titlePaint);
  expect(await target.boundingBox()).toEqual(before.tab);expect(await label.boundingBox()).toEqual(before.label);expect(await pill.boundingBox()).toEqual(before.pill);
  const badge=await close.evaluate(e=>{const s=getComputedStyle(e);return {width:parseFloat(s.width),height:parseFloat(s.height),radius:s.borderRadius};});
  expect(badge.width).toBe(badge.height);expect(badge.radius).toMatch(/50%|999/);
  await header.screenshot({path:'test-results/07-tab-close-hover.png'});
  await close.click();
  await expect(target).toHaveCount(0);await expect(tab(page,'当前仓位')).toHaveCount(1);
  await expect(page.locator('.dv-tab')).toHaveCount(5);
});

test('tab is keyboard reachable and native Delete closes it; reduced motion keeps the shared hover cue',async({page})=>{
  await page.goto('/');
  const target=tab(page,'当前委托');
  const selected=tab(page,'当前仓位');
  let reached=false;
  for(let i=0;i<60;i++){
    await page.keyboard.press('Tab');
    if(await selected.evaluate(e=>e===document.activeElement||e.contains(document.activeElement))){reached=true;break;}
  }
  expect(reached,'tab reachable with real Tab navigation').toBeTruthy();
  await page.keyboard.press('Home');
  await expect(target).toBeFocused();
  await page.keyboard.press('Delete');await expect(target).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  const other=tab(page,'当前仓位');await other.hover();
  const durations=await other.locator('.dv-default-tab').evaluate(e=>getComputedStyle(e,'::before').transitionDuration);
  expect(durations.split(',').every(v=>parseFloat(v)<=.001)).toBeTruthy();
});
