<template>
  <div class="result-section">
    <div class="result-header">
      <div class="result-title">AI 回答</div>
      <button class="copy-button" @click="copyResult" title="复制回答">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

  defineEmits<{
    copy: [];
  }>();

  const contentRef = ref<HTMLElement>();

  defineExpose({
    contentRef,
  });

  const copyResult = async () => {
    try {
      if (contentRef.value) {
        const text = contentRef.value.innerText || contentRef.value.textContent;
        await navigator.clipboard.writeText(text);
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
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    overflow: hidden;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    border-bottom: 1px solid #e4e7ed;
  }

  .result-title {
    font-size: 14px;
    font-weight: 600;
    color: #495057;
  }

  .copy-button {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: #6c757d;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .copy-button:hover {
    background: #e9ecef;
    color: #495057;
  }

  .copy-button .icon {
    width: 16px;
    height: 16px;
  }

  .result-content {
    padding: 16px;
    background: white;
  }
</style>
