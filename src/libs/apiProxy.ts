import type * as apis from "./api";

const target = {} as typeof apis;
export type apiRpcData = {
  type: "llej-plugin-rpc";
  msgID: string; // 保证每一个rpc都有唯一的 msgID
  payload: {
    apiName: string;
    args: any[];
    blockId: string;
  };
};
export type apiRpcReply = {
  type: "llej-plugin-rpc-reply";
  msgID: string; // 保证每一个rpc都有唯一的 msgID
  payload: any;
};
const msgQueue: { [msgId: string]: { resolve: (value: unknown) => void; reject: () => void } } = {};
const fn = (event: MessageEvent<apiRpcReply>) => {
  if (event.data.type !== "llej-plugin-rpc-reply") return;
  const payload = event.data.payload;
  const msg = msgQueue[event.data.msgID];
  if (!msg) {
    // console.log("未记录在案", msg);

    return;
  }
  const resolve = msg.resolve;
  delete msgQueue[event.data.msgID];
  resolve(payload);
};
window.addEventListener("message", fn);

export const apiProxy = (blockId: string) =>
  new Proxy(target, {
    get(_target, property, _receiver) {
      // 拦截方法调用
      return function (...args: any) {
        const data: apiRpcData = {
          type: "llej-plugin-rpc",
          msgID: generateUniqueId(),
          payload: {
            apiName: property as string,
            args,
            blockId,
          },
        };
        return sendMsg(data);
      };
    },
  });
function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** 会自动为 msgObj 添加 msgID 属性 */
export function sendMsg(msgObj: any) {
  if (!msgObj.msgID) msgObj.msgID = generateUniqueId();

  window.parent.postMessage(msgObj, "*");
  return new Promise((resolve, reject) => {
    msgQueue[msgObj.msgID] = { resolve, reject };
  });
}
