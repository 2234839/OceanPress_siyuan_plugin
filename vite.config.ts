import { resolve } from 'path';
import { defineConfig, type UserConfigExport, loadEnv } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { writeFile, copyFile } from 'fs/promises';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import vue from '@vitejs/plugin-vue';

console.log('=============================');
const viteConfig: UserConfigExport = (ctx) => {
  const env: {
    /** 存在此变量编译输出至此目录,例如 C:/Users/llej/Documents/SiYuan/data/plugins */
    VITE_dist_dir?: string;
  } = loadEnv(ctx.mode, process.cwd());
  console.log('[env]', env);
  const scriptFile = process.env?.fileName ?? 'index.ts';
  console.log('[scriptFile]', scriptFile, scriptFile.replace(/\.tsx?$/, '.js'));
  const format: 'cjs' | 'esm' = (process.env?.format as 'esm') ?? 'cjs';
  const emptyOutDir = process.env?.emptyOutDir ?? true;
  const pluginName = process.env.plugin_name ?? 'vite-plugin-siyuan';
  console.log('[pluginName]', pluginName, ctx.mode);
  if (ctx.mode === 'production' && !process.env.CI && !process.env.SKIP_VERSION_BUMP) {
    console.log('自动提升插件版本号', pluginName);
    // 自动提升插件版本号
    const pluginJsonPath = resolve(__dirname, `src/${pluginName}/plugin.json`);
    const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'));
    const newVersion = pluginJson.version.replace(/(\d+)$/, (match: string) => parseInt(match, 10) + 1);
    const updated = { ...pluginJson, version: newVersion };
    writeFile(
      `./src/${pluginName}/plugin.json`,
      JSON.stringify(updated, null, 2),
    );
    // 特例
    if (pluginName === 'oceanpress-siyuan-plugin') {
      writeFile(
        `./plugin.json`,
        JSON.stringify(updated, null, 2),
      );
      copyFile('./README.md', `./src/${pluginName}/README.md`);
    }
  }
  return defineConfig({
    server: {
      // cors: true,
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['*'],
      },
    },
    base: ctx.mode === 'development' ? '/' : `/plugins/${pluginName}/`,
    publicDir: `./src/${pluginName}`,

    // optimizeDeps: {
    //   include: ["siyuan"],
    // },
    resolve: {
      alias: {
        '~': resolve(__dirname, 'src'),
        '@': resolve(__dirname, 'src'),
        siyuan: 'test',
      },
    },
    // https://vitejs.dev/guide/env-and-mode.html#env-files
    // 在这里自定义变量
    define: {
      process: { env: { DEV_MODE: ctx.mode } },
    },
    plugins: [
      cssInjectedByJsPlugin(),
      vue(),
      /**
       * 思源对插件文件只返回 Last-Modified、没有 Cache-Control，浏览器会按启发式缓存，
       * 插件更新后仍可能长时间执行旧的入口脚本。构建后把 HTML 里的 __PLUGIN_VERSION__
       * 替换为当前版本号，入口脚本地址随版本变化，新旧版本不会混用
       */
      {
        name: 'html-entry-version',
        apply: 'build',
        closeBundle() {
          /** 构建输出的插件目录 */
          const outPluginDir = `${env.VITE_dist_dir ?? 'dist'}/${pluginName}`;
          const { version } = JSON.parse(
            readFileSync(resolve(__dirname, `src/${pluginName}/plugin.json`), 'utf-8'),
          );
          for (const file of readdirSync(outPluginDir)) {
            if (!file.endsWith('.html')) continue;
            /** 输出目录中 HTML 文件的绝对路径 */
            const htmlPath = resolve(outPluginDir, file);
            /** 该 HTML 文件的内容 */
            const html = readFileSync(htmlPath, 'utf-8');
            if (!html.includes('__PLUGIN_VERSION__')) continue;
            writeFileSync(htmlPath, html.split('__PLUGIN_VERSION__').join(version));
          }
        },
      },
      // siyuan lib 实际上是空的，在运行时才能够通过 require 进行加载，
      // 而 vite 使用 import 会无法加载到改包，这里做一个 hack 给改成 require
      // 这样配合 vite-plugin-siyuan 就可以在开发的时候直接引用了
      {
        name: 'siyuan shim',
        transform(code, id) {
          // 仅当代码包含 "siyuan" 包的 import 语句时进行处理
          if (/import \{(.*)\} from "siyuan"/.test(code)) {
            const transformedCode = code.replace(
              /import \{(.*)\} from "siyuan"/,
              'const {$1} = require("siyuan")',
            );
            return {
              code: transformedCode,
              map: null, // 可以提供 sourcemap
            };
          }
        },
      },
    ],
    build: {
      lib: {
        entry: `src/${pluginName}/${scriptFile}`,
        name: pluginName,
      },
      // 输出路径
      outDir: `${env.VITE_dist_dir ?? 'dist'}/${pluginName}`,
      emptyOutDir: Boolean(Number(emptyOutDir)),
      // 构建后是否生成 source map 文件
      sourcemap: false,

      // minify: false,
      minify: true,
      rollupOptions: {
        output: {
          entryFileNames:
            (format === 'esm' ? 'es/' : '') + scriptFile.replace(/\.tsx?$/, '.js'),
          format,
          assetFileNames: `asset/[name]-[hash][extname]`,
          // 禁用代码分割，确保所有代码打包到一个文件
          inlineDynamicImports: true,
        },
        external: ['siyuan', 'process'],
      },
    },
  });
};

export default viteConfig;
