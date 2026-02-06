<template>
  <div class="image-compare" ref="containerRef">
    <!-- 相似度指标显示 -->
    <div v-if="similarityResult" class="similarity-info">
      <div class="similarity-metrics">
        <div class="metric">
          <div class="metric-label">
            相似度
            <MetricHint :hint="metricHints.ssim" />
          </div>
          <span class="metric-value" :class="`quality-${qualityRating}`">
            {{ (similarityResult.ssim * 100).toFixed(2) }}%
          </span>
        </div>
        <div class="metric">
          <div class="metric-label">
            质量等级
            <MetricHint :hint="metricHints.quality" />
          </div>
          <span class="metric-value" :class="`quality-${qualityRating}`">
            {{ qualityLabel }}
          </span>
        </div>
        <div class="metric">
          <div class="metric-label">
            PSNR
            <MetricHint :hint="metricHints.psnr" />
          </div>
          <span class="metric-value">{{ similarityResult.psnr.toFixed(2) }} dB</span>
        </div>
        <div class="metric">
          <div class="metric-label">
            MSE
            <MetricHint :hint="metricHints.mse" />
          </div>
          <span class="metric-value">{{ similarityResult.mse.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <div class="image-wrapper" :style="{ height: containerHeight }">
      <!-- 底层图片（压缩后） -->
      <img :src="after" alt="After" class="image-after" @load="handleImageLoad" />

      <!-- 顶层图片（原图）- 使用 clip-path 裁剪 -->
      <img
        :src="before"
        alt="Before"
        class="image-before"
        :style="{ clipPath: `inset(0 ${100 - position}% 0 0)` }"
      />

      <!-- 分隔线 -->
      <div
        class="divider"
        :style="{ left: `${position}%` }"
        @mousedown="handleDragStart"
        @touchstart.prevent="handleDragStart"
      >
        <div class="divider-line"></div>
        <div class="divider-handle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 8L22 12L18 16" stroke-width="2" />
            <path d="M6 8L2 12L6 16" stroke-width="2" />
          </svg>
        </div>
      </div>

      <!-- 标签 -->
      <div class="label label-before" :style="{ opacity: position > 15 ? 1 : 0 }">原图</div>
      <div class="label label-after" :style="{ opacity: position < 85 ? 1 : 0 }">压缩后</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { calculateSimilarity, getQualityRating, getQualityLabel } from '../utils/imageSimilarity';
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
  quality: '质量等级基于 SSIM 值评定：≥ 95% 为优秀，≥ 85% 为良好，≥ 70% 为一般，< 70% 为较差。此等级可以帮助你快速判断压缩效果是否可接受。',
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
/** 容器高度 */
const containerHeight = ref<string>('auto');
/** 是否正在拖动 */
const isDragging = ref(false);
/** 相似度计算结果 */
const similarityResult = ref<SimilarityResult | null>(null);
/** 是否正在计算相似度 */
const isCalculating = ref(false);

/** 质量等级 */
const qualityRating = computed(() => {
  if (!similarityResult.value) return 'poor';
  return getQualityRating(similarityResult.value);
});

/** 质量等级标签 */
const qualityLabel = computed(() => {
  return getQualityLabel(qualityRating.value);
});

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
 * 图片加载完成后的处理
 */
function handleImageLoad() {
  if (containerRef.value) {
    const img = containerRef.value.querySelector('.image-after') as HTMLImageElement;
    if (img) {
      containerHeight.value = `${img.height}px`;
    }
  }
}

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
.image-compare {
  width: 100%;
  margin: 16px 0;
}

.similarity-info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
  overflow: visible;
  position: relative;
  z-index: 100;
}

.similarity-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  position: relative;
}

.metric {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.metric-label {
  font-size: 11px;
  opacity: 0.85;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 2px;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: white;
}

.metric-value.quality-excellent {
  color: #4ade80;
}

.metric-value.quality-good {
  color: #fbbf24;
}

.metric-value.quality-fair {
  color: #fb923c;
}

.metric-value.quality-poor {
  color: #f87171;
}

.image-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  user-select: none;
}

.image-after,
.image-before {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.image-before {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: clip-path 0.05s ease-out;
}

.divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background: white;
  cursor: ew-resize;
  transform: translateX(-50%);
  z-index: 10;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

.divider-line {
  width: 100%;
  height: 100%;
  background: white;
}

.divider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.divider-handle svg {
  width: 24px;
  height: 24px;
  color: #667eea;
}

.label {
  position: absolute;
  bottom: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
  transition: opacity 0.2s;
}

.label-before {
  left: 12px;
}

.label-after {
  right: 12px;
}

@media (prefers-color-scheme: dark) {
  .similarity-info {
    background: linear-gradient(135deg, #4c51bf 0%, #553c9a 100%);
    box-shadow: 0 4px 12px rgba(76, 81, 191, 0.4);
  }

  .divider {
    background: #667eea;
  }

  .divider-line {
    background: #667eea;
  }

  .divider-handle {
    background: #2d2d2d;
  }

  .label {
    background: rgba(255, 255, 255, 0.9);
    color: #333;
  }
}

@media (max-width: 640px) {
  .similarity-metrics {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .metric-label {
    font-size: 10px;
  }

  .metric-value {
    font-size: 14px;
  }
}
</style>
