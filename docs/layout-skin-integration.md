# Dockview 布局样式集成指南

适用 **Vue 3 / Nuxt 3**，本仓库锁定 `dockview-vue@8.9.1`。此模块复用独立 Demo 的界面与交互样式，不依赖 OKX 或 BingX 的业务代码。

## 可直接复用

| 功能 | 文件 | 接入约束 |
| --- | --- | --- |
| Tab 栏 | [skin.css](../src/workspace/skin.css) | 全宽底边、稳定的标题留白和短下划线。标题、左侧拖拽把手和圆形 X 使用同一悬停底色；仍用 Dockview 原生拖放、关闭和键盘 Delete。尊重 `prefers-reduced-motion`。 |
| 横竖分隔线 | [theme.js](../src/workspace/theme.js) + [skin.css](../src/workspace/skin.css) | 一起接入。原生 `gap: 14` 留出空间，10 px 抓取区居中，距面板两侧各约 2 px。关闭重复边线；同一条线从 2 px 灰色切换为 3 px 蓝色。不能只扩大 CSS 抓取区，否则会压到原生滚动条。 |
| 滚动条 | [skin.css](../src/workspace/skin.css) | 给业务滚动容器加 `.workspace-scroll`；容器自身负责 `overflow: auto` 和可用高度。Chromium 实测 6 px，Firefox 用 `thin` 降级；没有溢出时不强制显示，不隐藏有溢出的滑块。 |
| 配色 | [theme.css](../src/workspace/theme.css) | 覆盖 `--workspace-accent`、`--workspace-surface`、`--workspace-border` 等变量即可换色。显式覆盖 `--workspace-accent-subtle` 可让落点预览跟着换色。 |

`src/style.css` 是 **Demo 页面**，包含全局 reset、页头、行情/订单样式和图表尺寸，不要导入到业务工程。由业务自行处理默认布局、组件注册、行情数据、存储和版本迁移。图表的“填满余高，实际放不下才滚动”可作为布局策略，不必照搬样例最小高度。

## Vue 接入

按顺序加载 Dockview 官方 CSS、皮肤 CSS；容器需要明确的可用高度。以下假定 `workspace/` 放在组件旁，`ready` 用业务工程自己的初始化逻辑：

```vue
<script setup>
import { DockviewVue } from 'dockview-vue';
import 'dockview-vue/dist/styles/dockview.css';
import './workspace/skin.css';
import { workspaceOptions } from './workspace/theme.js';

function ready({ api }) {
  api.addPanel({ id: 'orders', component: 'orders', title: '委托' });
}
</script>

<template>
  <div class="workspace-skin product-workspace">
    <DockviewVue style="height:100%;width:100%" v-bind="workspaceOptions" @ready="ready">
      <template #panel-orders>
        <section class="workspace-scroll orders-panel">业务内容</section>
      </template>
    </DockviewVue>
  </div>
</template>

<style scoped>
.product-workspace { height: 600px; }
.orders-panel { height: 100%; overflow: auto; }
</style>
```

## Nuxt 3 与回归

- 在 Nuxt `css` 中按“官方 CSS → 皮肤 → 产品覆盖”加载，Dockview 用 `.client.vue` 或 `ClientOnly` 挂载。占位保持相同可用高度，`ready` 后再读本机布局。[SSR 示例](SSR验证.md)
- 升级 Dockview 时重跑 [标签与关闭](../tests/tab-pill.spec.js)、[横竖拖拽](../tests/visual-interactions.spec.js)、[分隔线与原生滚动条](../tests/splitter-scrollbar.spec.js)。对 `.dv-*` 内部节点的 CSS 适配不是跨版本通用 API。
- 如设计需更改间距，请同时校验真实沟槽、抓取宽度和两侧净空，尤其是两方向拖动、T 形交界、恢复布局后以及压缩窗口出现双轴滚动时。
- 本仓库 Chromium 与 Nuxt 生产构建/hydration 已验证；Safari、触屏、真实行情和目标硬件仍需在业务工程独立验证。
