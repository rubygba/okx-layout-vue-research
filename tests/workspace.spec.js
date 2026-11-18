import {test,expect} from '@playwright/test';
test('render, add/edit custom tab, persistence, reset',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('.dv-tab')).toHaveCount(6);await expect(page.locator('svg.chart')).toBeVisible();
 await page.getByRole('button',{name:'＋ 添加组件',exact:true}).click();await page.locator('select').selectOption('notes');await page.locator('.dialog input').fill('我的策略');await page.getByRole('button',{name:'添加标签',exact:true}).click();await expect(page.locator('.dv-tab')).toHaveCount(7);await page.locator('textarea').fill('突破后回踩观察');await page.waitForTimeout(400);
 await page.getByRole('button',{name:'编辑当前标签',exact:true}).click();await page.locator('.dialog input').fill('自定义研究');await page.getByRole('button',{name:'保存修改',exact:true}).click();await page.waitForTimeout(400);await page.reload();await expect(page.locator('textarea')).toHaveValue('突破后回踩观察');await expect(page.locator('.dv-tab').filter({hasText:'自定义研究'})).toBeVisible();
 await page.getByRole('button',{name:'↶ 重置',exact:true}).click();await expect(page.locator('.dv-tab')).toHaveCount(6);await expect(page.locator('textarea')).toHaveCount(0);expect(errors).toEqual([]);
 await page.screenshot({path:'test-results/workspace.png'});
});
