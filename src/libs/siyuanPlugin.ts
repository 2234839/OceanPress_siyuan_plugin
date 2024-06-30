import { Plugin } from "siyuan";
export class SiyuanPlugin extends Plugin {
  // 在 unload 时执行注册的函数
  addUnloadFn(fn: () => void) {
    this.onunloadFn.push(fn);
  }
  onunloadFn: (() => void)[] = [];
  onunload(): void {
    this.onunloadFn.forEach((fn) => fn());
  }
}
