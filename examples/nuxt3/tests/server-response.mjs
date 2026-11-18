import assert from 'node:assert/strict';
const origin = process.env.NUXT_TEST_URL || 'http://127.0.0.1:3100';
for (let i = 0; i < 3; i++) {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-testid="ssr-shell"/);
  assert.match(html, /data-testid="workspace-fallback"/);
  assert.doesNotMatch(html, /class="dv-tab(?: |")/);
  assert.doesNotMatch(html, /window is not defined|document is not defined|localStorage is not defined/);
}
console.log('PASS: 3 SSR HTTP responses contain shell + stable fallback, no client dock tabs or browser-global exception. Hydration is a separate browser test.');
