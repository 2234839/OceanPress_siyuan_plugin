import { siyuan } from '@llej/js_util';
import { Dialog, Menu } from 'siyuan';
import { ref } from 'vue';
import { getBlockKramdown, pushErrMsg, pushMsg, updateBlock, upload } from '~/libs/api';
import { ialToJson } from '~/libs/siyuan_util';
import { SiyuanPlugin } from '~/libs/siyuanPlugin';
import Setting_view from './setting_view.vue';
import { proxy as xhrProxy } from 'ajax-hook';
import imageCompression from 'browser-image-compression';
// @ts-ignore
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;
type searchTagRes = {
  code: 0;
  msg: '';
  data: {
    k: '';
    tags: string[];
  };
};

// 重写全局 fetch 函数来使用拦截器系统
const originalFetch = globalThis.fetch;
export default class ToolKitPlugin extends SiyuanPlugin {
  tagSort = siyuan.bindData({
    initValue: {} as { [key: string]: number },
    that: this,
    storageName: 'tagSort.json',
  });
  toolkit_setting = siyuan.bindData({
    initValue: {
      autoCompress: false,
      tag_sort_reverse: false,
      image_compression_quality: 0.8,
      image_skip_webp: true,
      image_skip_small: true,
      image_min_size: 102400, // 100KB
      image_max_dimension: 4096,
    },
    that: this,
    storageName: 'toolkit_setting.json',
  });
  private fetchInterceptors: Array<
    (...args: Parameters<typeof fetch>) => Promise<Response | undefined>
  > = [];
  onload(): void {
    // @ts-ignore
    globalThis['ToolKitPlugin'] = this;
    this.addUnloadFn(() => {
      // @ts-ignore
      globalThis['ToolKitPlugin'] = undefined;
    });

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      return this.applyFetchInterceptors(input, init);
    };

    // 取消拦截
    this.addUnloadFn(() => {
      globalThis.fetch = originalFetch;
    });

    this.fn_tagSort();
    this.setupImageCompressInterceptor();
    this.addCommand({
      hotkey: '',
      langKey: `conflicted Comparison`,
      langText: `conflicted Comparison`,
      callback: () => {
        this.fn_conflictedComparison();
      },
    });
    this.addCommand({
      hotkey: '',
      langKey: `Image Compress Settings`,
      langText: `Image Compress Settings`,
      callback: () => {
        this.showSettings();
      },
    });
    // 添加图标
    this.addIcons(`<symbol id="toolkit_settings" viewBox="0 0 24 24">
      <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
    </symbol>
    <symbol id="toolkit_compress" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9Z"/>
    </symbol>
    <symbol id="toolkit_tag" viewBox="0 0 24 24">
      <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.22-1.06-.59-1.42M5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4S7 4.67 7 5.5S6.33 7 5.5 7Z"/>
    </symbol>
    <symbol id="toolkit_compare" viewBox="0 0 24 24">
      <path d="M10 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5v2h2V1h-2v2zm0 15H5V5h5v13zm9-15h-5v2h5v13h-5v2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
    </symbol>`);

    this.addTopBar({
      icon: `<svg><text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle" font-size="13px">⚙️</text></svg>`,
      title: '工具箱设置',
      callback: (event) => {
        const menu = new Menu(this.name);
        menu.addItem({
          label: '打开设置界面',
          icon: `toolkit_settings`,
          click: () => this.showSettings(),
        });
        menu.addItem({
          label: '压缩当前笔记图片',
          icon: `toolkit_compress`,
          click: () => this.fn_compressImagesToWebP(),
        });
        menu.addItem({
          label: '冲突对比',
          icon: `toolkit_compare`,
          click: () => this.fn_conflictedComparison(),
        });
        menu.open(event);
      },
    });
  }

  addFetchInterceptor(
    interceptor: (...args: Parameters<typeof fetch>) => Promise<Response | undefined>,
  ) {
    this.fetchInterceptors.push(interceptor);
  }

  removeFetchInterceptor(
    interceptor: (...args: Parameters<typeof fetch>) => Promise<Response | undefined>,
  ) {
    const index = this.fetchInterceptors.indexOf(interceptor);
    if (index > -1) {
      this.fetchInterceptors.splice(index, 1);
    }
  }

  async applyFetchInterceptors(...args: Parameters<typeof fetch>): Promise<Response> {
    // 保存当前拦截器数组
    const interceptors = [...this.fetchInterceptors];

    // 第一阶段：请求拦截
    for (const interceptor of interceptors) {
      const result = await interceptor(...args);
      if (result) {
        // 拦截器处理了请求，直接返回结果
        return result;
      }
    }

    // 没有拦截器处理，使用原始 fetch
    return await originalFetch(...args);
  }

  setupImageCompressInterceptor() {
    // XHR 拦截器
    const { unProxy: unProxyXhr } = xhrProxy({
      onRequest: (config, handler) => {
        // 检查是否启用了自动压缩
        if (!this.toolkit_setting.value().autoCompress) {
          handler.next(config);
          return;
        }

        // 检查是否是 upload 请求
        if (!config.url?.includes('/upload')) {
          handler.next(config);
          return;
        }

        // 检查是否是 POST 请求且有文件数据
        if (config.method?.toUpperCase() !== 'POST' || !config.body) {
          handler.next(config);
          return;
        }

        // 检查是否是 FormData
        if (config.body instanceof FormData) {
          const formData = config.body;
          const newFormData = new FormData();
          let compressionPromises: Promise<void>[] = [];
          let hasCompressed = false;

          // 遍历所有表单数据
          for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
              // 检查是否为图片文件
              const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'];
              const isImage = imageExtensions.some((ext) => value.name.toLowerCase().endsWith(ext));
              const isWebp =
                value.name.toLowerCase().endsWith('.webp') || value.type.includes('webp');

              if (isImage) {
                // 检查是否跳过 WebP
                if (this.toolkit_setting.value().image_skip_webp && isWebp) {
                  newFormData.append(key, value);
                  continue;
                }

                // 检查是否跳过小文件
                if (
                  this.toolkit_setting.value().image_skip_small &&
                  value.size < this.toolkit_setting.value().image_min_size
                ) {
                  newFormData.append(key, value);
                  continue;
                }
                // 创建压缩 Promise
                const compressionPromise = this.compressImageToWebP(
                  value,
                  this.toolkit_setting.value().image_compression_quality,
                )
                  .then((compressedBlob) => {
                    if (compressedBlob) {
                      const compressedFile = new File(
                        [compressedBlob],
                        value.name.replace(/\.[^/.]+$/, '.webp'),
                        { type: 'image/webp' },
                      );
                      newFormData.append(key, compressedFile);
                      hasCompressed = true;
                      console.log(`已压缩图片 (XHR): ${value.name} -> ${compressedFile.name}`);
                    } else {
                      // 压缩失败，使用原文件
                      newFormData.append(key, value);
                    }
                  })
                  .catch((error) => {
                    console.error(`压缩图片失败 (XHR) ${value.name}:`, error);
                    // 压缩失败，使用原文件
                    newFormData.append(key, value);
                  });
                compressionPromises.push(compressionPromise);
              } else {
                // 不需要压缩的文件，直接添加
                newFormData.append(key, value);
              }
            } else {
              // 非文件数据，直接添加
              newFormData.append(key, value);
            }
          }

          // 等待所有压缩完成后继续请求
          Promise.all(compressionPromises)
            .then(() => {
              if (hasCompressed) {
                config.body = newFormData;
              }
              handler.next(config);
            })
            .catch((error) => {
              console.error('处理 XHR 图片压缩时出错:', error);
              handler.next(config);
            });
        } else {
          handler.next(config);
        }
      },
    });

    // 清理函数
    this.addUnloadFn(() => {
      unProxyXhr();
    });
  }

  showSettings() {
    const dialog = new Dialog({
      title: '工具箱设置',
      content: `<div class="b3-dialog__content"></div>`,
    });
    const div = dialog.element.querySelector('.b3-dialog__content')! as HTMLElement;
    const dataSignal = ref(this.toolkit_setting.value());
    this.addVueUi(div, Setting_view, {
      dialog,
      dataSignal,
      save: () => {
        this.toolkit_setting.set(dataSignal.value);
      },
    });
  }

  async fn_tagSort() {
    // 标签排序功能
    const tagSortInterceptor = async (
      ...args: Parameters<typeof fetch>
    ): Promise<Response | undefined> => {
      const [input] = args;

      // 检查是否是搜索标签的请求
      if (input !== '/api/search/searchTag') {
        return undefined; // 不是目标请求，继续原始请求
      }

      // 发送请求并处理响应
      const response = await originalFetch(...args);

      try {
        const json = (await response.clone().json()) as searchTagRes;
        json.data.tags = json.data.tags.sort((a, b) => {
          // todo 在搜索高亮的情况下等于 \u003cmark\u003eto\u003c/mark\u003edo
          const a_key = a.replace(/<mark>(.*?)<\/mark>/g, '$1');
          const b_key = b.replace(/<mark>(.*?)<\/mark>/g, '$1');
          return (this.tagSort.value()[b_key] ?? 0) - (this.tagSort.value()[a_key] ?? 0);
        });
        if (this.toolkit_setting.value().tag_sort_reverse) {
          json.data.tags.reverse();
        }
        const newRes = new Response(JSON.stringify(json), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return newRes;
      } catch (error) {
        console.error('处理标签排序响应时出错:', error);
        return response;
      }
    };

    this.addFetchInterceptor(tagSortInterceptor);

    // 清理函数
    this.addUnloadFn(() => {
      this.removeFetchInterceptor(tagSortInterceptor);
    });
    const onTagClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && e.target.classList.contains('b3-list-item__text')) {
        const tag = e.target.textContent ?? '';
        this.tagSort.set({
          ...this.tagSort.value(),
          [tag]: this.tagSort.value()[tag] ? this.tagSort.value()[tag] + 1 : 1,
        });
      }
    };
    document.addEventListener('click', onTagClick, { capture: true });
    this.addUnloadFn(() => {
      document.removeEventListener('click', onTagClick, { capture: true });
    });
  }
  async fn_conflictedComparison() {
    const [oldTab, newTab] = document.querySelectorAll(
      '.layout__center .protyle:not(.fn__none) .protyle-content',
    );

    const resizeEl = document.querySelector('.layout__center .layout__resize') as HTMLElement;
    resizeEl?.addEventListener('wheel', (event) => {
      oldTab.scrollTop += event.deltaY;
      newTab.scrollTop += event.deltaY;
    });
    if (oldTab === undefined || newTab === undefined) return;
    const oldAllNode = [...oldTab.querySelectorAll(`[data-node-id][updated]`)] as HTMLElement[];
    const newAllNode = [...newTab.querySelectorAll(`[data-node-id][updated]`)] as HTMLElement[];

    comparison(oldAllNode, newAllNode);
    comparison(newAllNode, oldAllNode);
    function comparison(oldNodes: HTMLElement[], newNodes: HTMLElement[]) {
      newNodes.forEach((el) => {
        const oldNode = oldNodes.find(
          (old) => old.getAttribute('updated') === el.getAttribute('updated'),
        );
        if (oldNode === undefined) {
          el.style.outline = '1px solid red';
        }
      });
    }
  }

  async fn_compressImagesToWebP() {
    try {
      const activeElement = document.querySelector('.protyle:not(.fn__none) .protyle-content');
      if (!activeElement) {
        pushErrMsg('请先打开一个笔记');
        return;
      }

      const documentElement = activeElement.querySelector('.protyle-title[data-node-id]');
      if (!documentElement) {
        pushErrMsg('无法获取当前笔记ID');
        return;
      }

      const blockId = documentElement.getAttribute('data-node-id');
      if (!blockId) {
        pushErrMsg('无法获取当前笔记ID');
        return;
      }

      const kramdownRes = await getBlockKramdown(blockId);
      if (!kramdownRes || !kramdownRes.kramdown) {
        pushErrMsg('无法获取笔记内容');
        return;
      }

      const kramdown = kramdownRes.kramdown;
      // 匹配所有图片（排除 webp 格式），并使用工具提取块ID
      const imageRegex = /!\[([^\]]*)\]\(([^)\s]+\.(png|jpg|jpeg|gif|bmp|svg))(?:\s+"([^"]*)")?\)/gi;
      const lines = kramdown.split('\n');

      let processedCount = 0;
      let skippedCount = 0;
      // console.log('[kramdow n]', kramdown);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matches = [...line.matchAll(imageRegex)];
        if (matches.length > 0) {
          // 查找当前行或下一行的块ID
          let blockIdForLine = null;

          // 检查当前行是否有块ID
          const currentLineIal = ialToJson(line);
          if (currentLineIal.id) {
            blockIdForLine = currentLineIal.id;
          } else {
            // 检查下一行是否有块ID
            if (i + 1 < lines.length) {
              const nextLineIal = ialToJson(lines[i + 1]);
              if (nextLineIal.id) {
                blockIdForLine = nextLineIal.id;
              }
            }
          }

          if (blockIdForLine) {
            // 先获取块的完整内容
            const blockKramdownRes = await getBlockKramdown(blockIdForLine);
            if (!blockKramdownRes || !blockKramdownRes.kramdown) {
              continue;
            }

            const blockContent = blockKramdownRes.kramdown;
            let updatedBlockContent = blockContent;
            let blockHasChanges = false;

            // 处理这一行的所有图片
            for (const match of matches) {
              try {
                const imgUrl = match[2];
                const response = await fetch(imgUrl);
                if (!response || !response.ok) {
                  skippedCount++;
                  continue;
                }
                // 获取图片数据
                const imageData = await response.arrayBuffer();

                const compressedImage = await this.compressImageToWebP(imageData, 0.8, imgUrl);
                if (compressedImage) {
                  const res = await upload(undefined, [compressedImage]);
                  const webpPath = Object.values(res.succMap)[0];
                  const oldImageMarkdown = `![${match[1]}](${match[2]})`;

                  // 提取原始标题属性（如果存在）
                  const title = match[4] ? ` "${match[4]}"` : '';

                  const newImageMarkdown = `![${match[1]}](${webpPath}${title})`;
                  updatedBlockContent = updatedBlockContent.replace(
                    oldImageMarkdown,
                    newImageMarkdown,
                  );
                  blockHasChanges = true;
                } else {
                  skippedCount++;
                }
              } catch (error) {
                skippedCount++;
                console.log('[error]', error);
              }
            }

            // 如果块有变化，更新块
            if (blockHasChanges) {
              console.log('压缩图片[updatedBlockContent]', {
                originalContent: blockContent,
                updatedBlockContent,
              });
              await updateBlock('markdown', updatedBlockContent, blockIdForLine);
              processedCount++;
            }
          }
        }
      }

      if (processedCount > 0) {
        let message = `成功压缩 ${processedCount} 个包含图片的块`;
        if (skippedCount > 0) {
          message += `，跳过 ${skippedCount} 个图片（可能是 WebP 格式或压缩失败）`;
        }
        pushMsg(message);
      } else {
        if (skippedCount > 0) {
          pushMsg(
            `没有成功压缩任何图片，跳过 ${skippedCount} 个图片（可能是 WebP 格式或压缩失败）`,
          );
        } else {
          pushMsg('当前笔记中没有找到可压缩的图片');
        }
      }
    } catch (error) {
      console.error('压缩图片时出错:', error);
      pushErrMsg('压缩图片时出错，请查看控制台');
    }
  }

  async compressImageToWebP(
    imageData: any,
    quality: number = 0.8,
    originalFileName?: string,
  ): Promise<File | null> {
    try {
      // 处理不同类型的图片数据
      let file: File;
      let fileName: string;

      if (typeof imageData === 'string') {
        if (imageData.startsWith('data:')) {
          // 将 dataURL 转换为 File
          const response = await fetch(imageData);
          const blob = await response.blob();
          fileName = originalFileName || 'image.webp';
          file = new File([blob], fileName, { type: blob.type });
        } else {
          // 假设是 base64 数据，添加适当的前缀
          const dataUrl = 'data:image/png;base64,' + imageData;
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          fileName = originalFileName || 'image.png';
          file = new File([blob], fileName, { type: blob.type });
        }
      } else if (imageData instanceof ArrayBuffer) {
        // 如果是 ArrayBuffer，转换为 File
        fileName = originalFileName || 'image.png';
        file = new File([imageData], fileName, { type: 'image/png' });
      } else if (imageData instanceof Blob) {
        // 如果是 Blob，转换为 File
        fileName = originalFileName || 'image';
        file = new File([imageData], fileName, { type: imageData.type });
      } else if (imageData instanceof File) {
        // 如果已经是 File，直接使用，但会重新创建文件以保持正确的文件名
        file = imageData;
      } else {
        return null;
      }

      // 从原始文件名获取基础名称（不含扩展名）
      const getBaseFileName = (fullName: string): string => {
        if (!fullName) return 'image';

        // 如果是URL，提取文件名部分
        if (fullName.startsWith('http://') || fullName.startsWith('https://')) {
          try {
            const url = new URL(fullName);
            const pathname = url.pathname;
            const filename = pathname.split('/').pop() || 'image';
            return filename.split('.')[0];
          } catch {
            return 'image';
          }
        }

        // 如果是普通文件名，去除扩展名
        return fullName.split('.')[0];
      };

      const baseName = getBaseFileName(originalFileName || file.name);
      const finalFileName = `${baseName}.webp`;
      // 使用 browser-image-compression 压缩图片
      const options = {
        useWebWorker: true,
        fileType: 'image/webp',
        quality: quality,
      };

      const compressedFile = await imageCompression(file, options);

      // 创建新文件，保持原始文件名（但改为webp扩展名）
      return new File([compressedFile], finalFileName, { type: 'image/webp' });
    } catch (error) {
      console.error('Image compression error:', error);
      return null;
    }
  }
}
