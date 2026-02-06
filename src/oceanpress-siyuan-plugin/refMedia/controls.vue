<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import styles from './controls.module.css';
import { Value } from '@sinclair/typebox/value';
import type { VideoProps } from './controlsTypes';

const props = defineProps<{
  video: HTMLVideoElement;
  propsData: VideoProps;
}>();

if (!Value.Check((await import('./controlsTypes')).VideoProps, props.propsData)) {
  console.error(props.video, props.propsData, '传递的参数不符合要求');
}

// 创建响应式状态来存储播放进度
const currentTime = ref(0);

const progress = computed(() => {
  const p = ((currentTime.value - props.propsData.startTime) / (props.propsData.endTime - props.propsData.startTime)) * 100;
  if (isNaN(props.video.duration) || props.video.duration === Infinity) {
    return 0;
  } else {
    return p;
  }
});

// 监听 currentTime 变化
watch(currentTime, (newTime) => {
  // 如果播放时间小于开始时间，跳转到开始时间
  if (newTime < props.propsData.startTime) {
    props.video.currentTime = props.propsData.startTime;
  }

  if (newTime > props.propsData.endTime) {
    props.video.currentTime = props.propsData.startTime;
    props.video.pause(); // 结束播放
  }
});

const handleTimeUpdate = () => {
  currentTime.value = props.video.currentTime;
};

onMounted(() => {
  props.video.addEventListener('timeupdate', handleTimeUpdate);
});

onUnmounted(() => {
  props.video.removeEventListener('timeupdate', handleTimeUpdate);
});

function togglePlay() {
  if (props.video.paused) {
    props.video.play();
  } else {
    props.video.pause();
  }
}
</script>

<template>
  <div :class="styles.content" @click="(e) => e.stopPropagation()">
    <div :class="styles.tools">
      <div @click="togglePlay">
        {{ currentTime ? (video.paused ? '▶️' : '⏸️') : '▶️' }}
      </div>
      {{ `${(currentTime - props.propsData.startTime).toFixed(2)}/${props.propsData.endTime - props.propsData.startTime}s` }}
    </div>

    <div title="进度条" style="background: #333; overflow: hidden">
      <div
        :style="{
          background: 'red',
          height: '10px',
          width: `${progress}%`,
        }"></div>
    </div>
  </div>
</template>
