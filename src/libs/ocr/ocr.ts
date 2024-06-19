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
export async function ocr(
  opt:
    | { name: string; imgBase64: string; sk: string; type?: "oceanpress" }
    | { name: string; imgBase64: string; type: "umi-ocr"; umiApi: string },
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
  if (opt.type === "umi-ocr") {
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
    if (res.code !== 100) {
      showMessage("umi-ocr 失败<br/>" + res.data, 5_000, "error");
      return;
    }
    return {
      words_result: res.data.map((el) => ({
        vertexes_location: el.box.map((el) => ({
          x: el[0],
          y: el[1],
        })),
        words: el.text,
      })),
    };
  } else if (opt.type === "oceanpress") {
    return fetch(`https://apis.shenzilong.cn/api/ocr?sk=${opt.sk}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: opt.name,
        imgBase64: opt.imgBase64,
      }),
    }).then(async (r) => {
      if (!r.ok) {
        showMessage("ocr 失败<br/>" + (await r.text()), 5_000, "error");
      } else {
        return (await r.json()) as { words_result: words_result };
      }
    });
  }
}

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
