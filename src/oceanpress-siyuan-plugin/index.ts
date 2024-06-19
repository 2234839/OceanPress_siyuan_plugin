import { Dialog, Menu, Plugin, showMessage } from "siyuan";
import { ICON, iconSVG, oceanpress_ui_flag } from "./const";
import "./index.css";
import { ocr } from "../libs/ocr/ocr";
import { img_ocr_text } from "./ui/img_ocr_text";
import { widget_btn } from "./ui/widget_btn";
import { render } from "solid-js/web";
import { UTIF } from "../libs/UTIF";
import { setting_view } from "./ui/setting_view";
import type { JSX } from "solid-js/jsx-runtime";
import { siyuan as siyuanUtil } from "@llej/js_util";
import { createSignal } from "solid-js";

export default class OceanPress extends Plugin {
  ocrConfig = siyuanUtil.bindData({
    that: this,
    initValue: {
      type: "oceanpress" as "oceanpress" | "umi-ocr",
      sk: "",
      umiApi: "",
    },
    storageName: "ocrConfig.json",
  });
  async onload() {
    // 移动端 debug
    //     eval(`
    //       var script = document.createElement('script');
    // script.src = 'https://unpkg.com/vconsole@latest/dist/vconsole.min.js';
    // script.onload = function () {
    //     if (window.VConsole) {
    //         var vConsole = new window.VConsole();
    //         console.log(vConsole)
    //     }
    // };
    // document.head.appendChild(script);
    //       `);
    // 定时遍历新元素

    const id = setInterval(() => {
      // 为挂件添加 oceanpress 转化图标
      document.body.querySelectorAll(`div[data-type="NodeWidget"]`).forEach((widget) => {
        if (widget instanceof HTMLElement) {
          this.addUiComponent(widget, () => widget_btn({ widget: widget }));
        }
      });
      // ocr 文本显示
      document.body.querySelectorAll<HTMLImageElement>(`img[data-src]`).forEach(async (img) => {
        this.addUiComponent(img.parentElement!, () =>
          img_ocr_text({
            data: async () => {
              const path = img.dataset.src!.replace("/", "_");
              const storageName = `ocr_${path}.json`;
              const data = (await this.loadData(storageName))?.words_result;
              return data;
            },
            imgEL: img || [],
          }),
        );
      });
      // 替换 tif 资源链接为图片链接
      document
        .querySelectorAll<HTMLElement>('span[data-type="a"][data-href$=".tif"]')
        .forEach((span) => {
          const href = span.dataset.href;
          const name = span.textContent;

          var htmlString = `<span contenteditable="false" data-type="img"
        class="img"><span> </span><span><span class="protyle-action protyle-icons"><span
                    class="protyle-icon protyle-icon--only"><svg class="svg">
                        <use xlink:href="#iconMore"></use>
                    </svg></span></span><img src="${href}"
                data-src="${href}" alt="image"><span
                class="protyle-action__drag"></span><span class="protyle-action__title"></span></span><span>
        </span></span>`;
          var tempDiv = document.createElement("div");
          tempDiv.innerHTML = htmlString;
          var domElement = tempDiv.firstChild!;

          span.parentNode!.replaceChild(domElement, span);
          console.log("替换tif为img", href, name, domElement);
          setTimeout(() => {}, 300);
        });
      const imgTifEl = [
        ...document.querySelectorAll<HTMLImageElement>('img[data-src$=".tif"]'),
      ].filter((el) => !el.src.startsWith("data:"));

      if (imgTifEl.length > 0) {
        console.log("[imgTifEl]", imgTifEl);
        // @ts-ignore
        UTIF.replaceIMG();
      }
    }, 1000);
    this.unloadFn.push(() => clearInterval(id));

    // ocr 图片菜单按钮
    this.eventBus.on("open-menu-image", (event) => {
      setTimeout(() => {
        // 阻止 思源自身关闭菜单时的ocr TODO 应该要修改思源的 ocr 触发方式
        globalThis.window.siyuan.menus.menu.removeCB = () => {};
      }, 50);

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

          const ok = await this.ocrConfIsOK();

          if (!ok) return;

          const jobStatus = await ocr({
            name: name || "test.png",
            imgBase64: base64,
            ...this.ocrConfig.value(),
          });
          if (jobStatus?.words_result) {
            this.saveData(storageName, jobStatus);
            fetch("/api/asset/setImageOCRText", {
              body: JSON.stringify({
                path: imgSrc,
                text: jobStatus.words_result.map((el) => el.words).join(" "),
              }),
              method: "POST",
            });
            // 移除ui组件，定时循环就会自动添加一个新的，能够重新加载一遍 json 数据
            spanImg.querySelector("." + oceanpress_ui_flag)?.remove();
            showMessage(`OceanPress ocr 成功`);
          } else {
            showMessage(`OceanPress ocr 失败`);
          }
        },
      });
    });
  }
  async ocrConfIsOK() {
    const ocrConf = this.ocrConfig.value();
    if (ocrConf.type === "oceanpress" && ocrConf.sk) {
    } else if (ocrConf.type === "oceanpress" && ocrConf.sk) {
    } else {
      showMessage("请先填写 ocr 配置");
      this.settingView();
      return false;
    }
    return true;
  }
  async settingView() {
    const dialog = new Dialog({
      content: `<div class="b3-dialog__content"></div>`,
    });
    const div = dialog.element.querySelector(".b3-dialog__content")!;
    const dataSignal = createSignal(this.ocrConfig.value());
    render(
      () =>
        setting_view({
          dialog,
          dataSignal,
          save: () => {
            this.ocrConfig.set(dataSignal[0]());
          },
        }),
      div,
    );
    // render(h(setting_view, { dialog }), dialog.element.querySelector(".b3-dialog__content")!);
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
          label: "修改 ocr 配置",
          icon: `oceanpress_preview`,
          click: () => this.settingView(),
        });
        menu.open(event);
      },
    });
    // this.addCommand({
    //   hotkey: "",
    //   langKey: "预览当前页面",
    //   langText: "预览当前页面",
    // });
  }

  unloadFn: (() => void)[] = [];
  async onunload() {
    this.unloadFn.forEach((fn) => fn());
  }

  // 如果 ui 组件已添加，就不会重复添加
  async addUiComponent(parentEL: HTMLElement, jsxEl: () => JSX.Element) {
    // 因为思源会修改dom，导致添加在文档里的元素消失，所以这里检测是否需要重新添加
    if (parentEL.querySelector("." + oceanpress_ui_flag)) return;

    const div = document.createElement("div");
    const dispose = render(jsxEl, parentEL);
    this.unloadFn.push(() => (div.remove(), dispose()));
    parentEL.appendChild(div);
  }
  previewCurrentPage() {}
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
