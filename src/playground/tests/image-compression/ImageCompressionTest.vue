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
        <RadioGroupRoot
          v-model="selectedAlgorithm"
          class="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          <div v-for="algo in algorithms" :key="algo.id" class="relative h-full">
            <RadioGroupItem
              :value="algo.id"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0" />
            <div
              :class="[
                'relative z-10 h-full px-2.5 py-2.5 text-left border-2 rounded-lg bg-white transition-all hover:-translate-y-px',
                selectedAlgorithm === algo.id ?
                  'border-indigo-500 bg-indigo-50/10'
                : 'border-gray-200 hover:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:hover:border-indigo-400',
              ]">
              <div class="flex flex-col h-full gap-2">
                <div class="flex items-start gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1">
                      <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{
                        algo.name
                      }}</span>
                      <MetricHint v-if="algo.hintComponent">
                        <template #plane>
                          <component :is="algo.hintComponent" />
                        </template>
                      </MetricHint>
                    </div>
                    <span class="block text-xs text-gray-600 dark:text-gray-400">{{
                      algo.desc
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RadioGroupRoot>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 mb-4">
        <!-- 自动二分逼近选项 -->
        <div
          class="p-3 bg-gray-50 rounded-lg border-2 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <CheckboxRoot
                v-model="enableAutoBinary"
                class="w-4 h-4 flex items-center justify-center border-2 border-gray-300 rounded bg-white hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-700 dark:border-gray-600 dark:hover:border-indigo-400 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600">
                <CheckboxIndicator class="flex items-center justify-center text-white">
                  <svg viewBox="0 0 8 8" fill="currentColor" class="w-3.5 h-3.5">
                    <path d="M1 4l2 2 4-4" stroke="currentColor" stroke-width="1" fill="none" />
                  </svg>
                </CheckboxIndicator>
              </CheckboxRoot>
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  智能调整
                </span>
                <MetricHint
                  :hint="`启用自动二分逼近功能，根据目标相似度自动寻找最优压缩质量。\n这会需要更多时间，但能得到对应相似度下的最优压缩体积。`" />
              </div>
            </label>

            <div v-if="enableAutoBinary" class="flex items-center gap-2 shrink-0">
              <NumberFieldRoot
                v-model="targetSimilarity"
                :min="80"
                :max="100"
                :step="0.1"
                class="flex items-center gap-0 relative">
                <NumberFieldDecrement
                  class="shrink-0 w-8 h-8 flex items-center justify-center text-sm font-semibold text-gray-600 bg-gray-50 border-2 border-gray-300 rounded-l-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600 cursor-pointer">
                  −
                </NumberFieldDecrement>
                <NumberFieldInput
                  class="w-20 h-8 px-2 py-1 text-sm font-semibold text-center text-gray-900 border-y-2 border-x-0 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                <NumberFieldIncrement
                  class="shrink-0 w-8 h-8 flex items-center justify-center text-sm font-semibold text-gray-600 bg-gray-50 border-2 border-gray-300 rounded-r-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600 cursor-pointer">
                  +
                </NumberFieldIncrement>
                <span class="absolute right-10 text-xs text-gray-500 pointer-events-none">%</span>
              </NumberFieldRoot>
              <MetricHint
                hint="自动寻找最佳质量调整以匹配目标相似度，这会需要更长的时间，但是能够得到对应相似度下的最优压缩体积。通常设置为 99% 即可在图片视觉上基本不变的情况下得到非常好的压缩。" />
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
          <SliderRoot
            v-model="qualityModel"
            :min="0.1"
            :max="1"
            :step="0.01"
            :disabled="enableAutoBinary"
            class="relative flex items-center w-full h-5 touch-none select-none data-disabled:opacity-50 data-disabled:cursor-not-allowed">
            <SliderTrack class="w-full h-1.5 bg-gray-200 rounded-full dark:bg-gray-700 relative">
              <SliderRange
                class="absolute h-full bg-indigo-500 rounded-full data-disabled:bg-gray-400" />
            </SliderTrack>
            <SliderThumb
              class="block w-4.5 h-4.5 bg-white border-2 border-indigo-500 rounded-full shadow hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 data-disabled:bg-gray-400 data-disabled:border-gray-400 transition-all cursor-pointer" />
          </SliderRoot>
        </div>
      </div>

      <div class="mb-4">
        <label class="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
          >输出格式</label
        >
        <div class="flex items-center gap-2">
          <SelectRoot v-model="outputFormat">
            <SelectTrigger
              class="flex-1 px-2.5 py-2 text-sm border-2 border-gray-200 rounded-md bg-white hover:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:hover:border-indigo-400 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-all">
              <SelectValue placeholder="选择输出格式" />
            </SelectTrigger>
            <SelectPortal>
              <SelectContent
                class="bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-50 overflow-auto z-50">
                <SelectItem
                  v-for="format in availableOutputFormats"
                  :key="format.value"
                  :value="format.value"
                  class="px-2.5 py-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 focus:bg-indigo-50 dark:focus:bg-indigo-900/20 focus:outline-none data-[state=checked]:bg-indigo-100 dark:data-[state=checked]:bg-indigo-900/40 transition-colors text-sm">
                  <SelectItemText>
                    {{ format.label }}
                  </SelectItemText>
                </SelectItem>
              </SelectContent>
            </SelectPortal>
          </SelectRoot>
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
        class="mt-2.5 px-3 py-2.5 text-xs font-mono text-blue-700 bg-blue-50 border-l-4 border-blue-600 rounded dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400">
        {{ optimalCompressionLog }}
      </div>
    </div>

    <!-- 结果展示 -->
    <div v-if="result" class="p-3 mb-4 bg-white rounded-xl shadow-sm dark:bg-gray-800">
      <h2 class="mb-2.5 text-base font-semibold text-gray-900 dark:text-gray-100">📊 压缩结果</h2>

      <!-- 文件大小对比线条 -->
      <div class="mb-3">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-xs text-gray-600 dark:text-gray-400">文件大小</span>
          <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ formatSize(originalImage?.size || 0) }}
          </span>
          <span class="text-sm font-semibold">
            (压缩后：<span
              :class="
                result.compressionRatio > 0 ?
                  'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
              ">
              {{ formatSize(result.size) }} </span
            >)
          </span>
        </div>
        <!-- 对比线条 -->
        <div class="relative h-2 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
          <div
            class="absolute left-0 top-0 h-full transition-all duration-500 rounded-full"
            :class="
              result.compressionRatio > 0 ?
                'bg-linear-to-r from-green-500 to-green-400'
              : 'bg-linear-to-r from-red-500 to-red-400'
            "
            :style="{
              width: `${Math.min((result.size / (originalImage?.size || 1)) * 100, 100)}%`,
            }"></div>
        </div>
      </div>

      <!-- 其他指标 -->
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div
          class="px-2.5 py-2 text-center rounded-lg"
          :class="
            result.compressionRatio > 0 ?
              'bg-green-50 dark:bg-green-900/20'
            : 'bg-red-50 dark:bg-red-900/20'
          ">
          <div class="mb-0.5 text-xs text-gray-600 dark:text-gray-400">压缩比</div>
          <div
            class="text-base font-bold"
            :class="
              result.compressionRatio > 0 ?
                'text-green-700 dark:text-green-300'
              : 'text-red-700 dark:text-red-300'
            ">
            {{ result.compressionRatio > 0 ? '-' : '+' }}
            {{ Math.abs(result.compressionRatio).toFixed(1) }}%
          </div>
        </div>
        <div class="px-2.5 py-2 text-center bg-gray-50 rounded-lg dark:bg-gray-700">
          <div class="mb-0.5 text-xs text-gray-600 dark:text-gray-400">
            耗时 ({{ totalRounds }}轮)
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-gray-100">{{ totalTime }}ms</div>
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
  import { ref, computed, useTemplateRef, watch, onUnmounted, type Component } from 'vue';
  import ImageCompare from '@/playground/components/ImageCompare.vue';
  import MetricHint from '@/playground/components/MetricHint.vue';
  import type { CompressionResult, AlgorithmId } from '@/playground/utils/compression';
  import {
    compressImage as compressImageUtil,
    findOptimalCompression,
  } from '@/playground/utils/compression';
  import {
    BrowserCompressionHint,
    JSquashWebPHint,
    JSquashAVIFHint,
    JSquashJPEGHint,
  } from './AlgorithmHints';
  import {
    SliderRoot,
    SliderTrack,
    SliderRange,
    SliderThumb,
    CheckboxRoot,
    CheckboxIndicator,
    RadioGroupRoot,
    RadioGroupItem,
    NumberFieldRoot,
    NumberFieldInput,
    NumberFieldIncrement,
    NumberFieldDecrement,
    SelectRoot,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectItemText,
    SelectPortal,
  } from 'reka-ui';

  /** 文件输入引用 */
  const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

  interface Algorithm {
    id: AlgorithmId;
    name: string;
    desc: string;
    hintComponent?: Component;
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
    {
      id: 'browser-compression',
      name: 'Browser Compression',
      desc: '当前插件使用',
      hintComponent: BrowserCompressionHint,
    },
    {
      id: 'jsquash-webp',
      name: 'jSquash WebP',
      desc: 'WebAssembly WebP',
      hintComponent: JSquashWebPHint,
    },
    {
      id: 'jsquash-avif',
      name: 'jSquash AVIF',
      desc: '下一代格式',
      hintComponent: JSquashAVIFHint,
    },
    {
      id: 'jsquash-jpeg',
      name: 'jSquash JPEG',
      desc: 'MozJPEG 编码器',
      hintComponent: JSquashJPEGHint,
    },
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

  /** Slider 组件使用的模型（数组格式） */
  const qualityModel = computed({
    get: () => [quality.value],
    set: (value) => {
      quality.value = value[0];
    },
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

<style scoped></style>
