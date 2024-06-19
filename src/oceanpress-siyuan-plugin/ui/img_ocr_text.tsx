import { oceanpress_ui_flag } from "~/oceanpress-siyuan-plugin/const";
import { debounce } from "~/libs/js_util";
import type { words_result } from "~/libs/ocr/ocr";
import { createEffect, createSignal } from "solid-js";
import styles from "./img_ocr_text.module.css";
// assetsPath, "ocr-texts.json" 思源的ocr结果存储在这里
export function img_ocr_text(props: {
  data: () => Promise<words_result>;
  /**
   * 图片显示高度宽度和实际高宽显示比，用于处理图片缩放
   */
  imgEL: HTMLImageElement;
}) {
  const img = props.imgEL;
  const [data, setData] = createSignal(null as null | words_result);
  if (!data()) {
    props.data().then((d) => {
      setData(d);
    });
  }

  // 处理图片缩放
  const [widthRate, set_widthRate] = createSignal(img.width / img.naturalWidth);
  const [heightRate, set_heightRate] = createSignal(img.height / img.naturalHeight);

  const resizeFn = debounce(() => {
    set_widthRate(img.width / img.naturalWidth);
    set_heightRate(img.height / img.naturalHeight);
  }, 500);
  createEffect(() => {
    const resizeObserver = new ResizeObserver(resizeFn);
    resizeObserver.observe(img, {
      box: "border-box", // 可选，指定盒子模型
    });
    return () => {
      resizeObserver.disconnect();
    };
  });

  return (
    <div
      class={oceanpress_ui_flag + " " + styles.ocr_text_panel}
      title="点击保存当前挂件为图片供OceanPress使用,图标为灰色表示尚未保存过此挂件"
      style={{
        outline: data()?.length ? `solid 1px #2ecb23` : "",
      }}
      // 阻止事件冒泡，因为思源会处理此事件导致不符合预期的行为
      onclick={(e) => e.stopPropagation()}
      onCopy={(e) => e.stopPropagation()}>
      {data()?.map((item) => {
        const miniBox = convertVerticesToRect(
          // 这个盒子看起来比 words_result.location 的效果要好
          item.min_finegrained_vertexes_location || item.vertexes_location,
        );
        const top = miniBox.top * heightRate();
        const height = miniBox.height * heightRate();

        const left = miniBox.left * widthRate();
        const width = miniBox.width * widthRate();

        const scale = calcScale(item.words, width, height);
        return (
          <span
            style={{
              position: `absolute`,
              display: "inline-block",
              top: `${top}px`,
              left: `${left}px`,
              width: `${width}px`,
              height: `${height}px`,
              "font-size": `${height}px`,
              // outline: `solid 1px #2ecb23`,
              "white-space": `nowrap`,
              "text-align": "center",
              color: "rgba(0,0,0,0)",
              // color: "red",
            }}>
            <span
              style={{
                display: "inline-block",
                width: `${width}px`,
                height: `${height}px`,
                transform: `scale(${scale}) translateX(${
                  (width * scale - width) / 2
                }px) translateY(${(height * scale - height) / 2 - 2}px)`,
                // outline: `solid 1px #2ecb23`,
                "white-space": `nowrap`,
                "text-align": "center",
              }}>
              {item.words}
            </span>
          </span>
        );
      })}
    </div>
  );
}
function calcScale(text: string, width: number, baseFontSize: number) {
  // 创建一个临时的div元素
  const tempDiv = document.createElement("div");
  tempDiv.style.width = `${width}px`; // 设置固定宽度
  tempDiv.style.fontSize = `${baseFontSize}px`; // 设置固定宽度
  tempDiv.style.visibility = "hidden"; // 隐藏div，避免影响页面布局
  tempDiv.style.position = "absolute"; // 绝对定位，同样避免影响布局
  tempDiv.style.whiteSpace = "nowrap"; // 文本不换行
  tempDiv.textContent = text;
  document.body.appendChild(tempDiv); // 将临时div添加到文档中
  // 设置临时div的文本内容
  // 测量文本所需的宽度
  const requiredWidth = tempDiv.scrollWidth;
  // 移除临时div
  document.body.removeChild(tempDiv);
  return width / requiredWidth;
}

function convertVerticesToRect(vertices: words_result[0]["vertexes_location"]) {
  // 初始化最小和最大值
  let minX = vertices[0].x;
  let maxX = vertices[0].x;
  let minY = vertices[0].y;
  let maxY = vertices[0].y;

  // 遍历顶点以找到最小和最大值
  vertices.forEach((vertex) => {
    if (vertex.x < minX) minX = vertex.x;
    if (vertex.x > maxX) maxX = vertex.x;
    if (vertex.y < minY) minY = vertex.y;
    if (vertex.y > maxY) maxY = vertex.y;
  });

  // 计算 left, top, width, height
  const left = minX;
  const top = minY;
  const width = maxX - minX;
  const height = maxY - minY;

  return { left, top, width, height };
}
