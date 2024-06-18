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
  onload(): void {
    // @ts-ignore
    globalThis.vitePlugin = this;
    if (!this.data.url) return;
    this.loadByUrl(this.data.url);
  }
  public loadByUrl(url: string) {
    let src = `${url}?t=${Date.now()}`;
    this.saveData("url", src);
    import(src).then((module) => {
      const pluginClass = module.default;
      const plugin = new pluginClass({
        app: this.app,
        displayName: pluginClass.name,
        name: pluginClass.name,
        i18n: {},
      });
      this.app.plugins.push(plugin);
      plugin.onload();
      console.log("[load plugin]", { module, pluginClass, plugin });
    });
  }
  public async setViteUrl(url: string) {
    await this.saveData("url", url);
    this.loadByUrl(url);
  }
}
