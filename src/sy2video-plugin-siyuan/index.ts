import { Plugin } from "siyuan";
import { appendBlock, upload } from "~/libs/api";
import { chatTTS } from "~/libs/chat_tts";
import "./view_block.css";
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;

const classFlag = `sy2video-plugin-siyuan`;

export default class sy2video extends Plugin {
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
      document.body.classList.add(classFlag);
      this.onunloadFn.push(() => {
        document.body.classList.remove(classFlag);
      });
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
  onunloadFn: (() => void)[] = [];
  onunload(): void {
    this.onunloadFn.forEach((fn) => fn());
  }
}
