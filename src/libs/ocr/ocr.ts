import { showMessage } from "siyuan";

export async function ocr(opt: { name: string; imgBase64: string; apiSK: string }) {
  return fetch(`https://apis.shenzilong.cn/api/ocr?sk=${opt.apiSK}`, {
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
      return r.json();
    }
  });
}
