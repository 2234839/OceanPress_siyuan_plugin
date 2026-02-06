<template>
  <div ref="containerRef" class="w-full my-4">
    <!-- 相似度指标显示 -->
    <div v-if="similarityResult" class="relative z-100 p-3 mb-3 text-white bg-linear-to-br from-indigo-500 to-purple-600 rounded-lg shadow-[0_2px_8px_rgba(102,126,234,0.2)] overflow-visible">
      <div class="relative grid grid-cols-3 gap-3">
        <div class="flex items-baseline gap-1.5">
          <div class="flex items-center gap-0.5 text-xs font-medium opacity-85">
            相似度
            <MetricHint :hint="metricHints.ssim" />
          </div>
          <span class="text-base font-bold text-white">
            {{ (similarityResult.ssim * 100).toFixed(2) }}%
          </span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <div class="flex items-center gap-0.5 text-xs font-medium opacity-85">
            PSNR
            <MetricHint :hint="metricHints.psnr" />
          </div>
          <span class="text-base font-bold text-white">{{ similarityResult.psnr.toFixed(2) }} dB</span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <div class="flex items-center gap-0.5 text-xs font-medium opacity-85">
            MSE
            <MetricHint :hint="metricHints.mse" />
          </div>
          <span class="text-base font-bold text-white">{{ similarityResult.mse.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <div class="relative w-full overflow-hidden rounded-lg select-none">
      <!-- 底层图片（压缩后） -->
      <img :src="after" alt="After" class="w-full h-full object-contain block" />

      <!-- 顶层图片（原图）- 使用 clip-path 裁剪 -->
      <img
        :src="before"
        alt="Before"
        class="absolute top-0 left-0 w-full h-full object-contain block transition-[clip-path] duration-50 ease-out"
        :style="{ clipPath: `inset(0 ${100 - position}% 0 0)` }"
      />

      <!-- 分隔线 -->
      <div
        class="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize -translate-x-1/2 z-10 shadow-[0_0_10px_rgba(0,0,0,0.3)]"
        :style="{ left: `${position}%` }"
        @mousedown="handleDragStart"
        @touchstart.prevent="handleDragStart"
      >
        <div class="w-full h-full bg-white"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
          <svg class="w-6 h-6 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 8L22 12L18 16" stroke-width="2" />
            <path d="M6 8L2 12L6 16" stroke-width="2" />
          </svg>
        </div>
      </div>

      <!-- 标签 -->
      <div class="absolute bottom-3 px-3 py-1.5 text-sm font-semibold text-white bg-black/70 rounded-md pointer-events-none transition-opacity duration-200" :style="{ left: '12px', opacity: position > 15 ? 1 : 0 }">原图</div>
      <div class="absolute bottom-3 px-3 py-1.5 text-sm font-semibold text-white bg-black/70 rounded-md pointer-events-none transition-opacity duration-200" :style="{ right: '12px', opacity: position < 85 ? 1 : 0 }">压缩后</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { calculateSimilarity } from '../utils/imageSimilarity';
import MetricHint from './MetricHint.vue';

/** 相似度计算结果 */
interface SimilarityResult {
  ssim: number;
  psnr: number;
  mse: number;
}

/** 指标说明文本 */
const metricHints = {
  ssim: 'SSIM (结构相似性指数) 是衡量两张图片相似度的指标，范围 0-1。该指标考虑了亮度、对比度和结构信息，更符合人眼对图片质量的感知。值越接近 1 表示两张图片越相似。',
  psnr: 'PSNR (峰值信噪比) 是传统的图片质量评估指标，单位为 dB。通常值在 20-40 之间，值越大表示失真越小。PSNR ≥ 30dB 通常认为质量可接受。',
  mse: 'MSE (均方误差) 计算两张图片像素值差异的平方平均值。值越小表示差异越小，0 表示完全相同。MSE 是最基础的误差计算方法，但不一定符合人眼感知。',
};

/** 组件属性 */
interface Props {
  /** 原图 URL */
  before: string;
  /** 压缩后图片 URL */
  after: string;
  /** 初始位置（百分比） */
  initialPosition?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialPosition: 50,
});

/** 容器引用 */
const containerRef = ref<HTMLElement | null>(null);
/** 当前分隔线位置（百分比） */
const position = ref(props.initialPosition);
/** 是否正在拖动 */
const isDragging = ref(false);
/** 相似度计算结果 */
const similarityResult = ref<SimilarityResult | null>(null);
/** 是否正在计算相似度 */
const isCalculating = ref(false);

/**
 * 计算图片相似度
 */
async function calculateImageSimilarity() {
  if (!props.before || !props.after || isCalculating.value) return;

  isCalculating.value = true;

  try {
    const result = await calculateSimilarity(props.before, props.after);
    similarityResult.value = result;
  } catch (error) {
    console.error('计算相似度失败:', error);
    similarityResult.value = null;
  } finally {
    isCalculating.value = false;
  }
}

/** 监听图片 URL 变化，重新计算相似度 */
watch(
  () => [props.before, props.after],
  () => {
    if (props.before && props.after) {
      calculateImageSimilarity();
    }
  },
  { immediate: true }
);

/**
 * 开始拖动
 */
function handleDragStart(event: MouseEvent | TouchEvent) {
  isDragging.value = true;
  event.preventDefault();

  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
  document.addEventListener('touchmove', handleDragMove, { passive: false });
  document.addEventListener('touchend', handleDragEnd);
}

/**
 * 拖动中
 */
function handleDragMove(event: MouseEvent | TouchEvent) {
  if (!isDragging.value || !containerRef.value) return;

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const rect = containerRef.value.getBoundingClientRect();
  const x = clientX - rect.left;

  // 限制在 0-100% 范围内
  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
  position.value = percentage;
}

/**
 * 结束拖动
 */
function handleDragEnd() {
  isDragging.value = false;

  document.removeEventListener('mousemove', handleDragMove);
  document.removeEventListener('mouseup', handleDragEnd);
  document.removeEventListener('touchmove', handleDragMove);
  document.removeEventListener('touchend', handleDragEnd);
}

onUnmounted(() => {
  // 清理事件监听
  document.removeEventListener('mousemove', handleDragMove);
  document.removeEventListener('mouseup', handleDragEnd);
  document.removeEventListener('touchmove', handleDragMove);
  document.removeEventListener('touchend', handleDragEnd);
  window.removeEventListener('resize', handleResize);
});

/**
 * 窗口大小改变时的处理
 */
function handleResize() {
  // 确保分隔线位置在合理范围内
  // 位置已经是百分比，会自动适应容器宽度
  position.value = Math.max(0, Math.min(100, position.value));
}

// 监听窗口大小变化
window.addEventListener('resize', handleResize);
</script>

<style scoped>
/* 响应式调整 */
@media (max-width: 640px) {
  .grid-cols-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .grid-cols-3 {
    grid-template-columns: 1fr;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .from-indigo-500 {
    --tw-gradient-from: #4c51bf;
  }

  .to-purple-600 {
    --tw-gradient-to: #553c9a;
  }

  .bg-white {
    background-color: rgb(45, 45, 45) !important;
  }
}
</style>
