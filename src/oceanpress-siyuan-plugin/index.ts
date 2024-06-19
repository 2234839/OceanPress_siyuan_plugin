import { h, render } from "preact";
import { Dialog, Menu, Plugin, showMessage } from "siyuan";
import { ICON, iconSVG, oceanpress_ui_flag } from "./const";
import "./index.css";
import { ocr } from "../libs/ocr/ocr";
import { img_ocr_text } from "./ui/img_ocr_text";
import { widget_btn } from "./ui/widget_btn";

import { UTIF } from "../libs/UTIF";

export default class OceanPress extends Plugin {
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
    this.unloadFn.push(
      (() => {
        const id = setInterval(() => {
          // 为挂件添加 oceanpress 转化图标
          document.body.querySelectorAll(`div[data-type="NodeWidget"]`).forEach((widget) => {
            if (widget instanceof HTMLElement) {
              this.addUiComponent(widget, h(widget_btn, { widget: widget }));
            }
          });
          // ocr 文本显示
          document.body.querySelectorAll<HTMLImageElement>(`img[data-src]`).forEach((img) => {
            this.addUiComponent(
              img.parentElement!,
              h(img_ocr_text, {
                data: async () => {
                  const path = img.dataset.src!.replace("/", "_");
                  const storageName = `ocr_${path}.json`;
                  return (await this.loadData(storageName))?.words_result || [];
                },
                imgEL: img,
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

        return () => clearInterval(id);
      })(),
    );

    // ocr 功能
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
          const storeValue = await this.loadData(storageName);

          // TODO dev
          if (storeValue) {
            console.log(storeValue);
            fetch("/api/asset/setImageOCRText", {
              body: JSON.stringify({
                path: imgSrc,
                text: storeValue.words_result.map((el: any) => el.words).join(" "),
              }),
              method: "POST",
            });
            return;
          }

          const apiSK = await this.apiSK();

          if (!apiSK) return;

          const jobStatus = await ocr({
            name: name || "test.png",
            imgBase64: base64,
            apiSK,
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
            showMessage(`OceanPress ocr 成功`);
          } else {
            showMessage(`OceanPress ocr 失败`);
          }
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
            <input class="b3-text-field fn__block" value="" placeholder="请在这里输入 sk" value="${sk}">
            <div class="b3-dialog__action">
              <button class="b3-button b3-button--text">confirm</button>
            </div>
          </div>
  `,
          width: "75%",
          destroyCallback: () => {
            const sk = dialog.element.querySelector("input")?.value;
            r(sk);
            if (sk) {
              this.saveData("apiSK", sk);
            }
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

  async addUiComponent(parentEL: HTMLElement, vNode: any) {
    // 因为思源会修改dom，导致添加在文档里的元素消失，所以这里检测是否需要重新添加
    if (parentEL.querySelector("." + oceanpress_ui_flag)) return;

    const div = document.createElement("div");
    this.unloadFn.push(() => div.remove());

    render(vNode, div);
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
