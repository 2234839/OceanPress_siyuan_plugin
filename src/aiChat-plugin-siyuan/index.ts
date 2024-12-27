import { SiyuanPlugin } from "~/libs/siyuanPlugin";
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;
import { generateTimestamp, generateUniqueId } from "~/libs/js_util";
import chatAIView from "./ui.vue";
export default class VitePlugin extends SiyuanPlugin {
  //   async onload() {
  //     let whileIf = 1;
  //     this.addUnloadFn(() => {
  //       whileIf = 0;
  //     });
  //     while (whileIf) {
  //       await new Promise((r) => setTimeout(r, 3_000));
  //       const fetchTasks = await fetch("https://siyuan_ai.shenzilong.cn/api/client-rpc", {
  //         headers: {
  //           "content-type": "application/json",
  //         },
  //         referrer: "https://siyuan_ai.shenzilong.cn/apiProxy",
  //         body: JSON.stringify({
  //           method: "apiProxy.fetchTasks",
  //           data: SuperJson.serialize([{ userId: 1, token: "test_test_test", possessor: "test" }]),
  //         }),
  //         method: "POST",
  //       })
  //         .then((r) => r.json())
  //         .then((r) => {
  //           if (r.data) {
  //             r.data = SuperJson.deserialize(r.data);
  //           }
  //           return r as {
  //             success: true;
  //             data: {
  //               updatedCount: 0;
  //               message: "No tasks found to update.";
  //               tasks: { id: number; req: string }[];
  //             };
  //           };
  //         });
  //       if (fetchTasks.data.tasks.length === 0) continue;
  //       const resList = await Promise.all(
  //         fetchTasks.data.tasks.map(async (el) => {
  //           const reqObj = SuperJson.parse(el.req) as { url: string; data?: any };
  //           console.log("reqObj", reqObj, el);

  //           const res = await fetchSyncPost(reqObj.url, reqObj.data);
  //           return { id: el.id, res };
  //         }),
  //       );
  //       const processTasks = await fetch("https://siyuan_ai.shenzilong.cn/api/client-rpc", {
  //         headers: {
  //           "content-type": "application/json",
  //         },
  //         referrer: "https://siyuan_ai.shenzilong.cn/apiProxy",
  //         body: JSON.stringify({
  //           method: "apiProxy.processTasks",
  //           data: SuperJson.serialize([
  //             {
  //               userId: 1,
  //               token: "test_test_test",
  //               possessor: "test",
  //               tasks: resList,
  //             },
  //           ]),
  //         }),
  //         method: "POST",
  //       })
  //         .then((r) => r.json())
  //         .then((r) => {
  //           if (r.data) {
  //             r.data = SuperJson.deserialize(r.data);
  //           }
  //           return r as {
  //             success: true;
  //             data: {
  //               updatedCount: 0;
  //               message: "No tasks found to update.";
  //               tasks: [];
  //             };
  //           };
  //         });
  //       console.log("tasks", fetchTasks.data);
  //       console.log("processTasks", processTasks.data);
  //     }
  //   }
  async onload() {
    this.protyleSlash.push({
      id: "ai:chat",
      filter: ["ai", "chat", "gpt"],
      callback(protyle) {
        console.log("[protyle]", protyle);
        const id = generateUniqueId();
        const updated = generateTimestamp();
        protyle.insert(
          `<div data-node-id="${id}" custom-ai-chat="1" data-type="NodeParagraph" updated="${updated}"></div>`,
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
      html: `ai:chat`,
    });

    setInterval(() => {
      document.querySelectorAll<HTMLElement>(`[custom-ai-chat]`).forEach((el) => {
        el.firstElementChild!.removeAttribute("contenteditable");
        this.addVueUiComponent(el.firstElementChild! as HTMLElement, chatAIView);
      });
    }, 500);
  }
}
