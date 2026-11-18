import { test, expect } from '@playwright/test';
// Opt-in because machine, renderer and power policy materially affect these results.
test('30-panel mixed-content drag stress: frame intervals, long tasks, heap and DOM', async ({ page }, testInfo) => {
  test.skip(!process.env.RUN_PERF, 'Set RUN_PERF=1 for a measured stress run');
  test.setTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.locator('.dv-tab')).toHaveCount(6);
  for(let i=0;i<24;i++){
    await page.getByRole('button',{name:'＋ 添加组件',exact:true}).click();
    await page.locator('select').selectOption(['chart','book','notes'][i%3]);
    await page.locator('.dialog input').fill(`压力-${i}`);
    await page.getByRole('button',{name:'添加标签',exact:true}).click();
  }
  await expect(page.locator('.dv-tab')).toHaveCount(30);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metricMap=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const cpuBefore=await metricMap();
  await page.evaluate(()=>{
    const state={frames:[],longTasks:[],start:performance.now(),heapBefore:performance.memory?.usedJSHeapSize??null,domBefore:document.querySelectorAll('*').length};
    let last=performance.now();
    function frame(now){state.frames.push(now-last);last=now;state.raf=requestAnimationFrame(frame)}
    state.raf=requestAnimationFrame(frame);
    if(PerformanceObserver.supportedEntryTypes.includes('longtask')){
      state.observer=new PerformanceObserver(list=>state.longTasks.push(...list.getEntries().map(e=>e.duration)));
      state.observer.observe({type:'longtask',buffered:false});
    }
    window.__perf=state;
  });
  // Actual pointer gestures, not API-based moveTo calls. Alternating tabbar targets keeps groups intact.
  const source=page.locator('.dv-tab').filter({hasText:'当前仓位'});
  for(let i=0;i<20;i++){
    const destTitle=i%2?'当前委托':'图表';
    const dest=page.locator('.dv-groupview').filter({has:page.locator('.dv-tab').filter({hasText:destTitle})});
    const a=await source.boundingBox(),b=await dest.boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
    await page.mouse.move(a.x+a.width/2+8,a.y+a.height/2+8,{steps:3});
    // Pace motion across rendered frames instead of dispatching an instantaneous event burst.
    for(let step=1;step<=20;step++){
      const t=step/20;
      await page.mouse.move(a.x+a.width/2+(b.x+b.width/2-a.x-a.width/2)*t,a.y+a.height/2+(b.y+18-a.y-a.height/2)*t);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await expect(dest.locator('.dv-tab').filter({hasText:'当前仓位'})).toHaveCount(1);
  }
  const metrics=await page.evaluate(()=>{
    const s=window.__perf;cancelAnimationFrame(s.raf);s.observer?.disconnect();
    const sorted=s.frames.slice(2).sort((a,b)=>a-b),pct=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]??null;
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl');const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    return {durationMs:performance.now()-s.start,frameCount:sorted.length,frameIntervalP50Ms:pct(.5),frameIntervalP95Ms:pct(.95),frameIntervalP99Ms:pct(.99),framesOver33ms:sorted.filter(x=>x>33.34).length,longTaskSupported:PerformanceObserver.supportedEntryTypes.includes('longtask'),longTaskCount:s.longTasks.length,longTaskTotalMs:s.longTasks.reduce((a,b)=>a+b,0),heapBefore:s.heapBefore,heapAfter:performance.memory?.usedJSHeapSize??null,domBefore:s.domBefore,domAfter:document.querySelectorAll('*').length,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,userAgent:navigator.userAgent,devicePixelRatio,visibility:document.visibilityState};
  });
  const cpuAfter=await metricMap();
  metrics.mainThreadTaskMs=(cpuAfter.TaskDuration-cpuBefore.TaskDuration)*1000;
  metrics.scriptMs=(cpuAfter.ScriptDuration-cpuBefore.ScriptDuration)*1000;
  metrics.layoutMs=(cpuAfter.LayoutDuration-cpuBefore.LayoutDuration)*1000;
  metrics.layoutCount=cpuAfter.LayoutCount-cpuBefore.LayoutCount;
  metrics.cdpHeapBefore=cpuBefore.JSHeapUsedSize;metrics.cdpHeapAfter=cpuAfter.JSHeapUsedSize;
  await cdp.detach();
  console.log('PERF_METRICS', JSON.stringify(metrics));
  await testInfo.attach('performance-metrics',{body:JSON.stringify(metrics,null,2),contentType:'application/json'});
  expect(errors).toEqual([]); await expect(page.locator('.dv-tab')).toHaveCount(30);
  // Optional calibrated acceptance budget, never silently call a noisy headless run 60fps.
  if(process.env.PERF_P95_MS) expect(metrics.frameIntervalP95Ms).toBeLessThan(Number(process.env.PERF_P95_MS));
});
