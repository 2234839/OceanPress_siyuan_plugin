import { Plugin } from "siyuan";
import type { JSX } from "solid-js/jsx-runtime";
import { render } from "solid-js/web";
import { createApp, type Component } from "vue";
import { oceanpress_ui_flag } from "~/oceanpress-siyuan-plugin/const";
export class SiyuanPlugin extends Plugin {
  // 在 unload 时执行注册的函数
  addUnloadFn(fn: () => void) {
    this.onunloadFn.push(fn);
  }
  onunloadFn: (() => void)[] = [];
  onunload(): void {
    this.onunloadFn.forEach((fn) => fn());
  }
  /**
   * 如果 ui 组件已添加，就不会重复添加
   */
  async addUiComponent(parentEL: HTMLElement, jsxEl: () => JSX.Element) {
    // 因为思源会修改dom，导致添加在文档里的元素消失，所以这里检测是否需要重新添加
    if (parentEL.querySelector("." + oceanpress_ui_flag)) return;

    const div = document.createElement("div");
    div.style.pointerEvents = "none";
    const dispose = render(jsxEl, div);
    this.addUnloadFn(() => (div.remove(), dispose()));
    parentEL.appendChild(div);
  }
  /**
   * 如果 ui 组件已添加，就不会重复添加
   */
  async addVueUiComponent(parentEL: HTMLElement, VueComponent: Component) {
    // Check if the component already exists to avoid duplicates
    if (parentEL.querySelector(`.${oceanpress_ui_flag}`)) return;

    const mountEl = document.createElement("div");
    mountEl.classList.add(oceanpress_ui_flag);

    // Create and mount the Vue app
    const app = createApp(VueComponent);
    const instance = app.mount(mountEl);

    // Set pointer-events to none
    // mountEl.style.pointerEvents = "none";

    // Add cleanup function
    this.addUnloadFn(() => {
      app.unmount();
      mountEl.remove();
    });

    // Append the mounted element to the parent
    parentEL.appendChild(mountEl);

    return instance;
  }
}
