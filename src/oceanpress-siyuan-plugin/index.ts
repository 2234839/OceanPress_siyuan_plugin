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
import { sql } from "~/libs/api";

// TODO 无效 ocr 资源清理
// ocr 时 图标旋转
// 识别失败的设置指定 ocr 文本

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
      (globalThis.window.siyuan.menus.menu as Menu).addItem({
        label: "OceanPress Ocr",
        iconHTML: ICON,
        click: async () => {
          const spanImg = event.detail.element as HTMLElement;
          const img = spanImg.querySelector(`img[data-src]`) as HTMLImageElement;
          const imgSrc = img.dataset.src!;
          const ok = await this.ocrAssetsUrl(imgSrc);
          if (ok) {
            showMessage(`OceanPress ocr 成功`);
            // 移除ui组件，定时循环就会自动添加一个新的，能够重新加载一遍 json 数据
            spanImg.querySelector("." + oceanpress_ui_flag)?.remove();
          } else {
            showMessage(`OceanPress ocr 失败`);
          }
        },
      });
    });
  }
  async ocrAssetsUrl(imgSrc: string) {
    const name = imgSrc.split("/").pop()!;
    const base64 = await imageToBase64(imgSrc);
    const storageName = ocrStorageName(imgSrc);

    const ok = await this.ocrConfIsOK();

    if (!ok) return;

    const jobStatus = await ocr({
      name: name || "test.png",
      imgBase64: base64,
      ...this.ocrConfig.value(),
      // 防止下面的逻辑因为 throw 无法执行
    }).catch((e) => ({ words_result: undefined }));
    if (jobStatus?.words_result) {
      this.saveData(storageName, jobStatus);
      fetch("/api/asset/setImageOCRText", {
        body: JSON.stringify({
          path: imgSrc,
          text: jobStatus.words_result.map((el) => el.words).join(""),
        }),
        method: "POST",
      });
      return true;
    } else {
      this.saveData(storageName, {});
      return false;
    }
  }
  async batchOcr(options: { type: "failing" | "all" }) {
    const assets: {
      block_id: string;
      box: string;
      docpath: string;
      hash: string;
      id: string;
      name: string;
      path: string;
      root_id: string;
      title: string;
    }[] = await sql(`SELECT * FROM assets
WHERE PATH LIKE '%.png'
   OR PATH LIKE '%.jpg'
   OR PATH LIKE '%.jpeg'
   OR PATH LIKE '%.gif'
   OR PATH LIKE '%.bmp'
LIMIT 99999`);
    let i = 0;
    let successful: string[] = [];
    let failing: string[] = [];
    let skip: string[] = [];
    showMessage(`可以打开开发者工具查看进度`);
    let msg = "";
    for (const img of assets) {
      i += 1;
      let ok = false;
      const imgSrc = img.path;
      const storageName = ocrStorageName(imgSrc);
      const r = await this.loadData(storageName);
      if (options.type === "all" && r) {
        // 识别所有无 ocr 的图片时，跳过具有本地 ocr 数据的图片
        skip.push(imgSrc);
      } else if (options.type === "failing" && r.words_result) {
        // 跳过识别结果中有 words_result 的图片
        skip.push(imgSrc);
      } else {
        try {
          ok = (await this.ocrAssetsUrl(imgSrc)) ?? false;
        } catch (error) {
          ok = false;
          console.log("[ocr error]", error);
        }
        if (ok) {
          successful.push(imgSrc);
        } else {
          failing.push(imgSrc);
          console.log("失败", imgSrc);
        }
      }
      msg = `总计:${assets.length} 进度 ${((i / assets.length) * 100).toFixed(2)} 成功识别:${
        successful.length
      } 失败:${failing.length} 跳过:${skip.length} `;
      console.log(msg);
    }

    if (failing.length) {
      console.log(`以下图片识别失败:`, failing);
    }
    showMessage(msg, 999_000000, "info");
  }
  async ocrConfIsOK() {
    const ocrConf = this.ocrConfig.value();
    if (ocrConf.type === "oceanpress" && ocrConf.sk) {
    } else if (ocrConf.type === "umi-ocr" && ocrConf.umiApi) {
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
        menu.addItem({
          label: "识别所有无 ocr 数据的图片",
          icon: `oceanpress_preview`,
          click: () => this.batchOcr({ type: "all" }),
        });
        menu.addItem({
          label: "再次识别所有识别失败的图片",
          icon: `oceanpress_preview`,
          click: () => this.batchOcr({ type: "failing" }),
        });
        menu.open(event);
      },
    });
  }

  unloadFn: (() => void)[] = [];
  async onunload() {
    console.log("[onunload]");

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

function ocrStorageName(imgSrc: string) {
  const path = imgSrc.replace("/", "_");
  return `ocr_${path}.json`;
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
