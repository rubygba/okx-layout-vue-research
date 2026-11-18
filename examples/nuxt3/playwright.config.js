import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.js', workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100', viewport: { width: 1440, height: 900 } },
  webServer: { command: 'PORT=3100 HOST=127.0.0.1 node .output/server/index.mjs', url: 'http://127.0.0.1:3100', reuseExistingServer: !process.env.CI }
});
