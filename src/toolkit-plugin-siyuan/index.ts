import { siyuan } from '@llej/js_util';
import { Dialog, Menu, showMessage } from 'siyuan';
import { ref } from 'vue';
import { getBlockKramdown, updateBlock, upload } from '~/libs/api';
import { ialToJson } from '~/libs/siyuan_util';
import { SiyuanPlugin } from '~/libs/siyuanPlugin';
import Setting_view from './setting_view.vue';
import { proxy as xhrProxy } from 'ajax-hook';
import { compressImageToWebP, smartCompressImage } from '~/libs/imageCompression';
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
      enable_smart_compression: false, // 是否启用智能压缩
      target_similarity: 99, // 目标相似度百分比
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
    this.setupImageMenu();
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
              const imageExtensions = ['.png', '.jpg', '.jpeg', '.bmp', '.svg'];
              const isImage = imageExtensions.some((ext) => value.name.toLowerCase().endsWith(ext));

              // 检查是否为视频文件，排除视频格式
              const isVideo = this.isVideoFile(value.name);

              if (isImage && !isVideo) {
                // 检查是否应该跳过压缩
                const skipCheck = this.shouldSkipCompression(value);
                if (skipCheck.skip) {
                  if (skipCheck.reason === 'Excalidraw 插件资源') {
                    showMessage(`跳过 Excalidraw 插件资源: ${value.name}`);
                  }
                  newFormData.append(key, value);
                  continue;
                }

                // 创建压缩 Promise
                const originalPreview = URL.createObjectURL(value);
                const compressionPromise = this.compressImageWithSettings(value, originalPreview)
                  .then((result) => {
                    if (result) {
                      newFormData.append(key, result.file);
                      hasCompressed = true;
                    } else {
                      // 压缩被跳过或失败，使用原文件
                      newFormData.append(key, value);
                    }
                  })
                  .catch((error) => {
                    URL.revokeObjectURL(originalPreview);
                    console.error(`压缩图片失败 (XHR) ${value.name}:`, error);
                    // 压缩失败，使用原文件
                    newFormData.append(key, value);
                  })
                  .finally(() => {
                    // 确保释放 URL（智能压缩会自己释放，但这里作为保险）
                    if (!this.toolkit_setting.value().enable_smart_compression) {
                      URL.revokeObjectURL(originalPreview);
                    }
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
        showMessage('请先打开一个笔记');
        return;
      }

      const documentElement = activeElement.querySelector('.protyle-title[data-node-id]');
      if (!documentElement) {
        showMessage('无法获取当前笔记ID');
        return;
      }

      const blockId = documentElement.getAttribute('data-node-id');
      if (!blockId) {
        showMessage('无法获取当前笔记ID');
        return;
      }

      const kramdownRes = await getBlockKramdown(blockId);
      if (!kramdownRes || !kramdownRes.kramdown) {
        showMessage('无法获取笔记内容');
        return;
      }

      const kramdown = kramdownRes.kramdown;
      // 匹配所有图片（排除 webp 和 gif 格式），并使用工具提取块ID
      const imageRegex =
        /!\[([^\]]*)\]\(([^)\s]+\.(png|jpg|jpeg|bmp|svg))(?:\s+"([^"]*)")?\)/gi;

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

                // 检查是否为视频文件，排除视频格式
                if (this.isVideoFile(imgUrl)) {
                  skippedCount++;
                  continue;
                }

                const response = await fetch(imgUrl);
                if (!response || !response.ok) {
                  skippedCount++;
                  continue;
                }
                // 获取图片数据
                const imageData = await response.arrayBuffer();
                const file = new File([imageData], imgUrl.split('/').pop() || 'image.png', { type: 'image/png' });

                // 检查是否应该跳过压缩
                const skipCheck = this.shouldSkipCompression(file, imgUrl);
                if (skipCheck.skip) {
                  skippedCount++;
                  if (skipCheck.reason === 'Excalidraw 插件资源') {
                    console.log(`跳过 Excalidraw 插件资源: ${imgUrl}`);
                  }
                  continue;
                }

                // 创建预览 URL 用于智能压缩
                const originalPreview = URL.createObjectURL(file);
                const compressResult = await this.compressImageWithSettings(file, originalPreview);

                if (compressResult) {
                  const res = await upload(undefined, [compressResult.file]);
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
        showMessage(message);
      } else {
        if (skippedCount > 0) {
          showMessage(
            `没有成功压缩任何图片，跳过 ${skippedCount} 个图片（可能是 WebP 格式或压缩失败）`,
          );
        } else {
          showMessage('当前笔记中没有找到可压缩的图片');
        }
      }
    } catch (error) {
      console.error('压缩图片时出错:', error);
      showMessage('压缩图片时出错，请查看控制台', 3000, 'error');
    }
  }

  /** 视频文件扩展名列表 */
  private videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.ogv'];

  /**
   * 检查是否为视频文件
   * @param fileName 文件名
   * @returns 是否为视频文件
   */
  private isVideoFile(fileName: string): boolean {
    return this.videoExtensions.some(ext => fileName.toLowerCase().includes(ext));
  }

  /**
   * 检查是否应该跳过此图片的压缩
   * @param file 图片文件
   * @param imgUrl 图片 URL（可选，用于检查扩展名）
   * @returns 是否应该跳过压缩
   */
  private shouldSkipCompression(file: File, imgUrl?: string): { skip: boolean; reason?: string } {
    const settings = this.toolkit_setting.value();

    // 检查是否为 Excalidraw 插件资源
    const fileName = file.name.toLowerCase();
    const urlPath = imgUrl?.toLowerCase() || '';
    const isExcalidraw = fileName.startsWith('excalidraw-') || urlPath.includes('excalidraw-');

    if (isExcalidraw) {
      return { skip: true, reason: 'Excalidraw 插件资源' };
    }

    // 检查是否为 GIF 图片（GIF 压缩会变成静态图，需要跳过）
    const isGif =
      fileName.endsWith('.gif') ||
      file.type.includes('gif') ||
      (imgUrl && imgUrl.toLowerCase().includes('.gif'));

    if (isGif) {
      return { skip: true, reason: 'GIF 动图' };
    }

    // 检查是否为 WebP 图片
    const isWebp =
      file.name.toLowerCase().endsWith('.webp') ||
      file.type.includes('webp') ||
      (imgUrl && imgUrl.toLowerCase().includes('.webp'));

    if (settings.image_skip_webp && isWebp) {
      return { skip: true, reason: 'WebP 格式' };
    }

    // 检查文件大小
    if (settings.image_skip_small && file.size < settings.image_min_size) {
      return { skip: true, reason: '文件太小' };
    }

    return { skip: false };
  }

  /**
   * 统一的图片压缩方法
   * 根据配置决定使用普通压缩或智能压缩
   *
   * @param file 图片文件
   * @param originalPreview 原始图片预览 URL（智能压缩需要）
   * @returns 压缩后的图片文件
   */
  private async compressImageWithSettings(
    file: File,
    originalPreview?: string
  ): Promise<{ file: File; similarity?: number; roundTimes?: number[] } | null> {
    const settings = this.toolkit_setting.value();

    // 检查是否应该跳过
    const skipCheck = this.shouldSkipCompression(file);
    if (skipCheck.skip) {
      if (skipCheck.reason === 'Excalidraw 插件资源') {
        console.log(`跳过 ${skipCheck.reason}: ${file.name}`);
      }
      return null;
    }

    try {
      // 检查是否启用智能压缩
      if (settings.enable_smart_compression && originalPreview) {
        // 使用智能压缩
        const result = await this.smartCompressImage(
          file,
          originalPreview,
          settings.target_similarity,
          10
        );
        console.log(`[智能压缩] 已压缩图片: ${file.name} | ${(file.size / 1024).toFixed(1)}KB -> ${(result.file.size / 1024).toFixed(1)}KB (-${((file.size - result.file.size) / file.size * 100).toFixed(1)}%) | 相似度 ${result.similarity.toFixed(2)}% | 轮数 ${result.roundTimes.length}`);
        return {
          file: result.file,
          similarity: result.similarity,
          roundTimes: result.roundTimes,
        };
      } else {
        // 使用普通压缩
        const compressedFile = await this.compressImageToWebP(file, settings.image_compression_quality, file.name);
        if (compressedFile) {
          const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
          console.log(`[普通压缩] 已压缩图片: ${file.name} | ${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB (-${compressionRatio}%)`);
          return { file: compressedFile };
        }
        return null;
      }
    } catch (error) {
      console.error(`压缩图片失败 ${file.name}:`, error);
      return null;
    }
  }

  setupImageMenu() {
    // 图片压缩菜单按钮
    this.eventBus.on('open-menu-image', (event) => {
      (globalThis.window.siyuan.menus.menu as Menu).addItem({
        label: '压缩图片',
        icon: 'toolkit_compress',
        click: async () => {
          const spanImg = event.detail.element as HTMLElement;
          const img = spanImg.querySelector(`img[data-src]`) as HTMLImageElement;
          const imgSrc = img.dataset.src!;
          const result = await this.compressSingleImage(imgSrc, spanImg);
          if (result === true) {
            showMessage('图片压缩成功');
            // 移除UI组件，定时循环就会自动添加一个新的，能够重新加载一遍 json 数据
            spanImg.querySelector('.img__compress')?.remove();
          } else if (result === 'skipped') {
            // 已显示跳过原因，不需要额外提示
          } else {
            showMessage('图片压缩失败', 3000, 'error');
          }
        },
      });
    });
  }

  async compressSingleImage(imgSrc: string, imgElement?: HTMLElement): Promise<boolean | 'skipped'> {
    try {
      // 检查是否为视频文件，排除视频格式
      if (this.isVideoFile(imgSrc)) {
        showMessage('视频文件不支持压缩', 3000, 'error');
        return false;
      }

      const response = await fetch(imgSrc);
      if (!response || !response.ok) {
        console.error('无法获取图片:', imgSrc);
        return false;
      }

      // 获取图片数据
      const imageData = await response.arrayBuffer();
      const file = new File([imageData], imgSrc.split('/').pop() || 'image.png', { type: 'image/png' });

      // 检查是否应该跳过压缩
      const skipCheck = this.shouldSkipCompression(file, imgSrc);
      if (skipCheck.skip) {
        const message = `跳过压缩: ${skipCheck.reason || '未知原因'}`;
        showMessage(message);
        return 'skipped';
      }

      // 创建预览 URL 用于智能压缩
      const originalPreview = URL.createObjectURL(file);
      const compressResult = await this.compressImageWithSettings(file, originalPreview);

      if (compressResult) {
        // 上传压缩后的图片
        const uploadRes = await upload(undefined, [compressResult.file]);
        const webpPath = Object.values(uploadRes.succMap)[0];

        if (webpPath) {
          // 尝试找到图片所在的块
          let blockId: string | null = null;

          if (imgElement) {
            // 从图片元素向上查找最近的块
            const blockElement = imgElement.closest('[data-node-id]') as HTMLElement;
            if (blockElement) {
              blockId = blockElement.getAttribute('data-node-id');
              console.log('[compressSingleImage] 找到图片所在块:', blockId);
            } else {
              console.warn('[compressSingleImage] 无法从 imgElement 找到块元素');
            }
          }

          // 如果没找到，回退到文档级别的更新
          if (!blockId) {
            console.log('[compressSingleImage] 回退到文档级别更新');
            const activeElement = document.querySelector('.protyle:not(.fn__none) .protyle-content');
            if (activeElement) {
              const documentElement = activeElement.querySelector('.protyle-title[data-node-id]');
              if (documentElement) {
                blockId = documentElement.getAttribute('data-node-id');
                console.log('[compressSingleImage] 使用文档块ID:', blockId);
              }
            }
          }

          if (!blockId) {
            console.error('[compressSingleImage] 无法获取块ID');
            showMessage('无法获取笔记块ID', 3000, 'error');
            return false;
          }

          const kramdownRes = await getBlockKramdown(blockId);
          if (!kramdownRes || !kramdownRes.kramdown) {
            console.error('[compressSingleImage] 无法获取块内容:', blockId);
            showMessage('无法获取块内容', 3000, 'error');
            return false;
          }

          const kramdown = kramdownRes.kramdown;
          // 使用简单的字符串查找和替换，避免复杂的正则表达式
          // 查找图片链接的位置，替换 URL 部分，保留后面的所有内容（包括属性）
          const imgIndex = kramdown.indexOf(`](${imgSrc})`);
          if (imgIndex === -1) {
            // 尝试查找带引号的 title 格式：](url "title")
            const titleMatchIndex = kramdown.indexOf(`](${imgSrc} "`);
            if (titleMatchIndex === -1) {
              console.error('[compressSingleImage] 图片地址替换失败，未找到匹配项:', imgSrc);
              console.log('[compressSingleImage] 块内容:', kramdown);
              showMessage('图片地址替换失败', 3000, 'error');
              return false;
            }

            // 找到了带 title 的格式，提取 title 和后面的内容
            const beforeTitle = kramdown.substring(0, titleMatchIndex + 2); // ](
            const afterTitleStart = titleMatchIndex + 2 + imgSrc.length + 2; // ](<url> "
            const titleEndIndex = kramdown.indexOf('")', afterTitleStart);
            if (titleEndIndex === -1) {
              console.error('[compressSingleImage] 图片 title 格式错误');
              showMessage('图片地址替换失败', 3000, 'error');
              return false;
            }
            const title = kramdown.substring(afterTitleStart, titleEndIndex);
            const afterTitle = kramdown.substring(titleEndIndex + 2); // 保留 ") 后面的所有内容（包括属性）
            const updatedKramdown = beforeTitle + webpPath + ' "' + title + '")' + afterTitle;

            await updateBlock('markdown', updatedKramdown, blockId);
            // 等待一小段时间确保思源保存完成
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log('[compressSingleImage] 图片压缩成功:', imgSrc, '->', webpPath);
            return true;
          }

          // 简单格式：](url) 后面可能有属性 {: ...}
          // 找到 url 后面的 ) 位置
          const afterUrlStart = imgIndex + 2 + imgSrc.length;
          const closingParenIndex = kramdown.indexOf(')', afterUrlStart);
          if (closingParenIndex === -1) {
            console.error('[compressSingleImage] 图片 URL 格式错误');
            showMessage('图片地址替换失败', 3000, 'error');
            return false;
          }

          const beforeUrl = kramdown.substring(0, imgIndex + 2); // ](
          const afterUrl = kramdown.substring(closingParenIndex); // 保留 ) 后面的所有内容（包括属性）
          const updatedKramdown = beforeUrl + webpPath + afterUrl;

          await updateBlock('markdown', updatedKramdown, blockId);
          // 等待一小段时间确保思源保存完成
          await new Promise(resolve => setTimeout(resolve, 300));
          console.log('[compressSingleImage] 图片压缩成功:', imgSrc, '->', webpPath);
          return true;
        } else {
          console.error('[compressSingleImage] 上传图片失败，未返回路径');
          showMessage('上传图片失败', 3000, 'error');
        }
      }

      return false;
    } catch (error) {
      console.error('压缩单个图片时出错:', error);
      return false;
    }
  }

  // compressImageToWebP 方法已移至 ~/libs/imageCompression
  // 保留方法签名用于内部调用，实际使用导入的函数
  private compressImageToWebP = compressImageToWebP;
  private smartCompressImage = smartCompressImage;
}
