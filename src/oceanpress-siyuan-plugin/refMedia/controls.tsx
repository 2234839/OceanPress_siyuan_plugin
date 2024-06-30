import styles from "./controls.module.css";
import { createEffect, createMemo, createSignal } from "solid-js";
import { Type, Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export type VideoProps = Static<typeof VideoProps>;
export const VideoProps = Type.Object({
  startTime: Type.Number({ minimum: 0, default: 0 }),
  endTime: Type.Number({ minimum: 0, default: 0 }),
});

export function videoControls({ video, props }: { video: HTMLVideoElement; props: VideoProps }) {
  if (!Value.Check(VideoProps, props)) {
    console.error(video, props, "传递的参数不符合要求");
    return <></>;
  }
  // 创建响应式状态来存储播放进度
  const [currentTime, setCurrentTime] = createSignal(0);
  const progress = createMemo(() => {
    const p = ((currentTime() - props.startTime) / (props.endTime - props.startTime)) * 100;
    if (isNaN(video.duration) || video.duration === Infinity) {
      return 0;
    } else {
      return p;
    }
  });
  createEffect(() => {
    // 如果播放时间小于开始时间，跳转到开始时间
    if (currentTime() < props.startTime) {
      video.currentTime = props.startTime;
    }

    if (currentTime() > props.endTime) {
      video.currentTime = props.startTime;
      video.pause(); // 结束播放
    }
  }, [currentTime]);

  createEffect(() => {
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [video]);
  return (
    <div class={styles.content} onClick={(e) => e.stopPropagation()}>
      <div class={styles.tools}>
        <div
          onClick={() => {
            video.paused ? video.play() : video.pause();
          }}>
          {(currentTime(), video.paused ? "▶️" : "⏸️")}
        </div>
        {`${currentTime().toFixed(2)}/${props.endTime - props.startTime}s`}
      </div>

      <div title="进度条" style={{ background: "#333", overflow: "hidden" }}>
        <div
          style={{
            background: "red",
            height: "10px",
            width: `${progress()}%`,
          }}></div>
      </div>
    </div>
  );
}
