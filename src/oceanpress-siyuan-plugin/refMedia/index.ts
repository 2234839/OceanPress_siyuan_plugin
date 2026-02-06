import { createApp } from 'vue';
import VideoControls from './controls.vue';

/**
 * 媒体引用组件,可以引用音视频片段，视频图片的区域
 */
export const refMedia = {
  loadStatus: false,
  load() {
    refMedia.loadStatus = true;
  },
  unLoad() {
    refMedia.loadStatus = false;
    refMedia.unLoadFn.forEach((fn) => fn());
  },
  unLoadFn: [] as (() => void)[],
  addUnLoadFn(fn: () => void) {
    refMedia.unLoadFn.push(fn);
  },
};
const old = new WeakSet<any>();

setInterval(() => {
  if (refMedia.loadStatus === false) return;
  // === 视频块引用
  const videos = Array.from<HTMLElement>(
    document.querySelectorAll(
      '[data-type="NodeBlockQueryEmbed"] > .protyle-wysiwyg__embed > [data-type="NodeVideo"]',
    ),
  );
  videos.forEach((videoBlock) => {
    if (refMedia.loadStatus === false) return;

    if (old.has(videoBlock)) {
      return;
    }
    old.add(videoBlock);

    const videoContent = videoBlock.parentElement!;
    const embedBlock = videoContent.parentElement!;
    const controlsEL = document.createElement("div");
    const video = videoBlock.querySelector<HTMLVideoElement>("video")!;
    const iframeContent = video.parentElement!;
    iframeContent.appendChild(controlsEL);
    const props = JSON.parse(embedBlock.getAttribute("custom-sy2video") ?? "{}");
    video.controls = false;

    // 使用 Vue3 渲染
    const app = createApp(VideoControls, {
      video,
      propsData: props,
    });
    app.mount(controlsEL);

    video.addEventListener("", () => {
      controlsEL.style.display = "block";
    });
    refMedia.addUnLoadFn(() => {
      controlsEL.remove();
      app.unmount();
      video.controls = true;
    });
  });
}, 1_000);
