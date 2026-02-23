import { siyuan as siyuanUtil } from '@llej/js_util';
import { Dialog, Menu, showMessage } from 'siyuan';
import { sql } from '~/libs/api';
import { SiyuanPlugin } from '~/libs/siyuanPlugin';
import { ocr, ocr_enabled_Error, umiOcrEnabled } from '../libs/ocr/ocr';
import { UTIF } from '../libs/UTIF';
import { HEIC } from '../libs/HEIC';
import { ICON, iconSVG, oceanpress_ui_flag } from './const';
import './index.css';
import { refMedia } from './refMedia';
import Setting_view from './ui/setting_view.vue';
import { queryInDocuments } from '~/libs/domUtil';

/** 为了当 index.html 改变时触发 watch 编译 */
import { ref } from 'vue';
import indexHTML from './oceanpress_ui/index.html?raw';
import Img_ocr_text from './ui/img_ocr_text.vue';
indexHTML;
// TODO 无效 ocr 资源清理
// ocr 时 图标旋转
// 识别失败的设置指定 ocr 文本
// vitePlugin.setViteUrl("http://localhost:5173/src/oceanpress-siyuan-plugin/index.ts")
export default class OceanPress extends SiyuanPlugin {
  ocrConfig = siyuanUtil.bindData({
    that: this,
    initValue: {
      type: 'oceanpress' as 'oceanpress' | 'umi-ocr',
      sk: '',
      umiApi: '',
    },
    storageName: 'ocrConfig.json',
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
    refMedia.load();
    this.addUnloadFn(() => refMedia.unLoad());
    const id = setInterval(() => {
      // 为挂件添加 oceanpress 转化图标  暂时取消此功能，之后优化为通用实现（支持挂件以及其他插件添加的元素等等）
      // document.body.querySelectorAll(`div[data-type="NodeWidget"]`).forEach((widget) => {
      //   if (widget instanceof HTMLElement) {
      //     this.addVueUiComponent(widget, () => <Widget_btn widget={widget} />);
      //   }
      // });

      // ocr 文本显示
      queryInDocuments<HTMLImageElement>(`img[data-src]`).forEach(async (img) => {
        this.addVueUi(img.parentElement!, Img_ocr_text, {
          data: async () => {
            const path = img.dataset.src!.replace('/', '_');
            // TODO 对于在线图片暂时不处理
            if (path.startsWith('http')) {
              return [];
            }
            const storageName = `ocr_${path}.json`;
            const data = (await this.loadData(storageName))?.words_result;
            return data;
          },
          imgEL: img || [],
        });
      });
      // 替换 tif 资源链接为图片链接
      queryInDocuments<HTMLElement>('span[data-type="a"][data-href$=".tif"]')
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
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlString;
          var domElement = tempDiv.firstChild!;

          span.parentNode!.replaceChild(domElement, span);
          console.log('替换tif为img', href, name, domElement);
          setTimeout(() => {}, 300);
        });

      // 替换 HEIC 资源链接为图片链接
      ['heic', 'heif'].forEach(ext => {
        queryInDocuments<HTMLElement>(`span[data-type="a"][data-href$=".${ext}"]`)
          .forEach(async (span) => {
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
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            var domElement = tempDiv.firstChild!;

            span.parentNode!.replaceChild(domElement, span);
            console.log(`替换${ext}为img`, href, name, domElement);

            // 立即处理新创建的图片，避免定时器重复处理
            setTimeout(() => {
              const newImg = (domElement as HTMLElement).querySelector('img[data-src]') as HTMLImageElement;
              if (newImg && !newImg.src.startsWith('data:')) {
                HEIC.processImage(newImg);
              }
            }, 500);
          });
      });
      // 处理 TIF 图片
      const imgTifEl = [
        ...queryInDocuments<HTMLImageElement>('img[data-src$=".tif"]'),
      ].filter((el) => !el.src.startsWith('data:'));

      if (imgTifEl.length > 0) {
        console.log('[imgTifEl]', imgTifEl);
        // @ts-ignore
        UTIF.replaceIMG();
      }

      // 处理 HEIC 格式图片
      const imgHeicEl = [
        ...queryInDocuments<HTMLImageElement>('img[data-src$=".heic"]'),
        ...queryInDocuments<HTMLImageElement>('img[data-src$=".heif"]'),
      ].filter((el) => !el.src.startsWith('data:'));

      if (imgHeicEl.length > 0) {
        HEIC.replaceIMG();
      }
    }, 1000);
    this.addUnloadFn(() => clearInterval(id));

    // ocr 图片菜单按钮
    this.eventBus.on('open-menu-image', (event) => {
      (globalThis.window.siyuan.menus.menu as Menu).addItem({
        label: 'OceanPress Ocr',
        iconHTML: ICON,
        click: async () => {
          const spanImg = event.detail.element as HTMLElement;
          const img = spanImg.querySelector(`img[data-src]`) as HTMLImageElement;
          const imgSrc = img.dataset.src!;
          const ok = await this.ocrAssetsUrl(imgSrc);
          if (ok) {
            showMessage(`OceanPress ocr 成功`);
            // 移除ui组件，定时循环就会自动添加一个新的，能够重新加载一遍 json 数据
            spanImg.querySelector('.' + oceanpress_ui_flag)?.remove();
          } else {
            showMessage(`OceanPress ocr 失败`);
          }
        },
      });
    });
  }
  async ocrAssetsUrl(imgSrc: string) {
    const name = imgSrc.split('/').pop()!;
    const base64 = await imageToBase64(imgSrc);
    const storageName = ocrStorageName(imgSrc);

    const ok = await this.ocrConfIsOK();

    if (!ok) return;

    const ocrConf = this.ocrConfig.value();
    const jobStatus = await ocr({
      name: name || 'test.png',
      imgBase64: base64,
      type: 'umi-ocr',
      umiApi: ocrConf.umiApi,
      // 防止下面的逻辑因为 throw 无法执行
    }).catch((e) => {
      if (e instanceof ocr_enabled_Error) {
        throw e;
      }
      return { words_result: undefined };
    });
    if (jobStatus?.words_result) {
      this.saveData(storageName, jobStatus);
      fetch('/api/asset/setImageOCRText', {
        body: JSON.stringify({
          path: imgSrc,
          text: jobStatus.words_result.map((el) => el.words).join(''),
        }),
        method: 'POST',
      });
      return true;
    } else {
      this.saveData(storageName, {});
      return false;
    }
  }
  async batchOcr(options: { type: 'failing' | 'all' }) {
    const ocrConfig = this.ocrConfig.value();
    console.log('[ocrConfig]', ocrConfig);
    if (ocrConfig.type === 'umi-ocr') {
      const umiEnable = await umiOcrEnabled(ocrConfig.umiApi);
      if (!umiEnable) {
        return;
      }
    }
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
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 5;
    showMessage(`可以打开开发者工具查看进度`);
    let msg = '';
    for (const img of assets) {
      i += 1;
      let ok = false;
      const imgSrc = img.path;
      const storageName = ocrStorageName(imgSrc);
      const r = await this.loadData(storageName);
      if (options.type === 'all' && r) {
        // 识别所有无 ocr 的图片时，跳过具有本地 ocr 数据的图片
        skip.push(imgSrc);
      } else if (options.type === 'failing' && r.words_result) {
        // 跳过识别结果中有 words_result 的图片
        skip.push(imgSrc);
      } else {
        try {
          ok = (await this.ocrAssetsUrl(imgSrc)) ?? false;
        } catch (error) {
          ok = false;
          if (error instanceof ocr_enabled_Error) {
            console.log(`退出批量 ocr 识别`, error);
            showMessage(`已退出批量 ocr 识别`);
            return;
          }
          console.log('[ocr error]', error);
        }
        if (ok) {
          successful.push(imgSrc);
          consecutiveFailures = 0; // 重置失败计数器
        } else {
          failing.push(imgSrc);
          consecutiveFailures++; // 增加失败计数器
          console.log('失败', imgSrc);

          // 检查是否达到连续失败阈值
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            const errorMsg = `OCR 接口连续失败 ${MAX_CONSECUTIVE_FAILURES} 次，已停止批量OCR处理。\n建议检查网络连接或OCR服务状态后重试。`;
            console.error(errorMsg);
            showMessage(errorMsg, 10_000, 'error');
            return;
          }
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
    showMessage(msg, 999_000000, 'info');
  }
  async ocrConfIsOK() {
    const ocrConf = this.ocrConfig.value();
    if (ocrConf.umiApi) {
      return true;
    } else {
      showMessage('请先填写 Umi-OCR API 配置');
      this.settingView();
      return false;
    }
  }
  async settingView() {
    const dialog = new Dialog({
      content: `<div class="b3-dialog__content"></div>`,
    });
    const div = dialog.element.querySelector('.b3-dialog__content')! as HTMLElement;
    const dataSignal = ref(this.ocrConfig.value());
    this.addVueUi(div, Setting_view, {
      dialog,
      dataSignal,
      save: () => {
        this.ocrConfig.set(dataSignal.value);
      },
    });
  }
  async showOceanPressUI() {
    const dialog = new Dialog({
      content: `<div class="b3-dialog__content"></div>`,
    });
    const div = dialog.element.querySelector('.b3-dialog__content')!;
    const iframe = document.createElement('iframe');
    const src = `/plugins/oceanpress-siyuan-plugin/oceanpress_ui/?model=siyuan_plugin&date=${Date.now()}`;
    iframe.src = src;
    iframe.style.borderWidth = '0';
    iframe.style.width = '80vw';
    iframe.style.maxWidth = '600px';
    iframe.style.height = '80vh';

    div.appendChild(iframe);
  }
  async onLayoutReady() {
    this.addIcons(`<symbol id="oceanpress_preview">
    <text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle" font-size="13px">👀</text>
  </symbol>`);
    this.addTopBar({
      icon: iconSVG,
      title: 'OceanPress',
      callback: (event) => {
        const menu = new Menu(this.name);
        menu.addItem({
          label: '打开OceanPress界面',
          icon: `oceanpress_preview`,
          click: () => this.showOceanPressUI(),
        });
        menu.addItem({
          label: '修改 ocr 配置',
          icon: `oceanpress_preview`,
          click: () => this.settingView(),
        });
        menu.addItem({
          label: '识别所有无 ocr 数据的图片',
          icon: `oceanpress_preview`,
          click: () => this.batchOcr({ type: 'all' }),
        });
        menu.addItem({
          label: '再次识别所有识别失败的图片',
          icon: `oceanpress_preview`,
          click: () => this.batchOcr({ type: 'failing' }),
        });
        menu.open(event);
      },
    });
  }

  previewCurrentPage() {}
}

function ocrStorageName(imgSrc: string) {
  const path = imgSrc.replace(/[:\/?#\*|<>"%]+/g, '_');
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
      var canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      // 将图像绘制到canvas上
      var ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // 导出canvas为Base64编码的图像数据
      var dataUrl = canvas.toDataURL('image/png'); // 你可以根据需要选择不同的MIME类型，例如'image/jpeg'
      r(dataUrl);
    };
    img.onerror = rj;
  });
}
