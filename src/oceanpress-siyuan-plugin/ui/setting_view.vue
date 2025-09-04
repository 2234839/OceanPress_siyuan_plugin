<template>
  <div class="content">
    Umi-OCR HTTP API：
    <input
      type="text"
      class="input"
      placeholder="Enter Umi-OCR API URL..."
      :value="umiApi"
      @input="handleUmiApiChange" />
    <button class="button" @click="onExit">ok</button>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';

  const props = defineProps({
    dialog: {
      type: Object,
      required: true,
    },
    dataSignal: {
      type: Object,
      required: true,
    },
    save: {
      type: Function,
      required: true,
    },
  });

  const data = ref(props.dataSignal);
  const umiApi = computed(() => data.value.umiApi);

  const onExit = () => {
    props.save();
    props.dialog.destroy();
  };

  const setData = (updater: (prev: any) => any) => {
    data.value = updater(data.value);
  };

  const handleUmiApiChange = (e: Event) => {
    setData((prev) => ({
      ...prev,
      umiApi: (e.target as HTMLInputElement).value,
    }));
  };
</script>

<style scoped>
  /* 内容容器样式 */
  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background-color: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    min-width: 400px;
  }

  /* 输入框样式 */
  .input {
    width: 100%;
    max-width: 300px;
    padding: 10px;
    margin-top: 15px;
    margin-bottom: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  /* 按钮样式 */
  .button {
    padding: 10px 20px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
</style>
