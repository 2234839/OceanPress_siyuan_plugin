<template>
  <div class="content">
    <div class="setting-item">
      <label class="switch-label">
        <input 
          type="checkbox" 
          :checked="autoCompress" 
          @change="handleAutoCompressChange"
          class="switch"
        />
        <span class="slider"></span>
      </label>
      <span class="setting-text">插入图片时自动压缩为 WebP</span>
    </div>
    <div class="setting-description">
      启用后，插入图片时会自动压缩为 WebP 格式，减少存储空间
    </div>
    <button class="button" @click="onExit">确定</button>
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
const autoCompress = computed(() => data.value.autoCompress);

const onExit = () => {
  props.save();
  props.dialog.destroy();
};

const setData = (updater: (prev: any) => any) => {
  data.value = updater(data.value);
};

const handleAutoCompressChange = (e: Event) => {
  setData((prev) => ({
    ...prev,
    autoCompress: (e.target as HTMLInputElement).checked,
  }));
};
</script>

<style scoped>
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

.setting-item {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  width: 100%;
  justify-content: center;
}

.setting-text {
  font-size: 14px;
  color: #333;
  user-select: none;
}

.setting-description {
  font-size: 12px;
  color: #666;
  text-align: center;
  margin-bottom: 20px;
  line-height: 1.4;
}

.button {
  padding: 10px 20px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.button:hover {
  background-color: #f5f5f5;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-label {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.switch:checked + .slider {
  background-color: #2196F3;
}

.switch:checked + .slider:before {
  transform: translateX(26px);
}
</style>