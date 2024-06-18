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
  public loadByUrl(url: string) {
    this.saveData("url", url);

    let src = `${url}?t=${Date.now()}`;
    import(src).then((module) => {
      const pluginClass = module.default;
      const plugin = new pluginClass({
        app: this.app,
        displayName: pluginClass.name,
        name: pluginClass.name,
        i18n: {},
      }) as siyuan.Plugin;
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
