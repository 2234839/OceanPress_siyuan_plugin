import { domToBlob } from "modern-screenshot";
import { showMessage } from "siyuan";
import { putFile, setBlockAttrs } from "~/libs/api";

export async function saveWidgetImg(widgetDom: HTMLElement) {
  const id = widgetDom.dataset.nodeId;
  if (!id) {
    return showMessage("没有获取到挂件块的id");
  }

  const iframeBody: HTMLElement = (widgetDom.querySelector("iframe") as HTMLIFrameElement)
    .contentDocument!.body;
  iframeBody.querySelectorAll("noscript").forEach((el) => (el.style.display = "none"));
  const blob = await domToBlob(iframeBody);
  await putFile(`/data/storage/oceanpress/widget_img/${id}.jpg`, false, blob);

  showMessage(`保存成功 `);
  await setBlockAttrs(id, { "custom-oceanpress-widget-update": String(Date.now()) });
}
