<template>
  <div class="container">
    <!-- 返回按钮 -->
    <router-link to="/" class="back-link">
      ← 返回首页
    </router-link>

    <!-- 上传区域 -->
    <div v-if="!originalImage" class="upload-section" @drop="handleDrop" @dragover.prevent @dragenter.prevent>
      <input ref="fileInput" type="file" accept="image/*" @change="handleFileSelect" hidden />
      <div class="upload-area" @click="fileInput?.click()">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p>拖拽图片到此处或点击上传</p>
        <span class="hint">支持 JPG, PNG, WebP 等格式</span>
      </div>
    </div>

    <!-- 更换图片按钮 -->
    <div v-else class="change-image-section">
      <input ref="fileInput" type="file" accept="image/*" @change="handleFileSelect" hidden />
      <button class="change-image-btn" @click="fileInput?.click()">
        🔄 更换图片
      </button>
    </div>

    <!-- 控制面板 -->
    <div v-if="originalImage" class="controls-section">
      <h2>⚙️ 压缩设置</h2>

      <div class="control-group">
        <label>压缩算法</label>
        <div class="algorithm-buttons">
          <button
            v-for="algo in algorithms"
            :key="algo.id"
            :class="['algo-btn', { active: selectedAlgorithm === algo.id }]"
            @click="selectedAlgorithm = algo.id"
          >
            <span class="algo-name">{{ algo.name }}</span>
            <span class="algo-desc">{{ algo.desc }}</span>
          </button>
        </div>
      </div>

      <div class="control-group">
        <label>
          压缩质量: {{ quality.toFixed(2) }}
          <span class="quality-hint">({{ qualityHint }})</span>
        </label>
        <input v-model.number="quality" type="range" min="0.1" max="1" step="0.01" class="slider" />
      </div>

      <div class="control-group">
        <label>输出格式</label>
        <select v-model="outputFormat" class="select">
          <option value="original">保持原格式</option>
          <option value="image/webp">WebP</option>
          <option value="image/avif">AVIF</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
        </select>
      </div>

      <!-- 压缩按钮组 -->
      <div class="compress-buttons-group">
        <button class="compress-btn" @click="compressImage" :disabled="compressing || optimalCompressing">
          {{ compressing ? '压缩中...' : '🚀 开始压缩' }}
        </button>

        <button
          class="optimal-compress-btn"
          @click="startOptimalCompression"
          :disabled="optimalCompressing || compressing"
        >
          <span class="btn-content">
            <span class="btn-text">
              {{ optimalCompressing ? `优化中 (${optimalCompressionRound}/${maxOptimalRounds})` : '二分逼近相似度压缩' }}
            </span>
            <span class="btn-input-wrapper">
              <span class="input-label">目标:</span>
              <input
                v-model.number="targetSimilarity"
                type="number"
                min="80"
                max="100"
                step="0.1"
                class="btn-input"
                :disabled="optimalCompressing"
                @click.stop
              />
              <span class="unit">%</span>
            </span>
          </span>
        </button>
      </div>

      <!-- 优化进度提示 -->
      <div v-if="optimalCompressing && optimalCompressionLog" class="optimization-log">
        {{ optimalCompressionLog }}
      </div>
    </div>

    <!-- 结果展示 -->
    <div v-if="result" class="results-section">
      <h2>📊 压缩结果</h2>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">原始大小</div>
          <div class="stat-value">{{ formatSize(originalImage?.size || 0) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">压缩后大小</div>
          <div class="stat-value">{{ formatSize(result.size) }}</div>
        </div>
        <div class="stat-card" :class="result.compressionRatio > 0 ? 'success' : 'warning'">
          <div class="stat-label">压缩比</div>
          <div class="stat-value">{{ result.compressionRatio.toFixed(1) }}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            压缩时间 ({{ totalRounds }}轮)
          </div>
          <div class="stat-value">{{ totalTime }}ms</div>
        </div>
      </div>

      <!-- 图片对比 -->
      <div class="comparison-section">
        <ImageCompare :before="originalPreview" :after="result.preview" />
      </div>

      <!-- 下载按钮 -->
      <button class="download-btn" @click="downloadResult">
        💾 下载压缩后的图片
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      ⚠️ {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue';
import ImageCompare from '@/playground/components/ImageCompare.vue';
import type { CompressionResult, AlgorithmId } from '@/playground/utils/compression';
import { compressImage as compressImageUtil, findOptimalCompression } from '@/playground/utils/compression';

/** 文件输入引用 */
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

interface Algorithm {
  id: AlgorithmId;
  name: string;
  desc: string;
}

/** 原始图片文件 */
const originalImage = ref<File | null>(null);
/** 原图预览 URL */
const originalPreview = ref<string>('');
/** 压缩结果 */
const result = ref<CompressionResult | null>(null);
/** 当前选择的算法 */
const selectedAlgorithm = ref<AlgorithmId>('browser-compression');
/** 压缩质量 */
const quality = ref(0.8);
/** 输出格式 */
const outputFormat = ref<string>('original');
/** 压缩中状态 */
const compressing = ref(false);
/** 错误信息 */
const error = ref<string>('');
/** 目标相似度 (百分比) */
const targetSimilarity = ref(99);
/** 最优压缩中状态 */
const optimalCompressing = ref(false);
/** 最优压缩当前轮数 */
const optimalCompressionRound = ref(0);
/** 最大优化轮数 */
const maxOptimalRounds = 10;
/** 优化过程日志 */
const optimalCompressionLog = ref('');

/** 可用的压缩算法列表 */
const algorithms: Algorithm[] = [
  { id: 'browser-compression', name: 'Browser Compression', desc: '当前插件使用' },
  { id: 'jsquash-webp', name: 'jSquash WebP', desc: 'WebAssembly WebP' },
  { id: 'jsquash-avif', name: 'jSquash AVIF', desc: '下一代格式' },
  { id: 'jsquash-jpeg', name: 'jSquash JPEG', desc: 'MozJPEG 编码器' },
];

/** 质量提示文字 */
const qualityHint = computed(() => {
  if (quality.value >= 0.9) return '最高质量';
  if (quality.value >= 0.7) return '高质量';
  if (quality.value >= 0.5) return '中等质量';
  if (quality.value >= 0.3) return '低质量';
  return '最低质量';
});

/** 计算压缩总时间(ms) */
const totalTime = computed(() => {
  if (!result.value) return 0;
  return result.value.roundTimes.reduce((sum: number, time: number) => sum + time, 0);
});

/** 计算压缩轮数 */
const totalRounds = computed(() => {
  if (!result.value) return 0;
  return result.value.roundTimes.length;
});

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 处理文件选择
 */
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files?.[0]) {
    loadImage(target.files[0]);
  }
}

/**
 * 处理拖拽上传
 */
function handleDrop(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer?.files?.[0]) {
    loadImage(event.dataTransfer.files[0]);
  }
}

/**
 * 加载图片
 */
async function loadImage(file: File) {
  if (!file.type.startsWith('image/')) {
    error.value = '请选择有效的图片文件';
    return;
  }

  originalImage.value = file;
  result.value = null;
  error.value = '';

  // 生成预览
  originalPreview.value = URL.createObjectURL(file);
}

/**
 * 压缩图片
 */
async function compressImage() {
  if (!originalImage.value) return;

  compressing.value = true;
  error.value = '';

  try {
    const startTime = performance.now();

    // 确定输出 MIME 类型
    const outputMimeType =
      outputFormat.value === 'original' ? originalImage.value.type : outputFormat.value;

    const compressedBlob = await compressImageUtil(
      originalImage.value,
      selectedAlgorithm.value,
      {
        quality: quality.value,
        mimeType: outputMimeType,
      }
    );

    const endTime = performance.now();
    const compressionTime = Math.round(endTime - startTime);

    // 计算压缩比
    const compressionRatio = ((originalImage.value.size - compressedBlob.size) / originalImage.value.size) * 100;

    result.value = {
      blob: compressedBlob,
      size: compressedBlob.size,
      preview: URL.createObjectURL(compressedBlob),
      compressionRatio,
      roundTimes: [compressionTime],
    };
  } catch (err) {
    error.value = err instanceof Error ? err.message : '压缩失败';
    console.error('压缩错误:', err);
  } finally {
    compressing.value = false;
  }
}

/**
 * 下载压缩结果
 */
function downloadResult() {
  if (!result.value) return;

  const link = document.createElement('a');
  link.href = result.value.preview;
  link.download = `compressed-${Date.now()}.${result.value.blob.type.split('/')[1]}`;
  link.click();
}

/**
 * 使用二分法进行最优压缩
 */
async function startOptimalCompression() {
  if (!originalImage.value) return;

  optimalCompressing.value = true;
  optimalCompressionRound.value = 0;
  error.value = '';
  result.value = null;

  try {
    const outputMimeType =
      outputFormat.value === 'original' ? originalImage.value.type : outputFormat.value;

    const optimalResult = await findOptimalCompression(
      originalImage.value,
      selectedAlgorithm.value,
      outputMimeType,
      originalPreview.value,
      targetSimilarity.value,
      maxOptimalRounds,
      (progress) => {
        optimalCompressionLog.value = progress.log;
        optimalCompressionRound.value = progress.round;
      }
    );

    // 计算压缩比
    const compressionRatio =
      ((originalImage.value.size - optimalResult.blob.size) / originalImage.value.size) * 100;

    result.value = {
      blob: optimalResult.blob,
      size: optimalResult.blob.size,
      preview: URL.createObjectURL(optimalResult.blob),
      compressionRatio,
      roundTimes: optimalResult.roundTimes,
    };

    optimalCompressionLog.value = `✓ 最优质量: ${optimalResult.quality.toFixed(
      3
    )} → 相似度 ${optimalResult.similarity.toFixed(2)}% → 文件大小 ${formatSize(optimalResult.blob.size)}`;

    // 更新质量滑块为找到的最优质量
    quality.value = optimalResult.quality;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '最优压缩失败';
    console.error('最优压缩错误:', err);
  } finally {
    optimalCompressing.value = false;
  }
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.back-link {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.back-link:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.upload-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area:hover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.upload-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 10px;
  color: #667eea;
}

.upload-area p {
  font-size: 1rem;
  color: #333;
  margin-bottom: 6px;
}

.hint {
  color: #999;
  font-size: 0.85rem;
}

.change-image-section {
  margin-bottom: 16px;
}

.change-image-btn {
  width: 100%;
  padding: 8px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.change-image-btn:hover {
  border-color: #667eea;
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.controls-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.controls-section h2 {
  margin-bottom: 16px;
  font-size: 1.1rem;
  color: #333;
}

.control-group {
  margin-bottom: 16px;
}

.control-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #555;
}

.quality-hint {
  color: #999;
  font-weight: 400;
  font-size: 0.8rem;
}

.algorithm-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.algo-btn {
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.algo-btn:hover {
  border-color: #667eea;
  transform: translateY(-1px);
}

.algo-btn.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.algo-name {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 3px;
  font-size: 0.9rem;
}

.algo-desc {
  display: block;
  font-size: 0.75rem;
  color: #666;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.select {
  width: 100%;
  padding: 8px 10px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
}

/* 压缩按钮组 */
.compress-buttons-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.compress-btn {
  flex: 1;
  min-width: 140px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.compress-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.compress-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 二分逼近压缩按钮 */
.optimal-compress-btn {
  flex: 1;
  min-width: 280px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.optimal-compress-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(56, 239, 125, 0.3);
}

.optimal-compress-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-text {
  white-space: nowrap;
}

.btn-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.input-label {
  font-size: 0.8rem;
  opacity: 0.9;
  white-space: nowrap;
}

.btn-input {
  width: 70px;
  padding: 4px 24px 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s;
  /* 移除数字输入框的上下箭头 */
  appearance: textfield;
  -moz-appearance: textfield;
}

/* 移除 Webkit 浏览器的数字输入框箭头 */
.btn-input::-webkit-outer-spin-button,
.btn-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.btn-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
}

.btn-input:disabled {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
}

.btn-input-wrapper .unit {
  position: absolute;
  right: 6px;
  font-size: 0.75rem;
  opacity: 0.8;
  pointer-events: none;
}

/* 下载按钮 */
.download-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.download-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.optimization-log {
  margin-top: 10px;
  padding: 10px 12px;
  background: #e7f3ff;
  border-left: 4px solid #2196f3;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #1976d2;
  font-family: monospace;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.results-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.results-section h2 {
  margin-bottom: 12px;
  font-size: 1.1rem;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.stat-card {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
}

.stat-card.success {
  background: #d4edda;
  color: #155724;
}

.stat-card.warning {
  background: #fff3cd;
  color: #856404;
}

.stat-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #333;
}

.comparison-section {
  margin-bottom: 12px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .algorithm-buttons {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .controls-section,
  .results-section,
  .upload-section {
    background: #2d2d2d;
  }

  .controls-section h2,
  .results-section h2,
  .algo-name {
    color: #e0e0e0;
  }

  .control-group label {
    color: #bbb;
  }

  .upload-area p {
    color: #e0e0e0;
  }

  .change-image-btn {
    background: #2d2d2d;
    border-color: #444;
    color: #ccc;
  }

  .change-image-btn:hover {
    border-color: #667eea;
    color: #667eea;
    background: rgba(102, 126, 234, 0.1);
  }

  .stat-card {
    background: #3d3d3d;
  }

  .stat-value {
    color: #e0e0e0;
  }

  .select {
    background: #3d3d3d;
    color: #e0e0e0;
    border-color: #555;
  }

  .algo-btn {
    background: #3d3d3d;
    border-color: #555;
  }

  .algo-name {
    color: #e0e0e0;
  }

  .btn-input {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .btn-input:focus {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .btn-input:disabled {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .optimization-log {
    background: #1a237e;
    border-left-color: #64b5f6;
    color: #90caf9;
  }
}
</style>
