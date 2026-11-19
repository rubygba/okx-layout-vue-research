import {test,expect} from '@playwright/test';
test.use({launchOptions:{ignoreDefaultArgs:['--hide-scrollbars']}});
const tab=(p,t)=>p.locator('.dv-tab').filter({hasText:t});
const group=(p,t)=>p.locator('.dv-groupview').filter({has:tab(p,t)});
async function sashFor(page,orientation){
 const sashes=page.locator('.dv-sash:not(.dv-disabled)');
 for(let i=0;i<await sashes.count();i++){const s=sashes.nth(i),b=await s.boundingBox();if(b&&(orientation==='vertical'?b.height>60&&b.width<20:b.width>60&&b.height<20))return s;}
 throw Error(`Missing ${orientation} splitter`);
}
async function drag(page,source,x,y){const b=await source.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(x,y,{steps:24});await page.mouse.up();}
async function scrollProof(page,title){
 const panel=group(page,title),body=panel.locator('.panel-body');
 await expect.poll(()=>body.evaluate(e=>e.scrollHeight-e.clientHeight)).toBeGreaterThan(10);
 await body.evaluate(e=>e.scrollTop=0);
 const info=await body.evaluate(e=>{
  const b=e.getBoundingClientRect(),w=e.offsetWidth-e.clientWidth;
  const x=b.right-w/2,y=b.top+Math.max(4,Math.min(12,e.clientHeight*e.clientHeight/e.scrollHeight/2));
  const hit=document.elementFromPoint(x,y);
  const bars=[...document.querySelectorAll('.dv-sash:not(.dv-disabled)')].map(s=>{const r=s.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
  return {x,y,width:w,hitClass:hit?.className,hitIsSash:!!hit?.closest('.dv-sash'),overlaps:bars.filter(r=>r.x<b.right&&r.x+r.w>b.right-w&&r.y<b.bottom&&r.y+r.h>b.top)};
 });
 expect(info.width).toBeGreaterThan(0);
 expect(info.overlaps,`${title} scrollbar must not overlap any splitter hit band`).toEqual([]);
 expect(info.hitIsSash,`${title} scrollbar point hit ${info.hitClass}`).toBe(false);
 const before=await panel.boundingBox();
 await page.mouse.move(info.x,info.y);await page.mouse.down();await page.mouse.move(info.x,info.y+35,{steps:15});await page.mouse.up();
 await expect.poll(()=>body.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
 const after=await panel.boundingBox();for(const key of ['x','y','width','height'])expect(Math.abs(after[key]-before[key])).toBeLessThanOrEqual(.25);
}
async function gutterProof(page){
 const nativePaint = await page.locator('.dv-grid-view .dv-view').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e,'::before');return {content:s.content,bg:s.backgroundColor,display:s.display};}));
 expect(nativePaint.length).toBeGreaterThan(0);
 for(const p of nativePaint)expect(p.content==='none'||p.display==='none'||p.bg==='transparent'||p.bg==='rgba(0, 0, 0, 0)','no second native border stripe').toBeTruthy();
 const result=await page.locator('.dv-sash:not(.dv-disabled)').evaluateAll(elements=>elements.map(e=>{
  const b=e.getBoundingClientRect(),s=getComputedStyle(e),p=getComputedStyle(e,'::after');
  const transform=new DOMMatrix(p.transform==='none'?undefined:p.transform);
  return {box:{x:b.x,y:b.y,w:b.width,h:b.height},tx:transform.m41,ty:transform.m42,bg:s.backgroundColor,shadow:s.boxShadow,line:{w:parseFloat(p.width),h:parseFloat(p.height),left:parseFloat(p.left),top:parseFloat(p.top)},hit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('.dv-sash')===e};
 }));
 for(const r of result){
  expect(r.bg).toBe('rgba(0, 0, 0, 0)');expect(r.shadow).toBe('none');expect(r.hit).toBe(true);
  const vertical=r.box.h>r.box.w;
  const center=vertical?r.line.left+r.line.w/2+r.tx:r.line.top+r.line.h/2+r.ty;
  expect(Math.abs(center-(vertical?r.box.w:r.box.h)/2),'painted line centred in its hit band').toBeLessThanOrEqual(.5);
 }
 const bodies=await page.locator('.panel-body').evaluateAll(es=>es.map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height).map(r=>({x:r.x,y:r.y,w:r.width,h:r.height})));
 for(const r of result)for(const b of bodies){
  const a=r.box,w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
  expect(w>.5&&h>.5,'splitter must not cover content on either adjacent side').toBe(false);
 }
 const groups=await page.locator('.dv-groupview').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};}));
 for(const {box:a} of result)for(const b of groups){
  if(a.h>a.w && Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)+.5){
   const clearance=b.x+b.w<=a.x+.5?a.x-b.x-b.w:b.x>=a.x+a.w-.5?b.x-a.x-a.w:null;
   if(clearance!==null)expect(clearance,'vertical gutter clearance').toBeGreaterThanOrEqual(1.5);
  }
  if(a.w>a.h && Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)+.5){
   const clearance=b.y+b.h<=a.y+.5?a.y-b.y-b.h:b.y>=a.y+a.h-.5?b.y-a.y-a.h:null;
   if(clearance!==null)expect(clearance,'horizontal gutter clearance').toBeGreaterThanOrEqual(1.5);
  }
 }
 // T-junction hit bands must meet without overlapping one another.
 for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++){
  const a=result[i].box,b=result[j].box;
  const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
  expect(w>0.5&&h>0.5,`splitters ${i}/${j} intersect (${w}×${h})`).toBe(false);
 }
}
test('scrollbar thumbs and splitter hit bands stay separate through custom split and viewport resize',async({page},info)=>{
 await page.goto('/');await expect(tab(page,'图表')).toBeVisible();
 const h=await sashFor(page,'horizontal');const b=await h.boundingBox(),c=await group(page,'图表').boundingBox();
 await drag(page,h,b.x+b.width/2,c.y+115);
 await page.setViewportSize({width:1440,height:440});await tab(page,'订单簿').click();
 await page.screenshot({path:'test-results/gutter-scrollbars-before-check.png'});
 await info.attach('layout-hit-regions',{body:JSON.stringify(await page.locator('.dv-sash,.panel-body').evaluateAll(es=>es.map(e=>({class:e.className,rect:e.getBoundingClientRect().toJSON(),client:e.clientWidth,offset:e.offsetWidth}))),null,2),contentType:'application/json'});
 await scrollProof(page,'图表');await scrollProof(page,'订单簿');await gutterProof(page);
 await page.screenshot({path:'test-results/08-scrollbar-gutter-proof.png'});
 // A real tab split adds a further branch / T-junction to the layout tree.
 const book=await group(page,'订单簿').boundingBox();
 await drag(page,tab(page,'当前仓位'),book.x+book.width/2,book.y+book.height-8);
 await expect(page.locator('.dv-groupview')).toHaveCount(5);
 await page.setViewportSize({width:1360,height:470});
 await scrollProof(page,'图表');await scrollProof(page,'订单簿');await gutterProof(page);
 await page.screenshot({path:'test-results/09-custom-split-gutter-proof.png'});
 // At compact heights all rows may reach Dockview minimums and legitimately disable a sash.
 // Grow the viewport before checking both drag directions, keeping the custom topology.
 await page.setViewportSize({width:1360,height:900});
 await gutterProof(page);
 for(const orientation of ['vertical','horizontal']){
  const sash=await sashFor(page,orientation),r=await sash.boundingBox();
  const x=r.x+r.width/2+(orientation==='vertical'?3:0),y=r.y+r.height/2+(orientation==='horizontal'?3:0);
  const axis=orientation==='vertical'?'width':'height';
  const sizes=()=>page.locator('.dv-groupview').evaluateAll((es,key)=>es.map(e=>e.getBoundingClientRect()[key]),axis);
  const before=await sizes();
  expect(await sash.evaluate((e,p)=>document.elementFromPoint(p.x,p.y)?.closest('.dv-sash')===e,{x,y}),`${orientation} off-centre grab hit`).toBe(true);
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+(orientation==='vertical'?30:0),y+(orientation==='horizontal'?30:0),{steps:12});await page.mouse.up();
  await expect.poll(async()=>Math.max(...(await sizes()).map((v,i)=>Math.abs(v-before[i]))),`${orientation} drag resized an adjacent group`).toBeGreaterThan(10);
 }
 await gutterProof(page);await page.screenshot({path:'test-results/10-custom-resized-gutter-proof.png'});
});
