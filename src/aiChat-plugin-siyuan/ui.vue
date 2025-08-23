<template>
  <div class="ai-chat-container" :class="oceanpress_ui_flag" contenteditable="false" ref="uiDiv">
    <!-- 头部区域 -->
    <div class="chat-header">
      <div class="header-left">
        <div class="title-section">
          <h2 class="title">思源AI助手</h2>
          <span class="version-badge">测试版</span>
        </div>
      </div>
      <div class="header-right">
        <button
          class="config-toggle-btn"
          @click.stop="showConfig = !showConfig"
          :class="{ active: showConfig }"
          title="设置">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- 配置面板 -->
    <transition name="slide-down">
      <ConfigPanel v-if="showConfig" v-model="aiChatConfig" @change="handleConfigChange" />
    </transition>

    <!-- 输入区域 -->
    <div class="input-section">
      <div class="input-wrapper">
        <textarea
          v-model="data.searchText"
          class="chat-input"
          placeholder="请输入您的问题..."
          :disabled="data.run"
          @keydown.enter.prevent="handleEnterKey"
          ref="textInput"></textarea>
        <button
          @click.stop="run"
          class="submit-button"
          :disabled="data.run || !data.searchText.trim()"
          :class="{ loading: data.run }">
          <span v-if="!data.run" class="button-text">发送</span>
          <div v-else class="loading-spinner"></div>
        </button>
      </div>

      <!-- 搜索选项 -->
      <div class="search-options">
        <label class="option-label">
          <input type="checkbox" v-model="data.useMultiRoundSearch" :disabled="data.run" />
          <span class="option-text">启用智能多轮搜索</span>
          <span class="option-description">AI 将自动分析并多次搜索以获得更全面的答案</span>
        </label>
      </div>
    </div>
    <!-- 搜索进度显示 -->
    <transition name="fade-in">
      <SearchProgress v-if="data.showSearchProgress" :search-state="searchState" />
    </transition>

    <!-- 错误提示 -->
    <transition name="slide-up">
      <ErrorMessage
        v-if="data.errorMessage"
        :message="data.errorMessage"
        @close="data.errorMessage = ''" />
    </transition>

    <!-- 结果显示区域 -->
    <transition name="fade-in">
      <ResultDisplay v-if="data.html" :content="data.html" @copy="handleCopySuccess" />
    </transition>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref, useTemplateRef, nextTick } from 'vue';
  import {
    aiChatConfig,
    执行ai问答,
    执行自主多轮搜索,
    searchState,
    SearchState,
  } from '~/aiChat-plugin-siyuan/openai';
  import { getBlockAttrs, setBlockAttrs } from '~/libs/api';
  import { SiyuanPlugin } from '~/libs/siyuanPlugin';
  import { oceanpress_ui_flag } from '~/oceanpress-siyuan-plugin/const';
  import ConfigPanel from './components/ConfigPanel.vue';
  import SearchProgress from './components/SearchProgress.vue';
  import ErrorMessage from './components/ErrorMessage.vue';
  import ResultDisplay from './components/ResultDisplay.vue';

  const uiDiv = useTemplateRef<HTMLElement | null>('uiDiv');
  const showConfig = ref(false);
  const textInput = useTemplateRef<HTMLTextAreaElement | null>('textInput');

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
    useMultiRoundSearch: true,
    showSearchProgress: false,
    errorMessage: '',
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
    // 自动聚焦到输入框
    nextTick(() => {
      textInput.value?.focus();
    });
  });

  // 搜索状态响应式更新
  function updateSearchState(state: SearchState) {
    searchState.isSearching = state.isSearching;
    searchState.currentStep = state.currentStep;
    searchState.round = state.round;
    searchState.keywords = state.keywords;
    searchState.searchResults = state.searchResults;
    searchState.thinkingProcess = state.thinkingProcess;
  }
  //#endregion 数据存储
  // 处理回车键发送
  function handleEnterKey(event: KeyboardEvent) {
    if (event.shiftKey) return; // Shift+Enter 换行
    if (!data.run && data.searchText.trim()) {
      run();
    }
  }

  // 处理配置变更
  function handleConfigChange() {
    // 配置变更时的处理逻辑
    console.log('配置已更新:', aiChatConfig);
  }

  // 处理复制成功
  function handleCopySuccess() {
    // 可以添加复制成功的提示
    console.log('复制成功');
  }

  async function run() {
    if (!data.searchText.trim()) {
      data.errorMessage = '请输入您的问题';
      return;
    }

    try {
      data.run = true;
      data.showSearchProgress = true;
      data.errorMessage = '';

      // 重置搜索状态
      searchState.isSearching = false;
      searchState.currentStep = '';
      searchState.round = 0;
      searchState.keywords = [];
      searchState.searchResults = [];
      searchState.thinkingProcess = [];

      if (data.useMultiRoundSearch) {
        // 使用自主多轮搜索
        const result = await 执行自主多轮搜索(data.searchText, 3, updateSearchState);
        data.html = Md2BlockDOM(result.finalAnswer);
      } else {
        // 使用传统单轮搜索
        const res = await 执行ai问答(data.searchText);
        data.html = Md2BlockDOM(res.res);
      }
    } catch (error) {
      console.error('AI 回答失败:', error);
      data.errorMessage = `AI 回答失败: ${error instanceof Error ? error.message : '未知错误'}`;
    } finally {
      data.run = false;
      data.showSearchProgress = false;
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
  /* 主容器 */
  .ai-chat-container {
    padding: 16px;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid #e4e7ed;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* 头部区域 */
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    color: #2c3e50;
  }

  .version-badge {
    padding: 2px 8px;
    background: #e3f2fd;
    color: #1976d2;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .config-toggle-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: #f5f5f5;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .config-toggle-btn:hover {
    background: #e8e8e8;
  }

  .config-toggle-btn.active {
    background: #e3f2fd;
    color: #1976d2;
  }

  .icon {
    width: 18px;
    height: 18px;
  }

  /* 输入区域 */
  .input-section {
    margin-bottom: 16px;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .chat-input {
    flex: 1;
    min-height: 60px;
    max-height: 120px;
    padding: 12px;
    border: 1px solid #ced4da;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
    transition: border-color 0.2s ease;
    font-family: inherit;
  }

  .chat-input:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
  }

  .chat-input:disabled {
    background: #f8f9fa;
    cursor: not-allowed;
  }

  .submit-button {
    width: 48px;
    height: 48px;
    border: none;
    background: #4a90e2;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .submit-button:hover:not(:disabled) {
    background: #357abd;
    transform: translateY(-1px);
  }

  .submit-button:disabled {
    background: #ced4da;
    cursor: not-allowed;
  }

  .submit-button.loading {
    background: #6c757d;
  }

  .button-text {
    font-size: 14px;
    font-weight: 500;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #ffffff;
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* 搜索选项 */
  .search-options {
    margin-top: 8px;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e4e7ed;
  }

  .option-label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;
  }

  .option-text {
    font-weight: 500;
    color: #495057;
  }

  .option-description {
    font-size: 12px;
    color: #6c757d;
    margin-top: 2px;
  }

  .option-label input {
    margin-top: 2px;
  }

  /* 动画效果 */
  .slide-down-enter-active,
  .slide-down-leave-active {
    transition: all 0.3s ease;
  }

  .slide-down-enter-from {
    opacity: 0;
    transform: translateY(-10px);
  }

  .slide-down-leave-to {
    opacity: 0;
    transform: translateY(-10px);
  }

  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: all 0.3s ease;
  }

  .slide-up-enter-from {
    opacity: 0;
    transform: translateY(10px);
  }

  .slide-up-leave-to {
    opacity: 0;
    transform: translateY(10px);
  }

  .fade-in-enter-active,
  .fade-in-leave-active {
    transition: opacity 0.3s ease;
  }

  .fade-in-enter-from,
  .fade-in-leave-to {
    opacity: 0;
  }

  /* 动画效果 */
  .slide-down-enter-active,
  .slide-down-leave-active {
    transition: all 0.3s ease;
  }

  .slide-down-enter-from {
    opacity: 0;
    transform: translateY(-10px);
  }

  .slide-down-leave-to {
    opacity: 0;
    transform: translateY(-10px);
  }

  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: all 0.3s ease;
  }

  .slide-up-enter-from {
    opacity: 0;
    transform: translateY(10px);
  }

  .slide-up-leave-to {
    opacity: 0;
    transform: translateY(10px);
  }

  .fade-in-enter-active,
  .fade-in-leave-active {
    transition: opacity 0.3s ease;
  }

  .fade-in-enter-from,
  .fade-in-leave-to {
    opacity: 0;
  }
</style>
