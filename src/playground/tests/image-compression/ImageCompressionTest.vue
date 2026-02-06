<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <!-- 返回按钮 -->
    <router-link
      to="/"
      class="inline-block px-3 py-1.5 mb-4 text-sm text-white bg-white/20 rounded-md hover:bg-white/30 transition-all hover:-translate-y-px no-underline dark:text-white dark:bg-white/10 dark:hover:bg-white/20">
      ← 返回首页
    </router-link>

    <!-- 上传区域 -->
    <div
      v-if="!originalImage"
      class="p-5 mb-4 bg-white rounded-xl shadow-sm dark:bg-gray-800"
      @drop="handleDrop"
      @dragover.prevent
      @dragenter.prevent>
      <input ref="fileInput" type="file" accept="image/*" @change="handleFileSelect" hidden />
      <div
        class="p-8 text-center border-2 border-dashed rounded-lg cursor-pointer border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/5 transition-all dark:border-gray-600 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10"
        @click="fileInput?.click()">
        <svg
          class="w-10 h-10 mx-auto mb-2.5 text-indigo-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p class="text-base text-gray-900 dark:text-gray-100">拖拽图片到此处或点击上传</p>
        <span class="text-sm text-gray-500 dark:text-gray-400">支持 JPG, PNG, WebP 等格式</span>
      </div>
    </div>

    <!-- 更换图片按钮 -->
    <div v-else class="mb-4">
      <input ref="fileInput" type="file" accept="image/*" @change="handleFileSelect" hidden />
      <button
        class="w-full px-2 py-2 text-sm font-medium text-gray-600 bg-white border-2 border-gray-200 rounded-md hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50/5 transition-all cursor-pointer dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:border-indigo-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10"
        @click="fileInput?.click()">
        🔄 更换图片
      </button>
    </div>

    <!-- 控制面板 -->
    <div v-if="originalImage" class="p-5 mb-4 bg-white rounded-xl shadow-sm dark:bg-gray-800">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">⚙️ 压缩设置</h2>

      <div class="mb-4">
        <label class="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
          >压缩算法</label
        >
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          <button
            v-for="algo in algorithms"
            :key="algo.id"
            :class="[
              'px-2.5 py-2.5 text-left border-2 rounded-lg bg-white cursor-pointer transition-all hover:-translate-y-px',
              selectedAlgorithm === algo.id ?
                'border-indigo-500 bg-indigo-50/10'
              : 'border-gray-200 hover:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:hover:border-indigo-400',
            ]"
            @click="selectedAlgorithm = algo.id">
            <span
              class="block text-sm font-semibold text-gray-900 dark:text-gray-100"
              :class="{ 'text-gray-100': selectedAlgorithm === algo.id }"
              >{{ algo.name }}</span
            >
            <span class="block text-xs text-gray-600 dark:text-gray-400">{{ algo.desc }}</span>
          </button>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 mb-4">
        <!-- 自动二分逼近选项 -->
        <div
          class="p-3 bg-gray-50 rounded-lg border-2 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="enableAutoBinary"
                type="checkbox"
                class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 shrink-0" />
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  启用自动二分逼近
                </span>
                <MetricHint hint="自动寻找最佳质量以匹配目标相似度" />
              </div>
            </label>

            <div v-if="enableAutoBinary" class="flex items-center gap-2 animate-fade-in shrink-0">
              <span class="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap"
                >目标相似度:</span
              >
              <div class="flex items-center gap-1 relative">
                <input
                  v-model.number="targetSimilarity"
                  type="number"
                  min="80"
                  max="100"
                  step="0.1"
                  class="w-25 px-2 py-1 pr-8 text-sm font-semibold text-center text-gray-900 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                <span class="absolute right-2 text-xs text-gray-500 pointer-events-none">%</span>
              </div>
            </div>
          </div>
        </div>
        <!-- 压缩质量滑块 -->
        <div class="flex-1 min-w-0">
          <label
            class="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
            压缩质量: {{ quality.toFixed(2) }}
            <span class="text-xs font-normal text-gray-500 dark:text-gray-400"
              >({{ qualityHint }})</span
            >
          </label>
          <input
            v-model.number="quality"
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            :disabled="enableAutoBinary"
            class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:h-4.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:cursor-pointer disabled:[&::-webkit-slider-thumb]:bg-gray-400" />
        </div>
      </div>

      <div class="mb-4">
        <label class="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
          >输出格式</label
        >
        <div class="flex items-center gap-2">
          <select
            v-model="outputFormat"
            class="flex-1 px-2.5 py-2 text-sm border-2 border-gray-200 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <option
              v-for="format in availableOutputFormats"
              :key="format.value"
              :value="format.value">
              {{ format.label }}
            </option>
          </select>
          <MetricHint
            v-if="selectedAlgorithm !== 'browser-compression'"
            hint="当前算法仅支持特定输出格式" />
        </div>
      </div>

      <!-- 压缩按钮 -->
      <button
        class="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg cursor-pointer transition-all hover:-translate-y-px hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        @click="handleCompress"
        :disabled="compressing || optimalCompressing">
        {{ getCompressingText() }}
      </button>

      <!-- 优化进度提示 -->
      <div
        v-if="optimalCompressing && optimalCompressionLog"
        class="mt-2.5 px-3 py-2.5 text-xs font-mono text-blue-700 bg-blue-50 border-l-4 border-blue-600 rounded animate-fade-in dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400">
        {{ optimalCompressionLog }}
      </div>
    </div>

    <!-- 结果展示 -->
    <div v-if="result" class="p-4 mb-4 bg-white rounded-xl shadow-sm dark:bg-gray-800">
      <h2 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">📊 压缩结果</h2>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5 mb-4 sm:grid-cols-2">
        <div class="p-3 text-center bg-gray-50 rounded-lg dark:bg-gray-700">
          <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">原始大小</div>
          <div class="text-lg font-bold text-gray-900 dark:text-gray-100">
            {{ formatSize(originalImage?.size || 0) }}
          </div>
        </div>
        <div class="p-3 text-center bg-gray-50 rounded-lg dark:bg-gray-700">
          <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">压缩后大小</div>
          <div class="text-lg font-bold text-gray-900 dark:text-gray-100">
            {{ formatSize(result.size) }}
          </div>
        </div>
        <div
          class="p-3 text-center rounded-lg"
          :class="
            result.compressionRatio > 0 ?
              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
          ">
          <div class="mb-1 text-xs">压缩比</div>
          <div class="text-lg font-bold">{{ result.compressionRatio.toFixed(1) }}%</div>
        </div>
        <div class="p-3 text-center bg-gray-50 rounded-lg dark:bg-gray-700">
          <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">
            压缩时间 ({{ totalRounds }}轮)
          </div>
          <div class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ totalTime }}ms</div>
        </div>
      </div>

      <!-- 图片对比 -->
      <div class="mb-3">
        <ImageCompare :before="originalPreview" :after="result.preview" />
      </div>

      <!-- 下载按钮 -->
      <button
        class="w-full px-2.5 py-2.5 text-sm font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg cursor-pointer transition-all hover:-translate-y-px hover:shadow-lg"
        @click="downloadResult">
        💾 下载压缩后的图片
      </button>
    </div>

    <!-- 错误提示 -->
    <div
      v-if="error"
      class="px-2.5 py-2.5 mb-4 text-sm text-red-900 bg-red-100 rounded-md dark:bg-red-900/30 dark:text-red-300">
      ⚠️ {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, useTemplateRef, watch, onUnmounted } from 'vue';
  import ImageCompare from '@/playground/components/ImageCompare.vue';
  import MetricHint from '@/playground/components/MetricHint.vue';
  import type { CompressionResult, AlgorithmId } from '@/playground/utils/compression';
  import {
    compressImage as compressImageUtil,
    findOptimalCompression,
  } from '@/playground/utils/compression';

  /** 文件输入引用 */
  const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

  interface Algorithm {
    id: AlgorithmId;
    name: string;
    desc: string;
  }

  interface OutputFormat {
    value: string;
    label: string;
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
  /** 是否启用自动二分逼近 */
  const enableAutoBinary = ref(false);
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

  /** 所有可用的输出格式 */
  const allOutputFormats: OutputFormat[] = [
    { value: 'original', label: '保持原格式' },
    { value: 'image/webp', label: 'WebP' },
    { value: 'image/avif', label: 'AVIF' },
    { value: 'image/jpeg', label: 'JPEG' },
    { value: 'image/png', label: 'PNG' },
  ];

  /** 根据当前算法获取可用的输出格式 */
  const availableOutputFormats = computed(() => {
    switch (selectedAlgorithm.value) {
      case 'jsquash-webp':
        return [{ value: 'image/webp', label: 'WebP' }];
      case 'jsquash-avif':
        return [{ value: 'image/avif', label: 'AVIF' }];
      case 'jsquash-jpeg':
        return [{ value: 'image/jpeg', label: 'JPEG' }];
      case 'browser-compression':
      default:
        return allOutputFormats;
    }
  });

  /** 监听算法变化，自动调整输出格式 */
  const { stop } = watch(selectedAlgorithm, () => {
    // 检查当前输出格式是否可用
    const isCurrentFormatAvailable = availableOutputFormats.value.some(
      (format) => format.value === outputFormat.value,
    );

    // 如果当前格式不可用，切换到第一个可用格式
    if (!isCurrentFormatAvailable && availableOutputFormats.value.length > 0) {
      outputFormat.value = availableOutputFormats.value[0].value;
    }
  });

  /** 组件卸载时停止监听 */
  onUnmounted(() => {
    stop();
  });

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

      const compressedBlob = await compressImageUtil(originalImage.value, selectedAlgorithm.value, {
        quality: quality.value,
        mimeType: outputMimeType,
      });

      const endTime = performance.now();
      const compressionTime = Math.round(endTime - startTime);

      // 计算压缩比
      const compressionRatio =
        ((originalImage.value.size - compressedBlob.size) / originalImage.value.size) * 100;

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
   * 获取压缩按钮文本
   */
  function getCompressingText(): string {
    if (optimalCompressing.value) {
      return `优化中 (${optimalCompressionRound.value}/${maxOptimalRounds})...`;
    }
    if (compressing.value) {
      return '压缩中...';
    }
    return enableAutoBinary.value ? '🎯 开始自动二分逼近压缩' : '🚀 开始压缩';
  }

  /**
   * 处理压缩按钮点击
   */
  async function handleCompress() {
    if (enableAutoBinary.value) {
      await startOptimalCompression();
    } else {
      await compressImage();
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
        },
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
        3,
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
  /* 自定义动画 */
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

  .animate-fade-in {
    animation: fadeIn 0.3s ease;
  }
</style>
