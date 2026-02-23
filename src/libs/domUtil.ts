/**
 * DOM 查询工具函数
 */

/**
 * 限定DOM查询范围到文档编辑区域
 *
 * 问题背景：https://github.com/2234839/OceanPress_siyuan_plugin/issues/20
 *
 * 问题描述：
 * - 启用插件后，打开表情面板会卡顿约20秒
 * - 当用户添加大量自定义表情时，卡顿现象更严重
 *
 * 根本原因：
 * - 插件的定时器每秒遍历 document.body 或整个 document 查询元素
 * - 表情面板中的每个表情也是 img[data-src] 元素
 * - 定时器会重复处理所有表情，导致主线程阻塞
 *
 * 解决方案：
 * - 限定查询范围到 [data-doc-type="NodeDocument"] 区域
 * - 只处理文档编辑区域内的元素，忽略表情面板、侧边栏等UI元素
 *
 * @param selector - CSS选择器
 * @returns 匹配的元素列表
 * @example
 * ```ts
 * // 查询文档中的所有图片
 * const images = queryInDocuments<HTMLImageElement>('img[data-src]');
 *
 * // 查询文档中的所有视频块
 * const videos = queryInDocuments<HTMLElement>('[data-type="NodeVideo"]');
 * ```
 */
export function queryInDocuments<T extends Element>(
  selector: string,
): NodeListOf<T> {
  return document.querySelectorAll<T>(
    `[data-doc-type="NodeDocument"] ${selector}`,
  );
}
