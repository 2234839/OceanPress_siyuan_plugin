import { Plugin } from "siyuan";
import { insertBlock, setBlockAttrs, sql, updateBlock } from "~/libs/api";

const custom_audio_id = "custom-audio_id";

export default class audio2text_plugin_siyuan extends Plugin {
  async onload() {
    this.addCommand({
      hotkey: "",
      langKey: `转化所有音频为文本`,
      langText: `转化所有音频为文本`,
      callback: () => {
        this.audio2text();
      },
    });

    // 监听 audio 块并添加重新识别的按钮
    const watchDOMChanges = () => {
      var observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            // 当 DOM 中有新的子节点被添加时
            mutation.addedNodes.forEach((audioDiv) => {
              if (audioDiv instanceof HTMLElement && audioDiv?.dataset.type === "NodeAudio") {
                const reloadBtn = document.createElement("button");
                reloadBtn.innerText = "🔄️";
                reloadBtn.contentEditable = "false";
                reloadBtn.style.marginLeft = "10px";
                audioDiv.appendChild(reloadBtn);
                this.onunloadFn.push(() => reloadBtn.remove());

                reloadBtn.onclick = async () => {
                  const audioBlock = (
                    await sql(`select * from blocks where id = "${audioDiv?.dataset.nodeId}"`)
                  )[0];
                  await audioBlockAddText(audioBlock);
                  // 思源在刷新后会将按钮的文本取消，所以这里重新设置
                  reloadBtn.innerText = "🔄️";
                };
              }
            });
          }
        });
      });
      var config = { childList: true, subtree: true };
      observer.observe(document.body, config);
      return observer;
    };

    // 开始观察 DOM 变化
    var observer = watchDOMChanges();
    this.onunloadFn.push(() => observer.disconnect());
    // 如果你想要停止观察 DOM 变化，可以调用以下代码：
    // observer.disconnect();
  }
  async audio2text() {
    const audioBlocks: Block[] = await sql(
      /** 查询没有 text 属性的blocks */
      `
    SELECT * FROM blocks AS b
    WHERE
      b.type ="audio"
        AND
      NOT EXISTS (
        SELECT 1
        FROM attributes AS a
        WHERE a.block_id = b.id AND a."name" = "custom-text"
      )
    `,
    );
    await Promise.all(audioBlocks.map(audioBlockAddText));
  }
  /** 插件卸载时会执行此数组中的函数 */
  onunloadFn = [] as (() => void)[];
  async onunload() {
    this.onunloadFn.forEach((fn) => fn());
  }
}

async function audioBlockAddText(audioBlock: Block) {
  const audioFile = await fetch(audioBlock.content).then((r) => r.arrayBuffer());

  // 上传文件识别为文本
  const audioText = await audioFile2Text(audioFile);
  await setBlockAttrs(audioBlock.id, {
    "custom-text": audioText,
  });
  // 插入或更新文本节点
  const audioTextAttr: attribute = (
    await sql(
      `
    SELECT * FROM attributes
    WHERE "name" ="${custom_audio_id}" AND VALUE = "${audioBlock.id}"`,
    )
  )[0];
  if (audioTextAttr === undefined) {
    await insertBlock(
      "markdown",
      genAudioTextMarkdown(audioBlock, audioText),
      undefined,
      audioBlock.id,
    );
  } else {
    await updateBlock(
      "markdown",
      genAudioTextMarkdown(audioBlock, audioText),
      audioTextAttr.block_id,
    );
  }
}

async function audioFile2Text(_audio: ArrayBuffer): Promise<string> {
  // 此处实现识别音频为文本的功能

  return "识别结果测试" + new Date().toLocaleString();
}

function genAudioTextMarkdown(audioBlock: Block, audioText: string) {
  return `${audioText}\n{: ${custom_audio_id}="${audioBlock.id}" style="text-align: center;"}`;
}
