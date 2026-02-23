<template>
  <div class="content">
    <div class="setting-section">
      <h3 class="section-title">图片压缩设置</h3>
      
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

      <div class="setting-item">
        <label class="switch-label">
          <input 
            type="checkbox" 
            :checked="image_skip_webp" 
            @change="handleSkipWebpChange"
            class="switch"
          />
          <span class="slider"></span>
        </label>
        <span class="setting-text">跳过 WebP 图片</span>
      </div>
      <div class="setting-description">
        启用后，已经为 WebP 格式的图片将不会被再次压缩
      </div>

      <div class="setting-item">
        <label class="switch-label">
          <input 
            type="checkbox" 
            :checked="image_skip_small" 
            @change="handleSkipSmallChange"
            class="switch"
          />
          <span class="slider"></span>
        </label>
        <span class="setting-text">跳过小文件</span>
      </div>
      <div class="setting-description">
        启用后，小于指定大小的图片将不会被压缩
      </div>

      <div class="setting-item">
        <label class="number-label">
          <span class="label-text">压缩质量：</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            :value="image_compression_quality"
            @input="handleQualityChange"
            :disabled="enable_smart_compression"
            class="range-slider"
          />
          <input
            type="number"
            min="0.1"
            max="1"
            step="0.1"
            :value="image_compression_quality"
            @input="handleQualityChange"
            :disabled="enable_smart_compression"
            class="number-input quality-input"
          />
        </label>
      </div>
      <div class="setting-description">
        图片压缩质量，值越高图片质量越好但文件越大
        <span v-if="enable_smart_compression" style="color: #f57c00; margin-left: 8px;">（智能压缩模式下此设置无效）</span>
      </div>

      <div class="setting-item">
        <label class="number-label">
          <span class="label-text">最小文件大小：</span>
          <input 
            type="number" 
            min="0" 
            step="1" 
            :value="Math.round((image_min_size || 0) / 1024)" 
            @input="handleMinSizeChange"
            class="number-input"
          />
          <span class="unit">KB</span>
        </label>
      </div>
      <div class="setting-description">
        小于此大小的图片将不会被压缩
      </div>

      <div class="setting-item">
        <label class="switch-label">
          <input
            type="checkbox"
            :checked="enable_smart_compression"
            @change="handleEnableSmartCompressionChange"
            class="switch"
          />
          <span class="slider"></span>
        </label>
        <span class="setting-text">启用智能压缩</span>
      </div>
      <div class="setting-description">
        启用后，使用 MS-SSIM 相似度评估自动寻找最优压缩质量（需要更多时间）
      </div>

      <div class="setting-item" v-if="enable_smart_compression">
        <label class="number-label">
          <span class="label-text">目标相似度：</span>
          <input
            type="range"
            min="50"
            max="100"
            step="0.5"
            :value="target_similarity"
            @input="handleTargetSimilarityChange"
            class="range-slider"
          />
          <input
            type="number"
            min="50"
            max="100"
            step="0.5"
            :value="target_similarity"
            @input="handleTargetSimilarityChange"
            class="number-input quality-input"
          />
          <span class="unit">%</span>
        </label>
      </div>
      <div class="setting-description" v-if="enable_smart_compression">
        目标相似度百分比，值越高图片质量越好但文件越大（推荐 99%）
      </div>
    </div>

    <div class="setting-section">
      <h3 class="section-title">标签排序设置</h3>
      
      <div class="setting-item">
        <label class="switch-label">
          <input 
            type="checkbox" 
            :checked="tag_sort_reverse" 
            @change="handleTagSortReverseChange"
            class="switch"
          />
          <span class="slider"></span>
        </label>
        <span class="setting-text">反向排序</span>
      </div>
      <div class="setting-description">
        启用后，标签搜索结果将按使用频率反向排序
      </div>
    </div>

    <div class="button-group">
      <button class="button primary" @click="onExit">确定</button>
      <button class="button" @click="onCancel">取消</button>
    </div>
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
const autoCompress = computed(() => data.value.autoCompress ?? false);
const image_skip_webp = computed(() => data.value.image_skip_webp ?? true);
const image_skip_small = computed(() => data.value.image_skip_small ?? true);
const image_compression_quality = computed(() => data.value.image_compression_quality ?? 0.8);
const image_min_size = computed(() => data.value.image_min_size ?? 102400);
const enable_smart_compression = computed(() => data.value.enable_smart_compression ?? false);
const target_similarity = computed(() => data.value.target_similarity ?? 99);
const tag_sort_reverse = computed(() => data.value.tag_sort_reverse ?? false);

const onExit = () => {
  props.save();
  props.dialog.destroy();
};

const onCancel = () => {
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

const handleSkipWebpChange = (e: Event) => {
  setData((prev) => ({
    ...prev,
    image_skip_webp: (e.target as HTMLInputElement).checked,
  }));
};

const handleSkipSmallChange = (e: Event) => {
  setData((prev) => ({
    ...prev,
    image_skip_small: (e.target as HTMLInputElement).checked,
  }));
};

const handleQualityChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  if (!isNaN(value) && value >= 0.1 && value <= 1.0) {
    setData((prev) => ({
      ...prev,
      image_compression_quality: value,
    }));
  }
};

const handleMinSizeChange = (e: Event) => {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (!isNaN(value) && value >= 0) {
    setData((prev) => ({
      ...prev,
      image_min_size: value * 1024,
    }));
  }
};

const handleTagSortReverseChange = (e: Event) => {
  setData((prev) => ({
    ...prev,
    tag_sort_reverse: (e.target as HTMLInputElement).checked,
  }));
};

const handleEnableSmartCompressionChange = (e: Event) => {
  setData((prev) => ({
    ...prev,
    enable_smart_compression: (e.target as HTMLInputElement).checked,
  }));
};

const handleTargetSimilarityChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  if (!isNaN(value) && value >= 50 && value <= 100) {
    setData((prev) => ({
      ...prev,
      target_similarity: value,
    }));
  }
};
</script>

<style scoped>
.content {
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  min-width: 500px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.setting-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.setting-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  width: 100%;
}

.setting-text {
  font-size: 14px;
  color: #333;
  user-select: none;
  flex: 1;
}

.setting-description {
  font-size: 12px;
  color: #666;
  text-align: left;
  margin-bottom: 15px;
  line-height: 1.4;
  margin-left: 65px;
}

.number-label {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.label-text {
  font-size: 14px;
  color: #333;
  min-width: 100px;
}

.range-slider {
  flex: 1;
  height: 6px;
  background: #ddd;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #2196F3;
  border-radius: 50%;
  cursor: pointer;
}

.range-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #2196F3;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.value-display {
  min-width: 40px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.number-input {
  width: 80px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.number-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.quality-input {
  width: 70px;
  margin-left: 10px;
}

.range-slider:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.unit {
  font-size: 14px;
  color: #666;
  margin-left: 5px;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.button {
  padding: 10px 20px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 14px;
}

.button:hover {
  background-color: #f5f5f5;
}

.button.primary {
  background-color: #2196F3;
  color: white;
  border-color: #2196F3;
}

.button.primary:hover {
  background-color: #1976D2;
}

/* 自定义滚动条样式 */
.content::-webkit-scrollbar {
  width: 8px;
}

.content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
  transition: background 0.3s;
}

.content::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

.content::-webkit-scrollbar-corner {
  background: #f1f1f1;
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

<style>
/* 移除包含 toolkit 设置 UI 组件元素的对话框 padding */
.b3-dialog__content:has(> .oceanpress_ui_falg) {
  padding: 0 !important;
}
</style>