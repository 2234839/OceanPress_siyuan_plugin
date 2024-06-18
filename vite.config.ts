import { resolve } from "path";
import { defineConfig, loadEnv, type UserConfigExport } from "vite";
import zipPack from "vite-plugin-zip-pack";

const viteConfig: UserConfigExport = (ctx) => {
  const env = loadEnv(ctx.mode, "./") as {
    VITE_targetDir?: string;
  };
  const pluginName = process.env.plugin_name ?? "vite-plugin-siyuan";
  console.log("[pluginName]", pluginName);
  return defineConfig({
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
      // siyuan lib 实际上是空的，在运行时才能够通过 require 进行加载，
      // 而 vite 使用 import 会无法加载到改包，这里做一个 hack 给改成 require
      // 这样配合 vite-plugin-siyuan 就可以在开发的时候直接引用了
      {
        name: "siyuan shim",
        transform(code, id) {
          // 仅当代码包含 "siyuan" 包的 import 语句时进行处理
          if (/^import \{(.*)\} from "siyuan"/.test(code)) {
            const transformedCode = code.replace(
              /^import \{(.*)\} from "siyuan"/,
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
          },
        ],
        plugins: [
          ctx.mode === "production" &&
            zipPack({
              inDir: `dist/${pluginName}`,
              outDir: `dist/${pluginName}`,
              outFileName: "package.zip",
            }),
        ],
        external: ["siyuan", "process"],
      },
    },
  });
};

export default viteConfig;
