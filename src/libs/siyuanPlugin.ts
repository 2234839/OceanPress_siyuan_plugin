import { Plugin } from 'siyuan';
import { createApp, type Component } from 'vue';
import { oceanpress_ui_flag } from '~/oceanpress-siyuan-plugin/const';
export class SiyuanPlugin extends Plugin {
  // 在 unload 时执行注册的函数
  addUnloadFn(fn: () => void) {
    this.onunloadFn.push(fn);
  }
  onunloadFn: (() => void)[] = [];
  onunload(): void {
    this.onunloadFn.forEach((fn) => fn());
  }

  async addVueUi(
    parentEL: HTMLElement,
    VueComponent: Component,
    props?: any,
    uiFlag = oceanpress_ui_flag,
  ) {
    if (parentEL.querySelector(`.${uiFlag}`)) return;
    const mountEl = document.createElement('div');
    parentEL.appendChild(mountEl);
    mountEl.classList.add(uiFlag);

    /** 防止事件和思源的编辑器相互影响 */
    const stopPropagation = (e: Event) => {
      e.stopImmediatePropagation();
    };
    const events = [
      'compositionstart',
      'compositionend',
      'mousedown',
      'mouseup',
      'keydown',
      'keyup',
      'input',
      'copy',
      'cut',
      'paste',
    ];
    events.forEach((event) => {
      mountEl.addEventListener(event, stopPropagation);
    });
    mountEl.classList.add(oceanpress_ui_flag);

    const blockId = parentEL.dataset.nodeId;
    // Create and mount the Vue app
    const app = createApp(VueComponent, {
      blockId,
      ...props,
    });
    const instance = app.mount(mountEl);
    this.saveData;
    // Add cleanup function
    this.addUnloadFn(() => {
      app.unmount();
      mountEl.remove();
    });
    return instance;
  }
}
