<template>
  <TooltipRoot>
    <TooltipTrigger as-child>
      <div class="inline-flex">
        <slot name="hint">
          <!-- 默认信息图标 -->
          <svg
            class="w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
            fill="currentColor"
            viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd" />
          </svg>
        </slot>
      </div>
    </TooltipTrigger>
    <TooltipContent
      class="max-w-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 px-2 py-2 rounded shadow-lg z-50 whitespace-normal">
      <slot name="plane">
        {{ hint }}
      </slot>
      <TooltipArrow class="fill-gray-300 dark:fill-gray-600" />
    </TooltipContent>
  </TooltipRoot>
</template>

<script setup lang="ts">
import { TooltipRoot, TooltipTrigger, TooltipContent, TooltipArrow } from 'reka-ui';

/** 组件属性 */
interface Props {
  /** 说明文本内容 */
  hint?: string;
}

defineProps<Props>();
</script>
