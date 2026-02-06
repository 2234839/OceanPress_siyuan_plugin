import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import VueDevTools from 'vite-plugin-vue-devtools';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [vue(), VueDevTools(), tailwindcss()],
  base: './',
  publicDir: resolve(__dirname, 'src/playground/public'),
  server: {
    port: 5173,
    open: true,
    cors: true,
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
      '@': resolve(__dirname, 'src'),
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
    outDir: resolve(__dirname, 'src/playground/dist'),
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
