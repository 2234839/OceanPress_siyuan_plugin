import { resolve } from "path";
import { defineConfig, loadEnv, type UserConfigExport } from "vite";
import zipPack from "vite-plugin-zip-pack";

const viteConfig: UserConfigExport = (ctx) => {
  const env = loadEnv(ctx.mode, "./") as {
    VITE_targetDir?: string;
  };
  const pluginName = "vite-plugin";
  return defineConfig({
    publicDir: `./src/${pluginName}`,
    resolve: {
      alias: {
        "~": resolve(__dirname, "src"),
      },
    },
    // https://vitejs.dev/guide/env-and-mode.html#env-files
    // 在这里自定义变量
    define: {
      "process.env.DEV_MODE": `"${ctx.mode}"`,
    },

    build: {
      // 输出路径
      outDir: `dist/${pluginName}`,
      emptyOutDir: false,

      // 构建后是否生成 source map 文件
      sourcemap: true,

      minify: !ctx.mode,
      rollupOptions: {
        input: {
          plugin: `./src/${pluginName}/index.ts`,
        },
        output: [
          {
            entryFileNames: "index.js",
            format: "cjs",
            assetFileNames: `asset/[name]-[hash][extname]`,
          },
        ],
        plugins: [
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
