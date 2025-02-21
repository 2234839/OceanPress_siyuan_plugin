import { SiyuanPlugin } from '~/libs/siyuanPlugin';
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;

export default class VitePlugin extends SiyuanPlugin {
  onload(): void {
    // 使用事件委托，在 body 上监听双击事件
    document.body.addEventListener('dblclick', this.dblclickCallback);
    this.addUnloadFn(() => {
      document.body.removeEventListener('dblclick', this.dblclickCallback);
    });
  }

  dblclickCallback(event: MouseEvent): void {
    window.speechSynthesis.cancel()
    if (!(event.target && event.target instanceof HTMLElement)) return;
    const blockEl = event.target.closest('[data-node-id]');
    if (!(blockEl && blockEl instanceof HTMLElement)) return;

    // 获取被双击元素的文本内容
    const textToRead = blockEl.textContent;
    if (!textToRead) return;
    // 创建一个 SpeechSynthesisUtterance 实例
    const utterance = new SpeechSynthesisUtterance(textToRead);

    // 设置语音属性（使用中文语音）
    const voices = window.speechSynthesis.getVoices();
    const chineseVoice = voices.find((voice) => voice.lang === 'zh-CN');
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    // 设置语速、音调等
    utterance.rate = 1; // 语速
    utterance.pitch = 1; // 音调
    utterance.volume = 1; // 音量

    // 启动朗读
    window.speechSynthesis.speak(utterance);
  }
}
