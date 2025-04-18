import type { apiRpcData, apiRpcReply } from "~/libs/apiProxy";
import { SiyuanPlugin } from "~/libs/siyuanPlugin";
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;
import * as apis from "~/libs/api";
import { Menu } from "siyuan";
import { generateTimestamp, generateUniqueId } from "~/libs/js_util";
import type { checkId } from "./msg";
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
              src: `/plugins/univer-siyuan-plugin/univer.html?id=${id}&type=sheet`,
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
<iframe sandbox="allow-forms allow-presentation allow-same-origin allow-scripts allow-modals allow-popups" src="/plugins/univer-siyuan-plugin/univer.html?id=${id}&amp;type=sheet" data-src="" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 1028px; height: 438px;"></iframe><span class="protyle-action__drag" contenteditable="false"></span></div><div class="protyle-attr" contenteditable="false">&ZeroWidthSpace;</div></div>`,
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
          const block = iframe.closest<HTMLDivElement>('[data-type="NodeIFrame"]')!;
          const blockId = block.dataset.nodeId!;
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
        //@ts-expect-error
        apis[payload.apiName](...payload.args).then((res) => {
          const reply: apiRpcReply = {
            type: "llej-plugin-rpc-reply",
            msgID: event.msgID,
            payload: res,
          };
          iframeList.forEach((iframe) => {
            iframe.contentWindow?.postMessage(reply, "*");
          });
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
