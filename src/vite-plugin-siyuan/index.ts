// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;
import siyuan from "siyuan";

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
    const url = await this.loadData("url");
    if (!url) return;
    this.loadByUrl(url);
  }
  layoutRead = false;
  onLayoutReady(): void {
    this.layoutRead = true;
  }
  public async loadByUrl(url: string) {
    this.saveData("url", url);

    let moduleSrc = `${url}?t=${Date.now()}`;
    console.log("[url]", url);
    // 插件名，插件的loadData 之类的方法和插件名是相关的
    let name = "";
    if (url.endsWith("/index.ts")) {
      const pluginJSON: { name: string } = await fetch(
        url.replace(/\/index\.ts$/, "/plugin.json"),
      ).then((r) => r.json());
      console.log("[pluginJSON]", pluginJSON);
      name = pluginJSON.name;
    }
    import(moduleSrc).then((module) => {
      const pluginClass = module.default;
      const pluginName = name || pluginClass.name;
      const plugin = new pluginClass({
        app: this.app,
        displayName: pluginName,
        name: pluginName,
        i18n: {},
      }) as siyuan.Plugin;
      this.app.plugins.push(plugin);
      plugin.onload();
      if (this.layoutRead) {
        plugin.onLayoutReady();
      }
      console.log("[load plugin]", { module, pluginClass, plugin });
      const oldPlugin = this.app.plugins.find((el) => el.name === pluginName);
      oldPlugin?.onunload();
    });
  }
  public async setViteUrl(url: string) {
    await this.saveData("url", url);
    this.loadByUrl(url);
  }
}
