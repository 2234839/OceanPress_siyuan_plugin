import { Dialog } from 'siyuan';
import { SiyuanPlugin } from '~/libs/siyuanPlugin';
import.meta.hot;
import { generateTimestamp, generateUniqueId } from '~/libs/js_util';
import { watchDebounced } from '@vueuse/core';
import chatAIView from './ui.vue';
import * as openaiAPI from '~/aiChat-plugin-siyuan/openai';
import { qdrantConfig, indexingState } from './qdrant/types';
import { indexNotes } from './qdrant/indexer';
import AiChatDialog from './components/AiChatDialog.vue';

export default class VitePlugin extends SiyuanPlugin {
  openaiAPI = openaiAPI;
  async onload() {
    // @ts-expect-error
    window['aiChatPlugin'] = this;

    /** 顶栏图标 — 打开弹窗 */
    this.addTopBar({
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>`,
      title: 'AI 助手',
      callback: () => {
        this.showDialog();
      },
    });

    /** 斜杠命令 — 在文档中插入聊天块 */
    this.protyleSlash.push({
      id: 'ai:chat',
      filter: ['ai', 'chat', 'gpt'],
      callback(protyle) {
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

    /** 轮询挂载文档内嵌聊天 UI */
    const id = setInterval(() => {
      document.querySelectorAll<HTMLElement>(`[custom-ai-chat]`).forEach((el) => {
        this.addVueUi(el, chatAIView, { plugin: this });
      });
    }, 500);

    /** 加载配置 */
    await this.loadAiChatConfig();
    await this.loadQdrantConfig();

    /** 自动保存配置 */
    const clearAiChat = watchDebounced(
      openaiAPI.aiChatConfig,
      () => { this.saveAiChatConfig(); },
      { deep: true, debounce: 1_000 },
    );
    const clearQdrant = watchDebounced(
      qdrantConfig,
      () => { this.saveQdrantConfig(); },
      { deep: true, debounce: 1_000 },
    );

    /** 自动增量索引 */
    const autoIndexTimer = this.startAutoIndex();

    this.addUnloadFn(() => {
      clearInterval(id);
      clearInterval(autoIndexTimer);
      clearAiChat();
      clearQdrant();
    });
  }

  /** 弹窗模式 */
  showDialog() {
    const dialog = new Dialog({
      title: 'AI 助手',
      content: `<div class="b3-dialog__content"></div>`,
    });
    const div = dialog.element.querySelector('.b3-dialog__content')! as HTMLElement;
    this.addVueUi(div, AiChatDialog, {
      plugin: this,
      qdrantConfig,
      indexingState,
    });
  }

  async loadAiChatConfig() {
    const saved = await this.loadData('aiChatConfig');
    Object.assign(openaiAPI.aiChatConfig, saved);
  }
  async saveAiChatConfig() {
    await this.saveData('aiChatConfig', openaiAPI.aiChatConfig);
  }
  async loadQdrantConfig() {
    const saved = await this.loadData('qdrantConfig');
    if (saved) Object.assign(qdrantConfig, saved);
  }
  async saveQdrantConfig() {
    await this.saveData('qdrantConfig', { ...qdrantConfig });
  }

  /** 启动自动增量索引定时器，返回 timer ID */
  startAutoIndex(): ReturnType<typeof setInterval> {
    /** 首次加载：如果已开启自动索引，立即执行一次 */
    if (qdrantConfig.autoIndex && qdrantConfig.qdrantUrl.trim()) {
      this.runAutoIndex();
    }

    /** 每分钟检查一次是否需要执行 */
    return setInterval(() => {
      if (qdrantConfig.autoIndex && qdrantConfig.qdrantUrl.trim() && !indexingState.isIndexing) {
        this.runAutoIndex();
      }
    }, 60_000);
  }

  /** 执行自动增量索引（根据配置的间隔判断是否该执行） */
  async runAutoIndex() {
    if (indexingState.isIndexing) return;
    const intervalMs = (qdrantConfig.autoIndexInterval || 30) * 60_000;
    /** 用 lastIndexedTime 的时间差判断是否到达间隔 */
    if (qdrantConfig.lastIndexedTime) {
      const last = this.parseSiyuanTime(qdrantConfig.lastIndexedTime);
      if (last && Date.now() - last.getTime() < intervalMs) return;
    }
    try {
      await indexNotes(qdrantConfig, indexingState);
      await this.saveQdrantConfig();
    } catch (e) {
      console.error('[AI Chat] 自动索引失败:', e);
    }
  }

  /** 解析思源时间戳格式 "20240805140351" → Date */
  parseSiyuanTime(ts: string): Date | null {
    if (ts.length !== 14) return null;
    return new Date(
      +ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8),
      +ts.slice(8, 10), +ts.slice(10, 12), +ts.slice(12, 14),
    );
  }
}