<template>
  <div>
    <h1 class="ssr-heading" data-testid="ssr-shell">Nuxt 3 服务端工作台外壳</h1>
    <ClientOnly>
      <TradingWorkspace />
      <template #fallback>
        <div data-testid="workspace-fallback" class="workspace-fallback" role="status">交易工作台加载中…</div>
      </template>
    </ClientOnly>
  </div>
</template>
<style>
.ssr-heading { height: 32px; margin: 0; padding: 6px 16px; font: 14px sans-serif; box-sizing: border-box; background: #15191e; color: #cbd5e1; }
.workspace-fallback { height: calc(100vh - 32px); min-height: 600px; display: grid; place-items: center; background: #0b0e11; color: #aab2c0; }
</style>
