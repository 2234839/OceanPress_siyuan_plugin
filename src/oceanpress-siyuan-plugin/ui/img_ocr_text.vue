<template>
  <div
    class="ocr_text_panel"
    :class="oceanpress_ui_flag"
    :style="{
      outline: data?.length ? 'solid 1px #2ecb23' : '',
      pointerEvents: 'none',
      height: `${img.height}px`,
    }"
    @click.stop
    @copy.stop>
    <div
      v-for="item in mapData"
      :key="item.words"
      :style="{
        position: 'absolute',
        top: `${item.top}px`,
        left: `${item.left}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        // color: '#342',
        color: 'transparent',
        pointerEvents: 'all',
        // border: 'solid 1px #333',
        display: 'flex',
        alignItems: 'center',
      }">
      <span
        :ref="el => setSpanRef(el, item.words)"
        style="white-space: nowrap; overflow: hidden;">
        {{ item.words }}
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, watch, nextTick, onBeforeUnmount, onUnmounted } from 'vue';
  import { debounce } from '~/libs/js_util';
  import type { words_result } from '~/libs/ocr/ocr';
  import { oceanpress_ui_flag } from '~/oceanpress-siyuan-plugin/const';
  import { useElementSize } from '@vueuse/core';
  const props = defineProps<{
    data: () => Promise<words_result>;
    imgEL: HTMLImageElement;
  }>();

  const img = props.imgEL;
  const data = ref<words_result | null>(null);
  const widthRate = ref(img.width / img.naturalWidth);
  const heightRate = ref(img.height / img.naturalHeight);
  const mapData = computed(() => {
    return (
      data.value?.map((item) => {
        const miniBox = convertVerticesToRect(
          item.min_finegrained_vertexes_location || item.vertexes_location,
        );

        // 计算显示尺寸
        const displayWidth = miniBox.width * widthRate.value;
        const displayHeight = miniBox.height * heightRate.value;

        // console.log('[miniBox]', miniBox, item.words);
        return {
          ...item,
          top: miniBox.top * heightRate.value,
          height: displayHeight,
          left: miniBox.left * widthRate.value,
          width: displayWidth,
        };
      }) || []
    );
  });
  if (!data.value) {
    props.data().then((d) => {
      data.value = d;
      // 数据加载完成后，重新计算所有字体大小
      nextTick(() => {
        recalculateAllFontSizes();
      });
    });
  }

  const resizeFn = debounce(() => {
    // 优化：添加边界检查和更精确的缩放计算
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      widthRate.value = img.width / img.naturalWidth;
      heightRate.value = img.height / img.naturalHeight;

      // 图片大小变化后，重新计算所有字体大小
      recalculateAllFontSizes();
    }
  }, 200); // 减少延迟时间，提高响应性

  const imgSize = useElementSize(img);
  watch([imgSize.width, imgSize.height], () => {
    resizeFn();
  });

  // 组件卸载时清理资源
  onBeforeUnmount(() => {
    // 清理 span refs
    spanRefs.value = {};

    // 清理计算队列
    calculationQueue.value.clear();

    // 清理缓存
    calculationCache.value.clear();

    // 重置计算状态
    isCalculating.value = false;

    // 重置性能统计
    stats.value = {
      totalCalculations: 0,
      cacheHits: 0,
      averageTime: 0,
    };
  });

  // 组件完全卸载后的最终清理
  onUnmounted(() => {
    // 最终确保所有状态都被清理
    spanRefs.value = {};
    calculationQueue.value.clear();
    calculationCache.value.clear();
    isCalculating.value = false;
  });

  // 管理 span refs 和性能优化
  const spanRefs = ref<Record<string, HTMLSpanElement>>({});
  const calculationQueue = ref<Set<string>>(new Set());
  const isCalculating = ref(false);
  const calculationCache = ref<Map<string, number>>(new Map());
  const lastCalculationTime = ref<number>(0);
  const CALCULATION_THROTTLE = 16; // 60fps 对应的约16ms

  // 性能统计
  const stats = ref({
    totalCalculations: 0,
    cacheHits: 0,
    averageTime: 0,
  });

  // 更智能的防抖计算
  const debouncedCalculate = debounce((texts: string[]) => {
    const startTime = performance.now();

    texts.forEach(text => {
      calculateFontSizeForText(text);
    });

    calculationQueue.value.clear();
    isCalculating.value = false;

    // 更新性能统计
    const endTime = performance.now();
    const calculationTime = endTime - startTime;
    stats.value.totalCalculations++;
    stats.value.averageTime = (stats.value.averageTime * (stats.value.totalCalculations - 1) + calculationTime) / stats.value.totalCalculations;

    lastCalculationTime.value = endTime;
  }, 32); // 稍微增加防抖时间以减少计算频率

  function setSpanRef(el: any, text: string) {
    if (el) {
      spanRefs.value[text] = el;

      // 检查是否需要立即计算（基于节流）
      const now = performance.now();
      const timeSinceLastCalculation = now - lastCalculationTime.value;

      if (timeSinceLastCalculation >= CALCULATION_THROTTLE) {
        // 如果距离上次计算时间足够长，立即计算
        calculationQueue.value.add(text);
        if (!isCalculating.value) {
          isCalculating.value = true;
          debouncedCalculate(Array.from(calculationQueue.value));
        }
      } else {
        // 否则加入队列等待批量计算
        calculationQueue.value.add(text);
        nextTick(() => {
          if (!isCalculating.value && calculationQueue.value.size > 0) {
            isCalculating.value = true;
            debouncedCalculate(Array.from(calculationQueue.value));
          }
        });
      }
    } else {
      // 清理不再存在的 span refs 和缓存
      delete spanRefs.value[text];
      calculationCache.value.delete(text);
      calculationQueue.value.delete(text);
    }
  }

  function calculateFontSizeForText(text: string) {
    const span = spanRefs.value[text];
    if (!span) return;

    // 获取父元素宽度
    const parentElement = span.parentElement;
    if (!parentElement) return;

    const parentWidth = parentElement.clientWidth;

    // 如果父元素宽度为0，跳过计算
    if (parentWidth <= 0) return;

    // 创建缓存键
    const cacheKey = `${text}_${parentWidth}`;

    // 检查缓存
    if (calculationCache.value.has(cacheKey)) {
      const cachedSize = calculationCache.value.get(cacheKey);
      if (cachedSize !== undefined) {
        span.style.fontSize = `${cachedSize}px`;
        stats.value.cacheHits++;
        return;
      }
    }

    // 临时设置span为可见并允许不换行，以测量文本宽度
    const originalWhiteSpace = span.style.whiteSpace;
    const originalVisibility = span.style.visibility;

    span.style.whiteSpace = 'nowrap';
    span.style.visibility = 'hidden';
    span.style.fontSize = '16px';

    // 获取文本在初始字体大小下的宽度
    const textWidth = span.scrollWidth;

    // 计算合适的字体大小，使文本宽度等于父元素宽度
    const calculatedSize = Math.max(8, Math.min((parentWidth / textWidth) * 16, 100)); // 限制字体大小范围

    // 设置计算后的字体大小
    span.style.fontSize = `${calculatedSize}px`;

    // 恢复原始样式
    span.style.whiteSpace = originalWhiteSpace;
    span.style.visibility = originalVisibility;
    span.style.fontSize = `${calculatedSize}px`;

    // 缓存结果
    calculationCache.value.set(cacheKey, calculatedSize);

    // 限制缓存大小
    if (calculationCache.value.size > 1000) {
      const firstKey = calculationCache.value.keys().next().value;
      if (firstKey) {
        calculationCache.value.delete(firstKey);
      }
    }
  }

  // 批量重新计算所有字体大小
  function recalculateAllFontSizes() {
    const texts = Object.keys(spanRefs.value);
    if (texts.length === 0) return;

    // 智能过滤：只重新计算需要更新的文本
    const textsToRecalculate = texts.filter(text => {
      const span = spanRefs.value[text];
      if (!span) return false;

      const parentElement = span.parentElement;
      if (!parentElement) return false;

      const parentWidth = parentElement.clientWidth;
      const cacheKey = `${text}_${parentWidth}`;

      // 如果缓存中没有对应的数据，或者父容器宽度发生了变化，则需要重新计算
      return !calculationCache.value.has(cacheKey);
    });

    if (textsToRecalculate.length > 0) {
      debouncedCalculate(textsToRecalculate);
    }
  }

  // 清理缓存（保留以供调试使用）
  // function clearCache() {
  //   calculationCache.value.clear();
  // }

  // 获取性能统计（保留以供调试使用）
  // function getPerformanceStats() {
  //   return {
  //     ...stats.value,
  //     cacheSize: calculationCache.value.size,
  //     activeRefs: Object.keys(spanRefs.value).length,
  //     queueSize: calculationQueue.value.size,
  //     cacheHitRate: stats.value.totalCalculations > 0 ?
  //       (stats.value.cacheHits / stats.value.totalCalculations * 100).toFixed(2) + '%' : '0%',
  //   };
  // }


  function convertVerticesToRect(vertices: words_result[0]['vertexes_location']) {
    // 优化：添加边界检查和更精确的计算
    if (!vertices || vertices.length === 0) {
      return { left: 0, top: 0, width: 0, height: 0 };
    }

    let minX = vertices[0].x;
    let maxX = vertices[0].x;
    let minY = vertices[0].y;
    let maxY = vertices[0].y;

    vertices.forEach((vertex) => {
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
    });

    // 添加最小尺寸限制，避免过小的区域
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    // 微调位置，考虑文字的基线偏移
    const left = minX;
    const top = minY;

    return { left, top, width, height };
  }
</script>

<style scoped>
  .ocr_text_panel {
    position: absolute;
    user-select: text;
    width: 100%;
    left: 0;
    top: 0;
  }
</style>
