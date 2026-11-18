import { fileURLToPath } from 'node:url';
export default defineNuxtConfig({
  ssr: true,
  devtools: { enabled: false },
  compatibilityDate: '2025-11-01',
  alias: { '@workspace': fileURLToPath(new URL('../../src', import.meta.url)) },
  css: ['dockview-vue/dist/styles/dockview.css', '../../src/style.css'],
  app: { head: { title: 'Vue workspace — Nuxt 3 SSR fixture' } },
  vite: { resolve: { dedupe: ['vue'] }, server: { fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } } }
});
