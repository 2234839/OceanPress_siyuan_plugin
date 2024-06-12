import { useCallback, useEffect, useState } from "preact/hooks";
import { oceanpress_widget_ui } from "~/const";
import { debounce } from "~/libs/js_util";
import type { words_result } from "~/libs/ocr/ocr";

export function img_ocr_text(props: {
  data: () => Promise<words_result>;
  /**
   * 图片显示高度宽度和实际高宽显示比，用于处理图片缩放
   */
  imgEL: HTMLImageElement;
}) {
  const img = props.imgEL;
  const [data, setData] = useState(null as null | words_result);

  if (!data) {
    props.data().then((r) => {
      console.log("get Data", r);

      setData(r);
    });
  }

  // 处理图片缩放
  const [widthRate, set_widthRate] = useState(img.width / img.naturalWidth);
  const [heightRate, set_heightRate] = useState(img.height / img.naturalHeight);

  const resizeFn = useCallback(
    debounce(() => {
      set_widthRate(img.width / img.naturalWidth);
      set_heightRate(img.height / img.naturalHeight);
      console.log(3);
    }, 500),
    [img],
  );
  useEffect(() => {
    const resizeObserver = new ResizeObserver(resizeFn);
    resizeObserver.observe(img, {
      box: "border-box", // 可选，指定盒子模型
    });
    return () => {
      resizeObserver.disconnect();
    };
  });

  function onClick(event: MouseEvent) {
    // 阻止事件冒泡，因为思源会处理此事件导致不符合预期的行为
    event.stopPropagation();
  }
  function onCopy(event: ClipboardEvent) {
    // 阻止事件冒泡，因为思源会处理此事件导致不符合预期的行为
    event.stopPropagation();
  }
  return (
    <div
      className={oceanpress_widget_ui}
      title="点击保存当前挂件为图片供OceanPress使用,图标为灰色表示尚未保存过此挂件"
      style={{
        position: "absolute",
        "user-select": "text",
        width: "100%",
        height: "100%",
        left: 0,
        outline: `solid 1px #2ecb23`,
      }}
      onClick={onClick}
      onCopy={onCopy}>
      {data?.map((item) => {
        const miniBox = convertVerticesToRect(
          // 这个盒子看起来比 words_result.location 的效果要好
          item.min_finegrained_vertexes_location || item.vertexes_location,
        );
        const top = miniBox.top * heightRate;
        const height = miniBox.height * heightRate;

        const left = miniBox.left * widthRate;
        const width = miniBox.width * widthRate;

        return (
          <span
            style={{
              position: `absolute`,
              top: `${top}px`,
              left: `${left}px`,
              width: `${width}px`,
              height: `${height}px`,
              "font-size": ` ${calculateTextSize(item.words, width)}px`,
              outline: `solid 1px #2ecb23`,
              "white-space": `nowrap`,
              "text-align": "center",
              color: "rgba(0,0,0,0)",
            }}>
            {item.words}
          </span>
        );
      })}
    </div>
  );
}
function calculateTextSize(text: string, width: number) {
  // 创建一个临时的div元素
  const tempDiv = document.createElement("div");
  tempDiv.style.width = `${width}px`; // 设置固定宽度
  tempDiv.style.visibility = "hidden"; // 隐藏div，避免影响页面布局
  tempDiv.style.position = "absolute"; // 绝对定位，同样避免影响布局
  tempDiv.style.whiteSpace = "nowrap"; // 文本不换行
  document.body.appendChild(tempDiv); // 将临时div添加到文档中

  // 设置临时div的文本内容
  tempDiv.textContent = text;

  // 测量文本所需的宽度
  const requiredWidth = tempDiv.scrollWidth;

  // 计算字体大小，这里使用了简单的线性关系，实际情况可能需要更复杂的计算
  // 假设在宽度完全填满时的字体大小为基础大小，如果宽度不够则按比例缩小
  const baseFontSize = 16; // 基础字体大小，根据实际情况调整
  const actualFontSize = (width / requiredWidth) * baseFontSize;

  // 移除临时div
  document.body.removeChild(tempDiv);

  // 返回计算出的字体大小
  return actualFontSize;
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
