// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;
import siyuan from "siyuan";
import { synchronousFetch } from "~/libs/xhr";
import pluginJSON from "./plugin.json";
//@ts-ignore
const rawRequire = globalThis.require;
//@ts-ignore
globalThis.require = (moduleName: string) => {
  if (moduleName === "siyuan") {
    return siyuan;
  }
  return rawRequire(moduleName);
};

export default class VitePlugin extends siyuan.Plugin {
  async onload() {
    // @ts-ignore
    globalThis.vitePlugin = this;
    // 因为思源的 onload 中的一些方法调用需要在同步之前调用，所以这里阻塞加载
    const url = await synchronousFetch("/api/file/getFile", {
      path: `/data/storage/petal/${pluginJSON.name}/url`,
    });
    if (!url) return;
    this.loadByUrl(url, false);
  }
  layoutRead = false;
  onLayoutReady(): void {
    this.layoutRead = true;
  }
  public async loadByUrl(url: string, save = true) {
    if (save) {
      this.saveData("url", url);
    }

    let moduleSrc = `${url}?t=${Date.now()}`;
    console.log("[url]", url);
    // 插件名，插件的loadData 之类的方法和插件名是相关的
    if (url.endsWith("/index.ts")) {
    }
    Promise.all([
      JSON.parse(await synchronousFetch(url.replace(/\/index\.ts$/, "/plugin.json"), {})),
      import(moduleSrc),
    ]).then(([pluginJSON, module]) => {
      console.log("[pluginJSON]", pluginJSON);
      const name = pluginJSON.name;

      const pluginClass = module.default;
      const pluginName = name || pluginClass.name;
      const plugin = new pluginClass({
        app: this.app,
        displayName: pluginName,
        name: pluginName,
        i18n: {},
      }) as siyuan.Plugin;

      const oldPlugin = this.app.plugins.find((el) => el.name === pluginName);
      oldPlugin?.onunload();

      this.app.plugins.push(plugin);
      plugin.onload();
      if (this.layoutRead) {
        plugin.onLayoutReady();
      }
      console.log("[load plugin]", { module, pluginClass, plugin });
    });
  }
  public async setViteUrl(url: string) {
    await this.saveData("url", url);
    this.loadByUrl(url);
  }
}
