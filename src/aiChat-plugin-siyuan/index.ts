import { SiyuanPlugin } from '~/libs/siyuanPlugin';
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;
import { generateTimestamp, generateUniqueId } from '~/libs/js_util';
import chatAIView from './ui.vue';
import * as openaiAPI from '~/aiChat-plugin-siyuan/openai';

export default class VitePlugin extends SiyuanPlugin {
  openaiAPI = openaiAPI;
  async onload() {
    // @ts-expect-error
    window['aiChatPlugin'] = this;

    this.protyleSlash.push({
      id: 'ai:chat',
      filter: ['ai', 'chat', 'gpt'],
      callback(protyle) {
        console.log('[protyle]', protyle);
        const id = generateUniqueId();
        const updated = generateTimestamp();
        protyle.insert(
          `<div data-node-id="${id}" custom-ai-chat="1" data-type="NodeParagraph" updated="${updated}"></div>`,
          true,
          true,
        );
      },
      html: `ai:chat`,
    });

    const id = setInterval(() => {
      document.querySelectorAll<HTMLElement>(`[custom-ai-chat]`).forEach((el) => {
        this.addVueUiComponent(el, chatAIView);
      });
    }, 500);
    this.addUnloadFn(() => clearInterval(id));
  }
}
