import { appendBlock, upload } from '~/libs/api';
import { chatTTS } from '~/libs/chat_tts';
import './view_block.css';
import { SiyuanPlugin } from '~/libs/siyuanPlugin';
import VideoOverride from '~/sy2video-plugin-siyuan/components/VideoOverride.vue';
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;

const classFlag = `sy2video-plugin-siyuan`;

export default class sy2video extends SiyuanPlugin {
  async onLayoutReady() {
    //#region 只显示指定块，自动缩放
    const urlParams = new URLSearchParams(window.location.search);
    const blockId = urlParams.getAll('block_id');
    const block_show = urlParams.get('block_show');
    if (block_show && blockId) {
      this.addFloatLayer({
        x: 0,
        y: 0,
        isBacklink: false,
        refDefs: [
          {
            refID: blockId[0],
          },
        ],
      });
      const el: HTMLElement = window.siyuan.blockPanels[0].element;
      //   钉住
      (el.querySelector(`[data-type="pin"]`) as HTMLButtonElement)?.click();
      // protyle-content
      // (el.querySelector(`[data-type="pin"]`)
      setTimeout(() => {
        const contentEL = el.querySelector<HTMLElement>(`.protyle-content`)!;
        const rate_w = window.innerWidth / contentEL.getBoundingClientRect().width;
        const rate_h = window.innerHeight / contentEL.getBoundingClientRect().height;
        const rate = rate_h < rate_w ? rate_h : rate_w;
        contentEL.style.setProperty('--scale-factor', String(rate));
      }, 5000);
      document.body.classList.add(classFlag);
      this.onunloadFn.push(() => {
        document.body.classList.remove(classFlag);
      });
    }
    //#endregion

    // === 块文本转音频
    this.eventBus.on('click-blockicon', (event) => {
      window.siyuan.menus.menu.addItem({
        label: '转音频',
        icon: ``,
        click: () => {
          const el = event.detail.blockElements[0];
          const id = el.dataset.nodeId!;
          const text = el.textContent!;
          this.ttsInsert(id, text);
        },
      });
    });

    const id = setInterval(() => {
      document.querySelectorAll('[data-type="NodeVideo"]').forEach((el) => {
        this.addVueUi(el as HTMLElement, VideoOverride,'sy2vide-video-override');
      });
    }, 300);
    this.addUnloadFn(() => clearInterval(id));
  }
  async ttsInsert(id: string, text: string) {
    const res = await chatTTS({
      text,
    });
    const res2 = await fetch(res.audio_files[0].url)
      .then((response) => response.blob())
      .then((blob) => {
        return upload('/assets/', [
          new File(
            [blob],
            `${Date.now()}-${Math.random().toString(36).slice(2)}.${res.audio_files[0].url
              .split('.')
              .pop()!}`,
          ),
        ]);
      });
    const assets = Object.entries(res2.succMap);
    await Promise.all(
      assets.map(([_, assertName]) => {
        return appendBlock(
          'markdown',
          `<audio controls="controls" src="${assertName}" data-src="${assertName}"></audio>`,
          id,
        );
      }),
    );
  }
}
