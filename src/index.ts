import html2canvas from "html2canvas";
import { Plugin, showMessage } from "siyuan";
import "./index.css";
export default class OceanPress extends Plugin {
  name = "OceanPress plugin";
  private run = false;
  private btn_selector = "oceanpress_widget_button";
  async onload() {
    this.run = true;
  }
  async onLayoutReady() {
    this.addButton();
  }
  async onunload() {
    this.run = false;
    document.querySelectorAll("." + this.btn_selector).forEach((btn) => btn.remove());
    console.log(this.run);
  }

  private async addButton() {
    while (this.run) {
      const widgetDoms = [
        ...document.querySelectorAll(`.protyle-wysiwyg [data-type="NodeWidget"]`),
      ];
      for (const widget of widgetDoms) {
        const btn = widget.querySelector("." + this.btn_selector);
        if (!btn) {
          const btn = document.createElement("div");
          btn.classList.add(this.btn_selector);
          btn.innerText = "🌊";
          btn.title = `点击保存当前挂件为图片供OceanPress使用,图标为灰色表示尚未保存过此挂件`;
          widget.appendChild(btn);
          btn.onclick = () => {
            btn.innerText = "🔄️";
            saveWidgetImg(widget as HTMLElement).then(() => {
              btn.innerText = "🌊";
            });
          };
        }
      }
      await sleep(1000);
    }
  }
}
function sleep(time) {
  return new Promise((s) => setTimeout(s, time));
}
async function saveWidgetImg(widgetDom: HTMLElement) {
  const id = widgetDom.dataset.nodeId;
  const updated = widgetDom.getAttribute("updated");
  const iframeBody: HTMLElement = (widgetDom.querySelector("iframe") as HTMLIFrameElement)
    .contentDocument.body;

  const canvas = await html2canvas(iframeBody);
  const formData = new FormData();
  formData.append("path", `/data/storage/oceanpress/widget_img/${id}.jpg`);
  formData.append("modTime", updated);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      formData.append("file", blob, `${id}.jpg`);
      fetch("/api/file/putFile", {
        method: "POST",
        body: formData,
      })
        .then(async (r) => {
          showMessage(`保存成功 ${await r.text()}`);
          await fetch("/api/attr/setBlockAttrs", {
            method: "POST",
            mode: "cors",
            credentials: "include",
            body: JSON.stringify({
              id: id,
              attrs: {
                "custom-oceanpress-widget-update": String(Date.now()),
              },
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          resolve(r);
        })
        .catch(reject);
    });
  });
}
