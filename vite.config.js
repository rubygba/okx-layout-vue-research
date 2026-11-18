import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // Keep local development at /; Pages builds explicitly select the project path.
  base: process.env.PAGES_BASE_PATH || '/',
});
