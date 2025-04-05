<template>
  <div class="protyle-custom" :class="oceanpress_ui_flag" contenteditable="false" ref="uiDiv">
    <div class="input-row">
      <h2 class="title">思源AI助手(测试版)</h2>
      <div class="editable-wrapper" @mousedown.stop>
        <textarea v-model="data.searchText" placeholder="请输入您的问题..."></textarea>
      </div>
      <button @click.stop="run" class="submit-button" :disabled="data.run">
        {{ data.run ? '执行中...' : '提交问题' }}
      </button>
      <div @click.stop="showConfig = !showConfig">⚙️</div>
    </div>
    <div v-if="showConfig" class="config-panel">
      <div class="config-item">
        <label>
          <input type="radio" v-model="aiChatConfig.apiProvider" value="siyuan" />
          使用思源设置中的ai
        </label>
        <label>
          <input type="radio" v-model="aiChatConfig.apiProvider" value="崮生" />
          使用插件作者提供的ai
        </label>
        <label>
          <input type="radio" v-model="aiChatConfig.apiProvider" value="openai" />
          使用自定义ai
        </label>
      </div>
      <div class="config-item" v-if="aiChatConfig.apiProvider === 'openai'">
        <label>
          API Base URL:
          <input
            type="text"
            v-model="aiChatConfig.apiBaseUrl"
            :disabled="aiChatConfig.apiProvider !== 'openai'" />
        </label>
      </div>
      <div class="config-item" v-if="aiChatConfig.apiProvider === 'openai'">
        <label>
          API Key:
          <input
            type="password"
            v-model="aiChatConfig.apiKey"
            :disabled="aiChatConfig.apiProvider !== 'openai'" />
        </label>
      </div>
      <div class="config-item" v-if="aiChatConfig.apiProvider === 'openai'">
        <label>
          Model:
          <input
            type="text"
            v-model="aiChatConfig.model"
            :disabled="aiChatConfig.apiProvider !== 'openai'" />
        </label>
      </div>
    </div>
    <div v-if="data.html" ref="resultDiv" class="result" v-html="data.html" />
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref, useTemplateRef, watchEffect } from 'vue';
  import { aiChatConfig, 执行ai问答 } from '~/aiChat-plugin-siyuan/openai';
  import { getBlockAttrs, setBlockAttrs } from '~/libs/api';
  import { SiyuanPlugin } from '~/libs/siyuanPlugin';
  import { oceanpress_ui_flag } from '~/oceanpress-siyuan-plugin/const';

  const uiDiv = useTemplateRef<HTMLElement | null>('uiDiv');
  const showConfig = ref(false);

  const props = defineProps({
    blockId: {
      type: String,
      required: true,
    },
    plugin: {
      type: Object as () => SiyuanPlugin,
      required: true,
    },
  });

  //#region config
  //#endregion config

  //#region 数据存储
  const data = reactive({
    html: ``,
    searchText: ``,
    run: false,
  });
  async function saveData() {
    return await setBlockAttrs(props.blockId, { 'custom-ai-config': JSON.stringify(data) });
  }
  async function loadData() {
    const res = await getBlockAttrs(props.blockId);
    Object.assign(data, JSON.parse(res['custom-ai-config'] ?? '{}'));
  }
  onMounted(() => {
    loadData();
  });
  //#endregion 数据存储

  const resultDiv$ = useTemplateRef<HTMLElement | null>('resultDiv');
  /** 禁止编辑这些元素 */
  watchEffect(() => {
    data.html;
    setTimeout(() => {
      resultDiv$.value?.querySelectorAll('[contenteditable]').forEach((el) => {
        el.setAttribute('contenteditable', 'false');
      });
    }, 100);
  });
  async function run() {
    try {
      data.run = true;
      const res = await 执行ai问答(data.searchText);
      data.html = Md2BlockDOM(res.res);
    } finally {
      data.run = false;
      await saveData();
    }
  }

  const Lute = (globalThis as any).Lute;
  const lute = Lute.New();

  function Md2BlockDOM(md: string) {
    return lute.Md2BlockDOM(md) as string;
  }
</script>

<style scoped>
  .protyle-custom {
    padding: 2px;
    border-radius: 8px;
  }

  .input-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
    white-space: nowrap;
    margin-right: 15px;
  }

  .editable-wrapper {
    flex-grow: 1;
    margin-right: 15px;
  }

  textarea {
    width: 100%;
    height: 40px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    resize: none;
  }

  textarea:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }

  .submit-button {
    margin-left: 8px;
    padding: 8px 15px;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    white-space: nowrap;
  }

  .submit-button:hover:not(:disabled) {
    background-color: #357abd;
  }

  .submit-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  .result {
    margin-top: 9px;
    padding: 2px;
    border-radius: 4px;
    border: 1px solid #979595;
  }

  .settings-icon {
    width: 24px;
    height: 24px;
    margin-left: 10px;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .settings-icon:hover {
    opacity: 1;
  }

  .config-panel {
    margin-top: 10px;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 5px;
  }

  .config-item {
    margin-bottom: 10px;
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .config-item label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }

  .config-item input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
</style>
