import { IWebSocketData, fetchPost, fetchSyncPost } from "siyuan";

export function insertBlock(par: {
  dataType: "markdown" | "dom";
  data: string;
  /** 下面三个id 三选一 */
  nextID?: string;
  previousID?: string;
  parentID?: string;
}): Promise<IWebSocketData> {
  /** https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md#%E6%8F%92%E5%85%A5%E5%9D%97 */
  return fetchSyncPost("/api/block/insertBlock", par);
}
export interface attributes {
  block_id: string;
  box: string;
  id: string;
  name: string; // "bookmark";
  path: string; // "/20231214112450-ndy3t2e.sy";
  root_id: string; //"20231214112450-ndy3t2e";
  type: "b";
  value: "feed";
}
export function sqlQuery(stmt: string): Promise<IWebSocketData> {
  return fetchSyncPost("/api/query/sql", {
    stmt,
  });
}
/**
 * 获取数据库属性视图，通过 map 操作转化为 kv 结构
 * 在多数据库的情况下数据库名为 feed 的具有高优先级
 * 然后排在前面的优先级高于后面的 */
export function get_av_map(id: string) {
  /** https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md#获取块属性 */
  return fetchSyncPost("/api/av/getAttributeViewKeys", {
    id,
  })
    .then((r) => r.data as database_av[])
    .then((r) => {
      return r
        .map((av) => {
          return av.keyValues.map((kv) => {
            return {
              key: kv.key.name,
              value: kv.values.find((v) => v.text?.content)?.text?.content,
              avName: av.avName,
            };
          });
        })
        .flat()
        .reduce((pre, cur) => {
          pre[cur.key] =
            (cur.avName.includes("feed") ? cur.value : pre[cur.key]) ?? cur.value ?? "";
          return pre;
        }, {} as { [key: string]: string });
    });
}

interface database_av_key {
  id: string;
  name: "cron";
  type: "text";
  icon: "";
  numberFormat: "";
  template: "";
}
interface database_av_value {
  id: string;
  keyID: database_av_key["id"];
  blockID: string;
  type: "text";
  text?: {
    content: "* * * * *";
  };
}
interface database_av {
  avID: string;
  avName: "333";
  blockIDs: string[];
  keyValues: {
    key: database_av_key;
    values: database_av_value[];
  }[];
}
