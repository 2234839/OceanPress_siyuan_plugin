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
    <span
      v-for="item in mapData"
      :key="item.words"
      :style="{
        position: 'absolute',
        display: 'inline-block',
        top: `${item.top}px`,
        left: `${item.left}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        fontSize: `${item.height}px`,
        whiteSpace: 'nowrap',
        textAlign: 'center',
        color: 'rgba(143, 46, 46, 0)',
        pointerEvents: 'all',
      }">
      <span
        :style="{
          display: 'inline-block',
          width: `${item.width}px`,
          height: `${item.height}px`,
          transform: `scale(${item.scale}) translateX(${
            (item.width * item.scale - item.width) / 2
          }px) translateY(${(item.height * item.scale - item.height) / 2 - 2}px)`,
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }">
        {{ item.words }}
      </span>
    </span>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue';
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
        return {
          ...item,
          top: miniBox.top * heightRate.value,
          height: miniBox.height * heightRate.value,
          left: miniBox.left * widthRate.value,
          width: miniBox.width * widthRate.value,
          scale: calcScale(
            item.words,
            miniBox.width * widthRate.value,
            miniBox.height * heightRate.value,
          ),
        };
      }) || []
    );
  });
  if (!data.value) {
    props.data().then((d) => {
      data.value = d;
    });
  }

  const resizeFn = debounce(() => {
    widthRate.value = img.width / img.naturalWidth;
    heightRate.value = img.height / img.naturalHeight;
  }, 500);

  const imgSize = useElementSize(img);
  watch([imgSize.width, imgSize.height], () => {
    resizeFn();
  });

  function calcScale(text: string, width: number, baseFontSize: number) {
    const tempDiv = document.createElement('div');
    tempDiv.style.width = `${width}px`;
    tempDiv.style.fontSize = `${baseFontSize}px`;
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.position = 'absolute';
    tempDiv.style.whiteSpace = 'nowrap';
    tempDiv.textContent = text;
    document.body.appendChild(tempDiv);
    const requiredWidth = tempDiv.scrollWidth;
    document.body.removeChild(tempDiv);
    return width / requiredWidth;
  }

  function convertVerticesToRect(vertices: words_result[0]['vertexes_location']) {
    let minX = vertices[0].x;
    let maxX = vertices[0].x;
    let minY = vertices[0].y;
    let maxY = vertices[0].y;

    vertices.forEach((vertex) => {
      if (vertex.x < minX) minX = vertex.x;
      if (vertex.x > maxX) maxX = vertex.x;
      if (vertex.y < minY) minY = vertex.y;
      if (vertex.y > maxY) maxY = vertex.y;
    });

    const left = minX;
    const top = minY;
    const width = maxX - minX;
    const height = maxY - minY;

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
