import { Plugin } from "siyuan";
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;

export default class VitePlugin extends Plugin {
  async onLayoutReady() {
    const urlParams = new URLSearchParams(window.location.search);
    const blockId = urlParams.getAll("block_id");
    const block_show = urlParams.get("block_show");
    if (block_show && blockId) {
      this.addFloatLayer({
        x: 0,
        y: 0,
        ids: [...blockId],
      });
      const el: HTMLElement = window.siyuan.blockPanels[0].element;
      //   钉住
      (el.querySelector(`[data-type="pin"]`) as HTMLButtonElement)?.click();
      await import("./view_block.css");
    }
  }
}
