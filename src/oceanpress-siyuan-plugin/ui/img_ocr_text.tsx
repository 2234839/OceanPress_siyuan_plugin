import { ref } from 'vue';
import type { words_result } from '~/libs/ocr/ocr';
import styles from './img_ocr_text.module.css';
import { oceanpress_ui_flag } from '~/oceanpress-siyuan-plugin/const';

export default function ImgOcrText(props: {
  data: () => Promise<words_result>;
  imgEL: HTMLImageElement;
}) {
  const img = props.imgEL;
  const data = ref<words_result | null>(null);
  const widthRate = ref(img.width / img.naturalWidth);
  const heightRate = ref(img.height / img.naturalHeight);

  if (!data.value) {
    props.data().then((d) => {
      data.value = d;
    });
  }

  return (
    <div
      class={`${oceanpress_ui_flag} ${styles.ocr_text_panel}`}
      title="点击保存当前挂件为图片供OceanPress使用,图标为灰色表示尚未保存过此挂件"
      style={{
        outline: data.value?.length ? 'solid 1px #2ecb23' : 'solid 1px gray',
        pointerEvents: 'none',
        height: `${img.height}px`,
      }}
      onClick={(e: Event) => e.stopPropagation()}
      onCopy={(e: Event) => e.stopPropagation()}>
      {data.value?.map((item) => {
        const miniBox = convertVerticesToRect(
          item.min_finegrained_vertexes_location || item.vertexes_location,
        );
        const top = miniBox.top * heightRate.value;
        const height = miniBox.height * heightRate.value;
        const left = miniBox.left * widthRate.value;
        const width = miniBox.width * widthRate.value;
        const scale = calcScale(item.words, width, height);

        return (
          <span
            style={{
              position: 'absolute',
              display: 'inline-block',
              top: `${top}px`,
              left: `${left}px`,
              width: `${width}px`,
              height: `${height}px`,
              fontSize: `${height}px`,
              whiteSpace: 'nowrap',
              textAlign: 'center',
              color: 'rgba(143, 46, 46, 0.8)',
              pointerEvents: 'all',
            }}>
            <span
              style={{
                display: 'inline-block',
                width: `${width}px`,
                height: `${height}px`,
                transform: `scale(${scale}) translateX(${
                  (width * scale - width) / 2
                }px) translateY(${(height * scale - height) / 2 - 2}px)`,
                whiteSpace: 'nowrap',
                textAlign: 'center',
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
