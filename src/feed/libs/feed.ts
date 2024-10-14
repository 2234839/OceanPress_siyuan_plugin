import { fetchPost } from "siyuan";
import { FETCH_TIMEOUT, MAX_FEED_NUM, SUMMARY_LENGTH } from "./const";
import { get_av_map, sqlQuery, type attributes } from "./siyuan_api";

interface block {
  alias: "";
  box: "20210816161940-zo21go1";
  content: "科技爱好者周刊（第 281 期）：新基建的政策选择 https://www.ruanyifeng.com/blog/2023/12/weekly-issue-281.html";
  created: "20231214140831";
  fcontent: "";
  hash: "2231b69";
  hpath: "/想法/siyuan rss插件";
  ial: '{: id="20231214140831-1bwt1jv" updated="20231214140918"}';
  id: "20231214140831-1bwt1jv";
  length: 87;
  markdown: "#### [科技爱好者周刊（第 281 期）：新基建的政策选择](https://www.ruanyifeng.com/blog/2023/12/weekly-issue-281.html)";
  memo: "";
  name: "";
  parent_id: string;
  path: string; // "/20231214112450-ndy3t2e.sy";
  root_id: "20231214112450-ndy3t2e";
  sort: 5;
  subtype: "h4";
  tag: "";
  type: "h";
  updated: "20231214140918";
}
interface feed {
  attr: {
    /** 订阅源 */
    feed?: { value: string; block: block };
    /** 定时任务的表达式 */
    cron?: { value: string; block: block };
    /** 请求 feed 的超时时间 */
    timeout?: { value: string; block: block };
    /** 自定义的一段js代码，求值后应该得到一个函数 */
    customParse?: { value: string; block: block };
  };
  attrBlock?: block;
  /** 已经加载的笔记 */
  entryBlock: block[];
  /** 数据库属性视图中的属性,优先级低于 attr  */
  av_attr: { [key in keyof feed["attr"]]: string };
  /** 负责优先级计算 */
  getAttr(key: keyof feed["attr"]): string | undefined;
}

interface feedByUrl {
  title: string;
  subtitle: string;
  updated: string;
  entryList: entry[];
}
interface entry {
  title?: string;
  published?: string;
  updated?: string;
  summary?: string;
  link?: string | null;
}
/** 用户自定义解析函数 */
interface customParse {
  (
    /**
     * v1.1.11 破坏性更新，由 {@link feed.attr} 改为 {@link feed}
     * 这是因为添加了 {@link feed.av_attr} , 原来的方式无法获取到此属性。
     * */
    attr: feed,
    resText: string,
    util: {
      xssDefend: typeof xssDefend;
      elText: typeof elText;
    },
  ): feedByUrl;
}
/** 解析 feed 对象
 * 处理函数 {@link parseFeedBlock} 的产物
 */
export async function parseFeed(feedDoc: feed): Promise<feedByUrl | Error> {
  let timeout = Number(feedDoc.getAttr("timeout"));
  timeout = timeout >= 3000 ? timeout : FETCH_TIMEOUT;
  const url = feedDoc.getAttr("feed")?.trim();

  const resText = await new Promise<string>((r, j) => {
    fetchPost(
      "/api/network/forwardProxy",
      {
        url: url,
        method: "GET",
        timeout,
        contentType: "application/xml",
        headers: [],
        payload: {},
        payloadEncoding: "text",
        responseEncoding: "text",
      },
      (res) => {
        if (res.code !== 0 && res.data.status !== 200) {
          j(new Error(res.msg));
        } else {
          r(res.data.body);
        }
      },
    );
  });
  const customCode = feedDoc.getAttr("customParse");
  if (customCode) {
    const customParseFun = eval(customCode) as customParse;
    const res = await customParseFun(feedDoc, resText, { xssDefend, elText });
    return res;
  }
  const parser = new DOMParser();
  const dom = parser.parseFromString(resText, "text/xml");
  if (dom.querySelector("feed")) {
    return {
      title: elText(dom, "feed > title"),
      subtitle: elText(dom, "feed > subtitle"),
      updated: elText(dom, "feed > updated"),
      entryList: Array.from(dom.querySelectorAll("feed > entry")).map((entry) => {
        return {
          title: elText(entry, "title"),
          published: elText(entry, "published"),
          updated: elText(entry, "updated"),
          summary:
            elText(entry, "summary") ||
            elText(entry, /** https://www.v2ex.com/index.xml */ "content"),
          link: xssDefend(entry.querySelector("link")?.getAttribute("href")),
        } as entry;
      }),
    };
  } else if (dom.querySelector("channel")) {
    return {
      title: elText(dom, "channel > title"),
      subtitle: elText(dom, "channel > description"),
      updated: elText(dom, "channel > lastBuildDate"),
      entryList: Array.from(dom.querySelectorAll("channel > item")).map((entry) => {
        return {
          title: elText(entry, "title"),
          published: elText(entry, "pubDate"),
          updated: elText(entry, "updated"),
          summary: elText(entry, "description"),
          link: elText(entry, "link"),
        } as entry;
      }),
    };
  } else {
    console.log("rss解析失败",feedDoc, url);
    return new Error(
      `未知的格式，可以将此消息发送给开发者 admin@shenzilong.cn (feed_siyuan_plugin):${url}`,
    );
  }
}
/** 从块id 解析 feed 对象 */
export async function parseFeedBlock(block_id: string) {
  const feedObj: feed = {
    attr: {},
    entryBlock: [],
    av_attr: {},
    getAttr(key) {
      return this.attr[key]?.value ?? this.av_attr[key];
    },
  };

  /** 寻找一个以 feed: 开头的子块。它将作为此 feed 的属性块，对它的子块进行解析，获取各种属性 */
  const feedAttrBlock = (
    await sqlQuery(
      `SELECT * FROM blocks WHERE parent_id="${block_id}" and fcontent LIKE 'feed:%' limit 1`,
    )
  ).data?.[0] as block;
  if (feedAttrBlock) {
    feedObj.attrBlock = feedAttrBlock;
    const feedAttrChildBlock = (
      await sqlQuery(`SELECT * FROM blocks WHERE parent_id="${feedAttrBlock?.id}" limit 20`)
    ).data as block[];
    Object.assign(feedObj.attr, blocksToObj(feedAttrChildBlock));
  }

  // 查找所有entry子块
  feedObj.entryBlock = (
    await sqlQuery(
      `SELECT * FROM blocks
      WHERE
       parent_id="${block_id}" AND (markdown LIKE "* [ ] #%" OR markdown LIKE "* [X] #%")
      ORDER BY created DESC
      LIMIT ${/** 避免笔记本中存在但没搜到，导致重复插入 */ MAX_FEED_NUM * 3}`,
    )
  ).data as block[];
  Object.assign(feedObj.av_attr, await get_av_map(block_id));


  return feedObj;

  function blocksToObj(blocks: block[]) {
    const map = blocks
      .map(
        (el) =>
          [
            Array.from(el.content.trim().match(/(.*?):([\s\S]+)/) ?? []) as [string, string, string],
            el,
          ] as const,
      )
      .filter((el) => el[0].length === 3);
    const obj = {} as any;
    for (const [[_rawContent, key, value], block] of map) {
      let v = value;
      if (key === "feed") {
        v = value.replace(/** 思源会转义下划线 */ "\\_", "_");
      }
      obj[key] = { value: v, block };
    }
    return obj as feed;
  }
}
export async function getAllFeedBlocks() {
  return (await sqlQuery(`SELECT * FROM attributes WHERE name="bookmark" and value="feed"`))
    .data as attributes[];
}
function elText(el: Element | Document, selectors: string) {
  return xssDefend(el.querySelector(selectors)?.textContent);
}
/** 简单的对输入进行过滤，防止可能存在的 xss 攻击 */
function xssDefend(s?: string | null): string {
  if (!s) return "";
  let filteredStr = (
    new DOMParser().parseFromString(s, "text/html").documentElement.textContent ?? ""
  ).replace(/** 过滤特殊标记符 */ /[<>\[\]\n]/g, "");
  /** 避免过长的摘要 */
  if (filteredStr.length > SUMMARY_LENGTH) {
    filteredStr = filteredStr.substring(0, SUMMARY_LENGTH) + "...";
  }
  return filteredStr;
}
/** 过滤一些临时参数，避免重复添加 */
export function linkFilter(link?: string) {
  return (link || "").replace(/#.*$/g, "");
}