<template>
  <div
    ref="hintRef"
    class="metric-hint"
    @mouseenter="handleMouseEnter"
    @mouseleave="isExpanded = false"
  >
    <!-- 触发图标 -->
    <span class="hint-icon" title="查看说明">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="2"/>
        <path d="M12 16V12" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 8H12.01" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </span>

    <!-- 说明内容 -->
    <transition name="hint-expand">
      <div v-if="isExpanded" class="hint-content" :class="`align-${position}`">
        <div class="hint-text">{{ hint }}</div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

/** 组件属性 */
interface Props {
  /** 说明文本内容 */
  hint: string;
}

defineProps<Props>();

/** 是否展开说明 */
const isExpanded = ref(false);
/** 提示框引用 */
const hintRef = ref<HTMLElement | null>(null);
/** 对齐位置 */
const position = ref<'left' | 'center' | 'right'>('center');

/**
 * 鼠标进入时计算最佳对齐位置
 */
function handleMouseEnter() {
  isExpanded.value = true;

  if (hintRef.value) {
    const rect = hintRef.value.getBoundingClientRect();
    const windowWidth = window.innerWidth;

    // 如果图标在屏幕左侧 1/3，浮窗左对齐
    if (rect.left < windowWidth / 3) {
      position.value = 'left';
    }
    // 如果图标在屏幕右侧 1/3，浮窗右对齐
    else if (rect.left > windowWidth * 2 / 3) {
      position.value = 'right';
    }
    // 否则居中对齐
    else {
      position.value = 'center';
    }
  }
}
</script>

<style scoped>
.metric-hint {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
}

.hint-icon {
  display: inline-flex;
  align-items: center;
  cursor: help;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.hint-icon:hover {
  opacity: 1;
}

.hint-icon svg {
  width: 14px;
  height: 14px;
}

.hint-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 998;
  background: transparent;
}

.hint-content {
  position: absolute;
  top: calc(100% + 8px);
  z-index: 9999999;
  min-width: 280px;
  max-width: 400px;
  background: white;
  color: #333;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  line-height: 1.6;
}

/* 居中对齐（默认） */
.hint-content.align-center {
  left: 50%;
  transform: translateX(-50%);
}

.hint-content.align-center::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid white;
}

/* 左对齐 */
.hint-content.align-left {
  left: 0;
  transform: none;
}

.hint-content.align-left::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 18px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid white;
}

/* 右对齐 */
.hint-content.align-right {
  right: 0;
  transform: none;
}

.hint-content.align-right::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 18px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid white;
}

.hint-content::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid white;
}

.hint-text {
  color: #555;
}

/* 展开动画 */
.hint-expand-enter-active,
.hint-expand-leave-active {
  transition: all 0.2s ease;
  transform-origin: top center;
}

.hint-expand-enter-from,
.hint-expand-leave-to {
  opacity: 0;
  transform: translateX(-50%) scaleY(0.8) translateY(-8px);
}

/* 淡入淡出动画 */
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.2s ease;
}

.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
}

@media (prefers-color-scheme: dark) {
  .hint-content {
    background: #2d2d2d;
    color: #e5e5e5;
  }

  .hint-content::before {
    border-bottom-color: #2d2d2d;
  }

  .hint-text {
    color: #a3a3a3;
  }
}

@media (max-width: 640px) {
  .hint-content.align-center {
    left: 0;
    transform: none;
    min-width: 100%;
  }

  .hint-content.align-center::before {
    left: 18px;
    transform: none;
  }

  .hint-content.align-left {
    min-width: calc(100vw - 32px);
  }

  .hint-content.align-right {
    min-width: calc(100vw - 32px);
  }
}
</style>
