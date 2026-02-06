import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import VueDevTools from 'vite-plugin-vue-devtools';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [vue(), VueDevTools()],
  root: __dirname,
  base: './',
  publicDir: './public',
  server: {
    port: 5173,
    open: true,
    cors: true,
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, '../..'),
      '@': resolve(__dirname, '..'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@jsquash/webp',
      '@jsquash/avif',
      '@jsquash/jpeg',
      '@jsquash/png',
      '@jsquash/jxl',
    ],
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: 'es',
        manualChunks: (id) => {
          // 将 jSquash 模块单独打包
          if (id.includes('@jsquash')) {
            return 'jsquash';
          }
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  assetsInclude: ['**/*.wasm'],
});
