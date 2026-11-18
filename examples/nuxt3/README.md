# Nuxt 3 SSR compatibility fixture

此目录复用根项目 `src`，展示 SSR 页面外壳 + client-only Dockview 工作台，不声称 Dockview 面板在服务器渲染。详细边界与实测结果见 [SSR验证](../../docs/SSR验证.md)。

```bash
# 在仓库根安装依赖
npm ci
cd examples/nuxt3
npm ci
npm run build
npx playwright install chromium
npm run test:hydration
```

HTTP SSR 校验：先 `PORT=3100 HOST=127.0.0.1 npm run preview`，另一终端执行 `npm run test:ssr`。不要将此 fixture 当成 GitHub Pages 动态服务器。
