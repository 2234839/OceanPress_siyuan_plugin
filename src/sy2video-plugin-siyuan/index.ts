import { Menu, Plugin } from "siyuan";
import { appendBlock, getBlockKramdown, insertLocalAssets, upload } from "~/libs/api";
import { chatTTS } from "~/libs/chat_tts";
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

    this.eventBus.on("click-blockicon", (event) => {
      window.siyuan.menus.menu.addItem({
        label: "转音频",
        icon: ``,
        click: () => {
          const el = event.detail.blockElements[0];
          const id = el.dataset.nodeId!;
          const text = el.textContent!;
          this.ttsInsert(id, text);
        },
      });
    });
  }
  async ttsInsert(id: string, text: string) {
    const res = await chatTTS({
      text,
    });
    const res2 = await fetch(res.audio_files[0].url)
      .then((response) => response.blob())
      .then((blob) => {
        return upload("/assets/", [
          new File(
            [blob],
            `${Date.now()}-${Math.random().toString(36).slice(2)}.${res.audio_files[0].url
              .split(".")
              .pop()!}`,
          ),
        ]);
      });
    const assets = Object.entries(res2.succMap);
    await Promise.all(
      assets.map(([_, assertName]) => {
        return appendBlock(
          "markdown",
          `<audio controls="controls" src="${assertName}" data-src="${assertName}"></audio>`,
          id,
        );
      }),
    );
  }
}
