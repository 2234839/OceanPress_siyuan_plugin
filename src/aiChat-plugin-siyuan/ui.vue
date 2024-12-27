<template>
  <div
    class="protyle-custom"
    :class="oceanpress_ui_flag"
    contenteditable="false"
    style="border: solid 1px red"
    ref="uiDiv">
    思源ai测试版：
    <template v-if="config.run">正在执行中...</template>
    <template v-else>
      <div class="editable-wrapper" @mousedown.stop>
        <textarea v-model="config.searchText"></textarea>
      </div>
      <button @click.stop="run">提交</button>
    </template>
    <div v-html="config.html"></div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, useTemplateRef } from "vue";
  import { 执行ai问答 } from "~/aiChat-plugin-siyuan/openai";
  import { oceanpress_ui_flag } from "~/oceanpress-siyuan-plugin/const";
  const ui = useTemplateRef("uiDiv");
  onMounted(() => {
    if (ui) {
      const stopPropagation = (e: Event) => {
        e.stopImmediatePropagation();
      };
      const oncapture = undefined;
      [
        "compositionstart", //如果不加这两个会无法正常输入中文
        "compositionend",
        "mousedown",
        "mouseup",
        "keydown",
        "keyup",
        "input",
        "copy",
        "cut",
        "paste",
      ].forEach((event) => {
        ui.value?.addEventListener(event, stopPropagation, oncapture);
      });
      console.log("ui", ui.value);
    }
  });
  const config = reactive({
    html: ``,
    searchText: ` `,
    run: false,
  });

  async function run() {
    try {
      config.run = true;
      const res = await 执行ai问答(config.searchText);
      config.html = Md2BlockDOM(res.res);
    } finally {
      config.run = false;
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
    position: relative;
    user-select: none;
  }

  .editable-wrapper {
    display: inline-block;
    user-select: text;
  }

  .editable-wrapper div[contenteditable] {
    background: white;
    border: 1px solid #ccc;
    padding: 5px;
    font-size: 16px;
    line-height: 1.5;
    min-height: 20px;
    min-width: 200px;
    user-select: text;
  }

  button {
    margin-left: 10px;
    padding: 5px 10px;
    font-size: 16px;
    user-select: none;
  }
</style>
