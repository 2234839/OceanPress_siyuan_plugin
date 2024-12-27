<template>
  <div class="protyle-custom" :class="oceanpress_ui_flag" contenteditable="false" ref="uiDiv">
    <div class="input-row">
      <h2 class="title">思源AI助手(测试版)</h2>
      <div class="editable-wrapper" @mousedown.stop>
        <textarea v-model="config.searchText" placeholder="请输入您的问题..."></textarea>
      </div>
      <button @click.stop="run" class="submit-button" :disabled="config.run">
        {{ config.run ? "执行中..." : "提交问题" }}
      </button>
    </div>
    <div v-if="config.html" ref="resultDiv" class="result" v-html="config.html"></div>
  </div>
</template>

<script setup lang="ts">
  import { onMount } from "solid-js";
  import { reactive, useTemplateRef, watchEffect } from "vue";
  import { 执行ai问答 } from "~/aiChat-plugin-siyuan/openai";
  import { getBlockAttrs, setBlockAttrs } from "~/libs/api";
  import { oceanpress_ui_flag } from "~/oceanpress-siyuan-plugin/const";

  const uiDiv = useTemplateRef<HTMLElement | null>("uiDiv");

  const props = defineProps({
    blockId: {
      type: String,
      required: true,
    },
  });
  async function saveConfig() {
    return await setBlockAttrs(props.blockId, { "custom-ai-config": JSON.stringify(config) });
  }
  async function loadConfig() {
    const res = await getBlockAttrs(props.blockId);
    console.log("res", res);
    Object.assign(config, JSON.parse(res["custom-ai-config"] ?? "{}"));
  }
  onMount(() => {
    loadConfig();
  });
  const config = reactive({
    html: ``,
    searchText: ``,
    run: false,
  });
  const resultDiv = useTemplateRef<HTMLElement | null>("resultDiv");
  /** 禁止编辑这些元素 */
  watchEffect(() => {
    config.html;
    resultDiv.value?.querySelectorAll("[contenteditable]").forEach((el) => {
      el.setAttribute("contenteditable", "false");
    });
  });
  async function run() {
    try {
      config.run = true;
      const res = await 执行ai问答(config.searchText);
      config.html = Md2BlockDOM(res.res);
    } finally {
      config.run = false;
      await saveConfig();
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
    color: #333;
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
    background-color: #f9f9f9;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }
</style>
