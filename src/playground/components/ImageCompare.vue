<template>
  <div class="image-compare" ref="containerRef">
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
import { ref, onMounted, onUnmounted } from 'vue';

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
});
</script>

<style scoped>
.image-compare {
  width: 100%;
  margin: 16px 0;
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
</style>
