import { Dialog, Menu, Plugin, showMessage } from "siyuan";
import "./index.css";
import { iconSVG } from "./icon";
import { putFile, setBlockAttrs } from "./api";
import { domToBlob } from "modern-screenshot";
import { ocr } from "./libs/ocr/ocr";

const ICON = "🌊";

export default class OceanPress extends Plugin {
  private btn_selector = "oceanpress_widget_button";
  async onload() {
    this.unloadFn.push(
      (() => {
        const id = setInterval(() => {
          document.body.querySelectorAll(`[data-type="NodeWidget"]`).forEach((widget) => {
            this.addButton(widget);
          });
        }, 1000);
        return () => clearInterval(id);
      })(),
    );

    // ocr 功能
    this.eventBus.on("open-menu-image", (event) => {
      (globalThis.window.siyuan.menus.menu as Menu).addItem({
        label: "OceanPress Ocr",
        iconHTML: ICON,
        click: async () => {
          const spanImg = event.detail.element as HTMLElement;
          const img = spanImg.querySelector(`img[data-src]`) as HTMLImageElement;
          const imgSrc = img.dataset.src!;
          const name = imgSrc.split("/").pop()!;
          const base64 = await imageToBase64(imgSrc);

          const path = imgSrc.replace("/", "_");
          const storageName = `ocr_${path}.json`;
          const storeValue = await this.loadData(storageName);
          // TODO dev
          if (storeValue) {
            console.log(storeValue);
            return;
          }

          const apiSK = await this.apiSK();
          if (!apiSK) return;

          const jobStatus = await ocr({
            name: name || "test.png",
            imgBase64: base64,
            apiSK,
          });
          this.saveData(storageName, jobStatus);
        },
      });
    });
  }
  async apiSK(rest = false) {
    const sk: string = await this.loadData("apiSK");

    if (!sk || rest) {
      return new Promise<string | undefined>((r) => {
        const dialog = new Dialog({
          title: "输入 sk",
          content: `<div class="b3-dialog__content">
           你对<a href="https://afdian.net/@llej0">崮生的爱发电</a>订单号可以作为 sk 填入下方
            <input class="b3-text-field fn__block" value="" placeholder="请在这里输入 sk">
            <div class="b3-dialog__action">
              <button class="b3-button b3-button--text">confirm</button>
            </div>
          </div>
  `,
          width: "75%",
          destroyCallback: () => {
            const sk = dialog.element.querySelector("input")?.value;
            r(sk);
            this.saveData("apiSK", sk);
          },
        });
        dialog.element.querySelector("button")?.addEventListener("click", () => dialog.destroy());
      });
    } else {
      return sk;
    }
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
        menu.addItem({
          label: "修改 sk",
          icon: `oceanpress_preview`,
          click: () => {
            this.apiSK(true);
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
    const oldBtn = widget.querySelector("." + this.btn_selector);
    oldBtn?.remove();
    const btn = document.createElement("div");
    this.unloadFn.push(() => btn.remove());

    btn.classList.add(this.btn_selector);
    btn.innerText = ICON;
    btn.title = `点击保存当前挂件为图片供OceanPress使用,图标为灰色表示尚未保存过此挂件`;
    widget.appendChild(btn);
    btn.onclick = () => {
      btn.innerText = "🔄️";
      saveWidgetImg(widget as HTMLElement).then(() => {
        btn.innerText = ICON;
      });
    };
  }
  previewCurrentPage() {}
}

async function saveWidgetImg(widgetDom: HTMLElement) {
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

async function imageToBase64(url: string) {
  var img = new Image();
  return new Promise<string>((r, rj) => {
    // 设置图像的src属性
    img.src = url;
    // 加载图像完成后执行回调
    img.onload = function () {
      // 创建一个canvas元素
      var canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      // 将图像绘制到canvas上
      var ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // 导出canvas为Base64编码的图像数据
      var dataUrl = canvas.toDataURL("image/png"); // 你可以根据需要选择不同的MIME类型，例如'image/jpeg'
      r(dataUrl);
    };
    img.onerror = rj;
  });
}
