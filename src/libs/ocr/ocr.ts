import { showMessage } from "siyuan";
type umi_ocr_res = {
  code: number;
  data: {
    box: [[number, number], [number, number], [number, number], [number, number]];
    score: number;
    text: string;
    end: string;
  }[];
  score: number;
  time: number;
  timestamp: number;
};

const PUBLIC_SERVER_URL = 'https://ocr.heartstack.space/api/ocr';

/** 判断是否是公益服务器 */
function isPublicServer(apiUrl: string): boolean {
  return apiUrl.includes(PUBLIC_SERVER_URL);
}

/** 获取公益服务器的错误提示 */
function getPublicServerError(baseMessage: string): string {
  return `${baseMessage}<br/><br/>💖 <a href="https://afdian.com/@llej0" target="_blank">赞助支持</a>让公益服务更稳定<br/>如遇不稳定，请稍后重试`;
}

let umiEnabled = {
  time: Date.now(),
};
export async function ocr(
  opt: { name: string; imgBase64: string; type: "umi-ocr"; umiApi: string },
): Promise<
  /** img_ocr_text 最少需要以下字段才能征程显示 */
  | {
      words_result: {
        vertexes_location: {
          x: number;
          y: number;
        }[];
        words: string;
      }[];
    }
  | undefined
> {
  await umiOcrEnabled(opt.umiApi);
  const res: umi_ocr_res = await fetch(opt.umiApi, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      /** 去除前缀 */
      base64: opt.imgBase64.slice(`data:image/png;base64,`.length),
    }),
  }).then((r) => r.json());
  if (res.code === 101) {
    // 未找到文字
    return { words_result: [] };
  } else if (res.code !== 100) {
    const errorMsg = isPublicServer(opt.umiApi)
      ? getPublicServerError("OCR 识别失败")
      : "umi-ocr 失败<br/>" + res.data;
    showMessage(errorMsg, 5_000, "error");
    return;
  }

  // 刷新启动判断计时
  umiEnabled.time = Date.now();
  return {
    words_result: res.data.map((el) => ({
      vertexes_location: el.box.map((el) => ({
        x: el[0],
        y: el[1],
      })),
      words: el.text,
    })),
  };
}
export async function umiOcrEnabled(umiApi: string) {
  if (Date.now() - umiEnabled.time > 3_000) {
    await fetch(umiApi, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        /** 去除前缀 */
        base64: `data:image/png;base64,`,
      }),
    })
      .then((r) => r.json())
      .catch((_e) => {
        const errorMsg = isPublicServer(umiApi)
          ? getPublicServerError("OCR 服务暂时不可用")
          : `umi-ocr 似乎未启动，请启动`;
        showMessage(errorMsg, 10_000, "error");
        throw new ocr_enabled_Error("umi-ocr 未启动");
      });
    umiEnabled.time = Date.now();
  }
  return Date.now() - umiEnabled.time < 3_000;
}

export class ocr_enabled_Error extends Error {}

export type words_result = {
  min_finegrained_vertexes_location: {
    x: number;
    y: number;
  }[];
  finegrained_vertexes_location: {
    x: number;
    y: number;
  }[];
  vertexes_location: {
    x: number;
    y: number;
  }[];
  words: string;
  location: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}[];
