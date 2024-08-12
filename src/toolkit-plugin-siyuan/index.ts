import { siyuan } from "@llej/js_util";
import { SiyuanPlugin } from "~/libs/siyuanPlugin";
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;
type searchTagRes = {
  code: 0;
  msg: "";
  data: {
    k: "";
    tags: string[];
  };
};
export default class ToolKitPlugin extends SiyuanPlugin {
  tagSort = siyuan.bindData({
    initValue: {} as { [key: string]: number },
    that: this,
    storageName: "tagSort.json",
  });
  toolkit_setting = siyuan.bindData({
    initValue: { tag_sort_reverse: false },
    that: this,
    storageName: "toolkit_setting.json",
  });
  onload(): void {
    // @ts-ignore
    globalThis["ToolKitPlugin"] = this;
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const res = await oldFetch(input, init);
      if (input === "/api/search/searchTag") {
        const json = (await res.clone().json()) as searchTagRes;
        json.data.tags = json.data.tags.sort((a, b) => {
          // todo 在搜索高亮的情况下等于 \u003cmark\u003eto\u003c/mark\u003edo
          const a_key = a.replace(/<mark>(.*?)<\/mark>/g, "$1");
          const b_key = b.replace(/<mark>(.*?)<\/mark>/g, "$1");
          return (this.tagSort.value()[a_key] ?? 0) - (this.tagSort.value()[b_key] ?? 0);
        });
        if (!this.toolkit_setting.value().tag_sort_reverse) {
          json.data.tags.reverse();
        }
        const newRes = new Response(JSON.stringify(json), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
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
      if (e.target instanceof HTMLElement && e.target.classList.contains("b3-list-item__text")) {
        const tag = e.target.textContent ?? "";
        this.tagSort.set({
          ...this.tagSort.value(),
          [tag]: this.tagSort.value()[tag] ? this.tagSort.value()[tag] + 1 : 1,
        });
      }
    };
    document.addEventListener("click", onTagClick, { capture: true });
    this.addUnloadFn(() => {
      document.removeEventListener("click", onTagClick, { capture: true });
    });
  }
}
