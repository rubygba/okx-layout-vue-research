# 拖拽、资源与 GPU 验证

## 测试范围

- `tests/perf/drag.spec.js`：真实 Chromium 鼠标拖拽，跨组移动标签及其内容、边缘拆分、分隔条 resize、重载持久化。不是直接调用布局 API 的伪拖拽。
- `tests/perf/stress.spec.js`：30 个混合内容标签，20 次跨组拖拽，记录 rAF 帧间隔、Long Tasks、DOM 数量、可用时的 JS 堆大小与 WebGL renderer。
- 内容为静态模拟数据，没有行情订阅、真实 K 线 SDK 或每秒数千次更新。这不是生产行情压力的结论。

```bash
npm ci
npx playwright install chromium
npm run test:drag
npm run test:perf
# 只有在固定硬件、刷新率、浏览器和电源策略校准后才设置性能门槛：
PERF_P95_MS=25 npm run test:perf
```

浏览器可用 `PLAYWRIGHT_BROWSERS_PATH` 指定缓存目录。测量 JSON 写入 Playwright 附件，同时输出到控制台。默认只检查交互正确性，不把未校准的共享 CI 机器帧率作为发布门禁。

## 已修复的实测问题

DockviewVue 有一层 Vue 容器，原先只给 `main > .dv-dockview` 设置高度，选择器未覆盖实际 DOM。面板退化到 100px 高度，拖拽命中区域和 resize 都失效。现在明确给 DockviewVue 容器 `height:100%;width:100%`，主题变量选择器覆盖内部元素；回归测试同时断言图表实际高度超过 200px。

## GPU 与数据解释

- rAF 测的是浏览器回调间隔，不等于输入延迟、呈现帧率或 GPU 时间。记录 p50/p95/p99 和大于 33.34ms 的样本。
- Long Tasks 仅统计支持该 API 的浏览器主线程长任务（通常超过 50ms），不能证明没有短帧卡顿。
- `performance.memory` 是 Chromium 特有的近似值；GC 时机不固定，短跑堆增长不能证明泄漏。需要多轮操作、空闲、堆快照和保留路径调查。
- WebGL renderer 是渲染环境线索，不是 Dockview DOM 合成的 GPU 利用率。SwiftShader/llvmpipe 是软件渲染，不能声称完成物理 GPU 验证。
- 不给每个面板强加 `translateZ(0)` 或永久 `will-change`：层爆炸可能增加显存、栅格化和合成成本。Docking 改变布局尺寸仍会触发布局，CSS transform 不能消除这一点。
- 真机验收需使用 Chrome Performance / Rendering / Layers 记录主线程、布局/绘制、合成层及帧丢失，并在目标 Windows/macOS 与移动设备重复测量。只有拖动预览或确有证据的热点才考虑短期 `will-change: transform`，结束后移除。

## 后续生产负载

接入实时行情后，将行情计算移至 Worker、合并更新到每帧一次、暂停隐藏面板订阅/绘制，对长列表虚拟化。图表 resize 回调采用 rAF 合并；避免拖动过程中读写布局交错。现例没有这些负载，不引入无用的 Worker 或全局 GPU hack。

## 实测样本

Linux、Headless Chromium 141.0.7390.37、1440×900、DPR 1、Vite 开发服务器、SwiftShader **软件渲染**。三轮每轮新上下文、30 标签（4 个可见分组，并非 30 个同时渲染的内容）、20 次跨组拖拽，移动事件间隔约 16ms。

| 轮次 | 测量时长 | rAF 样本数 | p95 | p99 | >33.34ms | Long Tasks | DOM 前→后 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 8.803s | 526 | 16.7ms | 16.8ms | 0 | 0 | 783→783 |
| 2 | 8.768s | 524 | 16.7ms | 16.8ms | 0 | 0 | 783→783 |
| 3 | 8.886s | 531 | 16.8ms | 16.8ms | 0 | 0 | 783→783 |

近似 `performance.memory` 前后分别为 11.9MB、11.9MB、12.7MB（各轮内不变）；该 API 有精度/更新限制，**不能作为无内存泄漏证据**。[原始三轮 JSON](performance-sample.json)。这些短跑结果支持本环境中交互正常，不承诺所有设备恒定 60fps。

最终脚本另记录 CDP `TaskDuration`、`ScriptDuration`、`LayoutDuration` 增量及 `JSHeapUsedSize`，用于定位主线程/布局开销。它们不是整个浏览器进程 CPU 百分比、GPU 占用或显存用量。

最终全套 `RUN_PERF=1 npx playwright test --workers=1` **4/4 通过**（包括原有添加/编辑/笔记保存/刷新/重置测试）。新增 CDP 测量的一轮：8.674s 内主线程任务累计 712.8ms、脚本 125.5ms、布局 59.1ms / 357 次；JS 堆 8.57→11.03MB。未经强制 GC 的短期堆差包含瞬时对象，既不能认定泄漏，也不能据此宣称无泄漏。
