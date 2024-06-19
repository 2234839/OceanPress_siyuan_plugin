import { resolve } from "path";
import { defineConfig, type UserConfigExport } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import solidPlugin from "vite-plugin-solid";
import { writeFile } from "fs/promises";
import { execSync } from "child_process";

console.log("=============================");
const viteConfig: UserConfigExport = (ctx) => {
  const pluginName = process.env.plugin_name ?? "vite-plugin-siyuan";
  console.log("[pluginName]", pluginName, ctx.mode);
  if (ctx.mode === "production") {
    // 自动提升插件版本号
    import(`./src/${pluginName}/plugin.json`).then((r) => {
      const res = execSync(`git status --porcelain ./src/${pluginName}/`).toString("utf-8");
      if (res.length > 0) {
        writeFile(
          `./src/${pluginName}/plugin.json`,
          JSON.stringify(
            {
              ...r.default,
              version: r.default.version.replace(/(\d+)$/, (match) => parseInt(match, 10) + 1),
            },
            null,
            2,
          ),
        );
      }
      const pluginJSON = console.log("[r]", res);
    });
  }

  return defineConfig({
    // base: ctx.mode ==="development" ? "/" :"/plugins/oceanpress-siyuan-plugin/",
    publicDir: `./src/${pluginName}`,
    // optimizeDeps: {
    //   include: ["siyuan"],
    // },
    resolve: {
      alias: {
        "~": resolve(__dirname, "src"),
        siyuan: "test",
      },
    },
    // https://vitejs.dev/guide/env-and-mode.html#env-files
    // 在这里自定义变量
    define: {
      "process.env.DEV_MODE": `"${ctx.mode}"`,
    },
    plugins: [
      cssInjectedByJsPlugin(),
      solidPlugin({
        solid: {
          // 禁止事件委派，不禁用的话 需要 on:click 的形式才能阻止事件冒泡，但 typescript 类型不友好会报错
          delegateEvents: false,
        },
      }),
      // siyuan lib 实际上是空的，在运行时才能够通过 require 进行加载，
      // 而 vite 使用 import 会无法加载到改包，这里做一个 hack 给改成 require
      // 这样配合 vite-plugin-siyuan 就可以在开发的时候直接引用了
      {
        name: "siyuan shim",
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
        entry: `src/${pluginName}/index.ts`,
        name: pluginName,
        fileName: (format) => `index.js`,
      },
      // 输出路径
      outDir: `dist/${pluginName}`,
      emptyOutDir: false,

      // 构建后是否生成 source map 文件
      sourcemap: true,

      minify: !ctx.mode,
      rollupOptions: {
        // input: {
        //   plugin: `./src/${pluginName}/index.ts`,
        // },
        output: [
          {
            entryFileNames: "index.js",
            format: "cjs",
            assetFileNames: `asset/[name]-[hash][extname]`,
            manualChunks: undefined,
          },
        ],
        external: ["siyuan", "process"],
      },
    },
  });
};

export default viteConfig;
