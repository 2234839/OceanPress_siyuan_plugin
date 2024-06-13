import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import minimist from "minimist";
import { viteStaticCopy } from "vite-plugin-static-copy";
import livereload from "rollup-plugin-livereload";
import zipPack from "vite-plugin-zip-pack";
import fg from "fast-glob";
import { siyuan } from "@llej/js_util";
import { writeFile } from "fs/promises";

import pluginJSON from "./plugin.json";
import pkg from "./package.json";
/** 自动更新plugin.json */
writeFile("./plugin.json", JSON.stringify(siyuan.mergePluginPackage(pkg, pluginJSON), null, 2));

const args = minimist(process.argv.slice(2));
const isWatch = args.watch || args.w || false;

const env = loadEnv(isWatch, "./") as {
  VITE_targetDir?: string;
};

const distDir = env.VITE_targetDir ? `${env.VITE_targetDir}/${pkg.name}` : "./dist";

console.log("isWatch=>", isWatch);
console.log("distDir=>", distDir);

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(__dirname, "src"),
    },
  },

  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "./README*.md",
          dest: "./",
        },
        {
          src: "./icon.png",
          dest: "./",
        },
        {
          src: "./preview.png",
          dest: "./",
        },
        {
          src: "./plugin.json",
          dest: "./",
        },
      ],
    }),
  ],

  // https://github.com/vitejs/vite/issues/1930
  // https://vitejs.dev/guide/env-and-mode.html#env-files
  // https://github.com/vitejs/vite/discussions/3058#discussioncomment-2115319
  // 在这里自定义变量
  define: {
    "process.env.DEV_MODE": `"${isWatch}"`,
  },

  build: {
    // 输出路径
    outDir: distDir,
    emptyOutDir: false,

    // 构建后是否生成 source map 文件
    sourcemap: true,

    // 设置为 false 可以禁用最小化混淆
    // 或是用来指定是应用哪种混淆器
    // boolean | 'terser' | 'esbuild'
    // 不压缩，用于调试
    minify: !isWatch,

    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "src/index.ts"),
      // the proper extensions will be added
      fileName: "index",
      formats: ["cjs"],
    },
    rollupOptions: {
      plugins: [
        ...(isWatch
          ? [
              livereload({
                watch: distDir,
              }),
              {
                //监听静态资源文件
                name: "watch-external",
                async buildStart() {
                  const files = await fg(["./plugin.json"]);
                  for (let file of files) {
                    this.addWatchFile(file);
                  }
                },
              },
            ]
          : [
              zipPack({
                inDir: distDir,
                outDir: "./",
                outFileName: "package.zip",
              }),
            ]),
      ],

      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["siyuan", "process"],

      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") {
            return "index.css";
          }
          return assetInfo.name!;
        },
        //TODO 这里在非localhost下有问题，但我不知道如何解决,反正这个功能也基本就开发者使用，就这样吧。
        sourcemapBaseUrl: `http://localhost:6806/plugins/${pluginJSON.name}/`,
        sourcemapPathTransform: (sourcePath) => {
          return `${pluginJSON.name}/${sourcePath}`;
        },
      },
    },
  },
});
