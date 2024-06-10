import html2canvas from "html2canvas";
import { Menu, Plugin, showMessage } from "siyuan";
import "./index.css";
import { iconSVG } from "./icon";
import { putFile, setBlockAttrs } from "./api";
import { domToBlob } from "modern-screenshot";

export default class OceanPress extends Plugin {
  private btn_selector = "oceanpress_widget_button";
  async onload() {
    // 监听挂件块的出现
    const dom$ = new MutationObserver((mutations) => {
      for (const { target: el, addedNodes } of mutations) {
        if (el instanceof HTMLElement && el.dataset.docType === "NodeDocument") {
          addedNodes.forEach((el) => {
            console.log(el);

            if (el instanceof HTMLElement && el.dataset.type === "NodeWidget") {
              this.addButton(el);
            }
            if (el.parentElement?.dataset.type === "NodeWidget") {
              console.log(el);
            }
          });
          return;
        }
      }
    });
    dom$.observe(document.body, {
      childList: true,
      subtree: true,
    });
    this.unloadFn.push(() => dom$.disconnect());
  }
  async onLayoutReady() {
    this.addIcons(`<symbol id="oceanpress_preview">
    <text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle" font-size="13px">👀</text>
  </symbol>`);
    this.addTopBar({
      icon: iconSVG,
      title: "OceanPress",
      callback: (event) => {
        const menu = new Menu(this.name);
        menu.addItem({
          label: "预览当前页面",
          icon: `oceanpress_preview`,
          click: () => {
            menu.close();
          },
        });
        menu.open(event);
      },
    });
    this.addCommand({
      hotkey: "",
      langKey: "预览当前页面",
      langText: "预览当前页面",
    });
  }

  unloadFn: (() => void)[] = [];
  async onunload() {
    this.unloadFn.forEach((fn) => fn());
  }

  async addButton(widget: Element) {
    const btn = widget.querySelector("." + this.btn_selector);
    if (!btn) {
      const btn = document.createElement("div");
      this.unloadFn.push(() => btn.remove());

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
  previewCurrentPage() {}
}

async function saveWidgetImg(widgetDom: HTMLElement) {
  const id = widgetDom.dataset.nodeId;
  if (!id) {
    throw new Error("没有获取到挂件块的id");
  }

  const iframeBody: HTMLElement = (widgetDom.querySelector("iframe") as HTMLIFrameElement)
    .contentDocument!.body;
  iframeBody.querySelectorAll("noscript").forEach((el) => (el.style.display = "none"));
  const blob = await domToBlob(iframeBody);
  await putFile(`/data/storage/oceanpress/widget_img/${id}.jpg`, false, blob);
  showMessage(`保存成功 `);
  await setBlockAttrs(id, { "custom-oceanpress-widget-update": String(Date.now()) });
}
