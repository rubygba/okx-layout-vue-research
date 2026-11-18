import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
assert.equal(typeof window, 'undefined');
assert.equal(typeof document, 'undefined');
assert.equal(typeof localStorage, 'undefined');
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { default: Workspace } = await vite.ssrLoadModule('/src/App.vue');
  const html = await renderToString(createSSRApp({ render: () => h(Workspace) }));
  assert.match(html, /WORKSPACE/);
  assert.doesNotMatch(html, /class="dv-tab(?: |")/);
  console.log('PASS: Vue server render without browser globals. Shell only; Dockview panels initialize on client mount, not on server.');
} finally { await vite.close(); }
