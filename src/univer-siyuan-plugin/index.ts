import type { apiRpcData, apiRpcReply } from "~/libs/apiProxy";
import { SiyuanPlugin } from "~/libs/siyuanPlugin";
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;
import * as apis from "~/libs/api";
import { Menu } from "siyuan";
import { generateTimestamp, generateUniqueId } from "~/libs/js_util";
import type { checkId } from "./msg";
import pkg from "./plugin.json";
/**
 * 思源对插件文件不返回 Cache-Control，浏览器会按启发式缓存。入口页面地址带上版本号，
 * 每个版本地址唯一，避免插件更新后仍执行旧的入口脚本
 */
const ENTRY_VERSION_PARAM = `&v=${pkg.version}`;
export default class UniverPlugin extends SiyuanPlugin {
  onload(): void {
    this.eventBus.on("click-blockicon", (e) => {
      const menu = window.siyuan.menus.menu as Menu;
      menu.addItem({
        label: "univer:插入 sheet ",
        icon: ``,
        click: () => {
          const id = generateUniqueId();
          const updated = generateTimestamp();
          apis.insertBlock(
            "markdown",
            kramdownIframe({
              updated,
              id,
              src: `/plugins/univer-siyuan-plugin/univer.html?id=${id}&type=sheet${ENTRY_VERSION_PARAM}`,
            }),
            undefined,
            e.detail.blockElements[0]?.dataset.nodeId,
          );
        },
      });
    });
    this.protyleSlash.push({
      id: "univer-add-sheet",
      filter: ["excel", "sheet", "表格", "univer"],
      callback(protyle) {
        console.log("[protyle]", protyle);
        const id = generateUniqueId();
        const updated = generateTimestamp();
        protyle.insert(
          `<div data-node-id="${id}" data-type="NodeIFrame" class="iframe" updated="${updated}">\
<div class="iframe-content">\
<iframe sandbox="allow-forms allow-presentation allow-same-origin allow-scripts allow-modals allow-popups" src="/plugins/univer-siyuan-plugin/univer.html?id=${id}&amp;type=sheet&amp;v=${pkg.version}" data-src="" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 1028px; height: 438px;"></iframe><span class="protyle-action__drag" contenteditable="false"></span></div><div class="protyle-attr" contenteditable="false">&ZeroWidthSpace;</div></div>`,
          true,
          true,
        );
        // const id = generateUniqueId();
        // const updated = generateTimestamp();
        // apis.insertBlock(
        //   "markdown",
        //   kramdownIframe({
        //     updated,
        //     id,
        //     src: `/plugins/univer-siyuan-plugin/univer.html?id=${id}&type=sheet`,
        //   }),
        //   undefined,
        //   ,
        // );
      },
      html: `univer:sheet`,
    });
  }

  onLayoutReady(): void {
    // @ts-expect-error
    window["univerPlugin"] = this;
    const fn = async (ev: MessageEvent<apiRpcData | checkId>) => {
      const event = ev.data;
      // 检测复制粘贴等情况
      if (event.type === "llej-plugin-rpc-univer-check-id") {
        const iframeList = document.querySelectorAll<HTMLIFrameElement>(
          `iframe[src*="univer-siyuan-plugin/univer.html?id=${event.blockId}"]`,
        );
        for (const iframe of iframeList) {
          /** iframe 未必嵌在 NodeIFrame 块内（如被外部嵌入），找不到所属块就跳过，避免监听器抛错拖垮后续 RPC 应答 */
          const block = iframe.closest<HTMLDivElement>('[data-type="NodeIFrame"]');
          if (!block?.dataset.nodeId) continue;
          const blockId = block.dataset.nodeId;
          /**
           * 旧表格块的地址不带版本号，可能加载了浏览器缓存的旧入口页面。
           * 补上版本号触发一次重载；重载后的地址带版本号，不会再进入这里
           */
          if (!iframe.src.includes(`&v=${pkg.version}`)) {
            iframe.src = `${iframe.src}&v=${pkg.version}`;
            continue;
          }
          if (blockId !== event.blockId) {
            await new Promise((r) => setTimeout(r, 500));

            let newSrc = iframe.src.replace(
              `id=${event.blockId}`,
              `id=${blockId}&copy=${event.blockId}`,
            );
            if (newSrc.startsWith(location.origin)) {
              newSrc = newSrc.slice(location.origin.length);
            }

            await apis.updateBlock(
              "markdown",
              kramdownIframe({
                updated: generateTimestamp(),
                id: blockId,
                src: newSrc,
              }),
              blockId,
            );
          }
        }
      } else if (event.type === "llej-plugin-rpc") {
        const payload = event.payload;
        const iframeList = [
          ...document.querySelectorAll(
            `iframe[src*="univer-siyuan-plugin/univer.html?id=${payload.blockId}"]`,
          ),
        ] as HTMLIFrameElement[];
        let reply: apiRpcReply;
        try {
          //@ts-expect-error
          const res = await apis[payload.apiName](...payload.args);
          reply = {
            type: "llej-plugin-rpc-reply",
            msgID: event.msgID,
            payload: res,
          };
        } catch (error) {
          reply = {
            type: "llej-plugin-rpc-reply",
            msgID: event.msgID,
            payload: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
        iframeList.forEach((iframe) => {
          iframe.contentWindow?.postMessage(reply, "*");
        });
      }
    };
    window.addEventListener("message", fn);
  }
}

const kramdownIframe = (par: { updated: string; id: string; src: string }) => {
  return `<iframe sandbox="allow-forms allow-presentation allow-same-origin allow-scripts allow-modals allow-popups" src="${par.src}" data-src="" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 794px; height: 636px;"></iframe>

{: updated="${par.updated}" id="${par.id}"}`;
};
