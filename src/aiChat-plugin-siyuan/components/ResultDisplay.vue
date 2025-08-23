<template>
  <div class="result-section">
    <div class="result-header">
      <div class="result-title">AI 回答</div>
      <button class="copy-button" @click="copyResult" title="复制回答">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
    <div ref="resultDiv" class="result-content" v-html="content" />
  </div>
</template>

<script setup lang="ts">
  import { ref, useTemplateRef, watch } from 'vue';

  const props = defineProps<{
    content: string;
  }>();

  const emit = defineEmits<{
    copy: [];
  }>();

  const contentRef = ref<HTMLElement>();

  defineExpose({
    contentRef,
  });

  const copyResult = async () => {
    try {
      if (resultDiv$.value) {
        const text = resultDiv$.value.innerText || resultDiv$.value.textContent;
        await navigator.clipboard.writeText(text);
        // 发送复制成功事件
        emit('copy');
      }
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const resultDiv$ = useTemplateRef<HTMLElement>('resultDiv');
  // 禁止编辑这些元素
  watch(
    () => props.content,
    () => {
      setTimeout(() => {
        resultDiv$.value?.querySelectorAll('[contenteditable]').forEach((el: Element) => {
          el.setAttribute('contenteditable', 'false');
        });
      }, 100);
    },
  );
</script>

<style scoped>
  .result-section {
    margin-top: 16px;
    border: 1px solid var(--b3-border-color, #e4e7ed);
    border-radius: 8px;
    overflow: hidden;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--b3-theme-background-light, #f8f9fa);
    border-bottom: 1px solid var(--b3-border-color, #e4e7ed);
  }

  .result-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--b3-theme-on-background, #495057);
  }

  .copy-button {
    width: 32px;
    height: 32px;
    border: 1px solid var(--b3-border-color, #e4e7ed);
    background: var(--b3-theme-background, #ffffff);
    color: var(--b3-theme-on-background, #495057);
    cursor: pointer;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .copy-button:hover {
    background: var(--b3-theme-primary, #4a90e2);
    color: white;
    border-color: var(--b3-theme-primary, #4a90e2);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .copy-button:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .copy-button .icon {
    width: 18px;
    height: 18px;
    stroke-width: 2;
  }

  .result-content {
    padding: 16px;
    background: var(--b3-theme-background, white);
    color: var(--b3-theme-on-background, #2c3e50);
  }

  /* 暗色模式下的内容样式适配 */
  .result-content :deep(a) {
    color: var(--b3-theme-primary, #4a90e2);
  }

  .result-content :deep(code) {
    background: var(--b3-theme-background-light, #f1f3f4);
    color: var(--b3-theme-on-background, #2c3e50);
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.9em;
  }

  .result-content :deep(pre) {
    background: var(--b3-theme-background-light, #f1f3f4);
    border: 1px solid var(--b3-border-color, #e4e7ed);
    border-radius: 4px;
    padding: 12px;
    overflow-x: auto;
  }

  .result-content :deep(pre code) {
    background: transparent;
    padding: 0;
    border: none;
  }

  .result-content :deep(blockquote) {
    border-left: 4px solid var(--b3-theme-primary, #4a90e2);
    background: var(--b3-theme-background-light, #f8f9fa);
    margin: 16px 0;
    padding: 8px 16px;
    color: var(--b3-theme-on-background-light, #6c757d);
  }

  .result-content :deep(h1),
  .result-content :deep(h2),
  .result-content :deep(h3),
  .result-content :deep(h4),
  .result-content :deep(h5),
  .result-content :deep(h6) {
    color: var(--b3-theme-on-background, #2c3e50);
    margin-top: 16px;
    margin-bottom: 8px;
  }

  .result-content :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
  }

  .result-content :deep(th),
  .result-content :deep(td) {
    border: 1px solid var(--b3-border-color, #e4e7ed);
    padding: 8px 12px;
    text-align: left;
  }

  .result-content :deep(th) {
    background: var(--b3-theme-background-light, #f8f9fa);
    font-weight: 600;
    color: var(--b3-theme-on-background, #495057);
  }

  .result-content :deep(tr:nth-child(even)) {
    background: var(--b3-theme-background-light, #f8f9fa);
  }
</style>
