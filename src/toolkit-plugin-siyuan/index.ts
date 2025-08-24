import { siyuan } from '@llej/js_util';
import { SiyuanPlugin } from '~/libs/siyuanPlugin';
import { getBlockKramdown, updateBlock, pushMsg, pushErrMsg, upload } from '~/libs/api';
import { ialToJson } from '~/libs/siyuan_util';
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
export default class ToolKitPlugin extends SiyuanPlugin {
  tagSort = siyuan.bindData({
    initValue: {} as { [key: string]: number },
    that: this,
    storageName: 'tagSort.json',
  });
  toolkit_setting = siyuan.bindData({
    initValue: { tag_sort_reverse: false },
    that: this,
    storageName: 'toolkit_setting.json',
  });
  onload(): void {
    // @ts-ignore
    globalThis['ToolKitPlugin'] = this;
    this.addUnloadFn(() => {
      // @ts-ignore
      globalThis['ToolKitPlugin'] = undefined;
    });
    this.fn_tagSort();
    this.addCommand({
      hotkey: '',
      langKey: `conflicted Comparison`,
      langText: `conflicted Comparison`,
      callback: () => {
        this.fn_conflictedComparison();
      },
    });
    this.addTopBar({
      icon: `<svg><text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle" font-size="13px">🗜️</text></svg>`,
      title: '压缩笔记图片为WebP',
      callback: () => {
        this.fn_compressImagesToWebP();
      },
    });
  }
  async fn_tagSort() {
    // 标签排序功能
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const res = await oldFetch(input, init);
      if (input === '/api/search/searchTag') {
        const json = (await res.clone().json()) as searchTagRes;
        json.data.tags = json.data.tags.sort((a, b) => {
          // todo 在搜索高亮的情况下等于 \u003cmark\u003eto\u003c/mark\u003edo
          const a_key = a.replace(/<mark>(.*?)<\/mark>/g, '$1');
          const b_key = b.replace(/<mark>(.*?)<\/mark>/g, '$1');
          return (this.tagSort.value()[a_key] ?? 0) - (this.tagSort.value()[b_key] ?? 0);
        });
        if (!this.toolkit_setting.value().tag_sort_reverse) {
          json.data.tags.reverse();
        }
        const newRes = new Response(JSON.stringify(json), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return newRes;
      }
      return res;
    };
    this.addUnloadFn(() => {
      globalThis.fetch = oldFetch;
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
      const imageRegex = /!\[([^\]]*)\]\(([^)]+\.(png|jpg|jpeg|gif|bmp|svg))\)/gi;
      const lines = kramdown.split('\n');

      let processedCount = 0;
      let skippedCount = 0;

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
            let lineHasChanges = false;
            let updatedLine = line;

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

                const compressedImage = await this.compressImageToWebP(imageData);
                if (compressedImage) {
                  const res = await upload(undefined, [compressedImage]);
                  const webpPath = Object.values(res.succMap)[0];
                  const oldImageMarkdown = `![${match[1]}](${match[2]})`;
                  const newImageMarkdown = `![${match[1]}](${webpPath})`;
                  updatedLine = updatedLine.replace(oldImageMarkdown, newImageMarkdown);
                  lineHasChanges = true;
                } else {
                  skippedCount++;
                }
              } catch (error) {
                skippedCount++;
              }
            }

            // 如果这一行有变化，更新对应的块
            if (lineHasChanges) {
              // 获取块的完整内容
              const blockKramdownRes = await getBlockKramdown(blockIdForLine);
              if (blockKramdownRes && blockKramdownRes.kramdown) {
                const blockContent = blockKramdownRes.kramdown;
                const updatedBlockContent = blockContent.replace(line, updatedLine);
                await updateBlock('markdown', updatedBlockContent, blockIdForLine);
                processedCount++;
              }
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
          pushMsg(`没有成功压缩任何图片，跳过 ${skippedCount} 个图片（可能是 WebP 格式或压缩失败）`);
        } else {
          pushMsg('当前笔记中没有找到可压缩的图片');
        }
      }
    } catch (error) {
      console.error('压缩图片时出错:', error);
      pushErrMsg('压缩图片时出错，请查看控制台');
    }
  }


  async compressImageToWebP(imageData: any): Promise<Blob | null> {
    return new Promise((resolve) => {
      // 处理不同类型的图片数据
      let dataUrl: string;

      if (typeof imageData === 'string') {
        if (imageData.startsWith('data:')) {
          dataUrl = imageData;
        } else {
          // 假设是 base64 数据，添加适当的前缀
          dataUrl = 'data:image/png;base64,' + imageData;
        }
      } else if (imageData instanceof ArrayBuffer) {
        // 如果是 ArrayBuffer，转换为 base64
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData)));
        dataUrl = 'data:image/png;base64,' + base64;
      } else if (imageData instanceof Blob) {
        // 如果是 Blob，转换为 dataURL
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // 直接处理 dataURL，不再递归调用
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              resolve(null);
              return;
            }

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve(null);
                  return;
                }

                resolve(new File([blob], 'test.webp', { type: 'image/webp' }));
              },
              'image/webp',
              0.8,
            );
          };

          img.onerror = () => {
            resolve(null);
          };

          img.src = result;
        };
        reader.onerror = () => {
          resolve(null);
        };
        reader.readAsDataURL(imageData);
        return;
      } else {
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }

            resolve(new File([blob], 'test.webp', { type: 'image/webp' }));
          },
          'image/webp',
          0.8,
        );
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = dataUrl;
    });
  }
}
