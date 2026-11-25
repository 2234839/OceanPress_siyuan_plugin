import { sql } from '~/libs/api';
import type { MergedBlock } from '../type';
import { exprName } from '../constant';

/**
 * 新架构（思源自定义块）：表达式以 ;;;expr 围栏块存储，
 * 块类型为 NodeCustomBlock，data-info="expr"，data-content 为表达式源码。
 */
export const customBlockInfo = 'expr';

/** 自定义块的 DOM 定位选择器 */
export const exprCustomBlockSelector = `[data-type="NodeCustomBlock"][data-info="${customBlockInfo}"]`;

/** 新架构下从 SQL 查询所有表达式自定义块 */
export async function get_exprCustomBlocks() {
  const rows: { id: string; markdown: string; content: string }[] =
    (await sql(
      `SELECT id, markdown FROM blocks WHERE type = "NodeCustomBlock"`,
    )) ?? [];
  // SQL 结果里拿不到 data-content，需要再取 kramdown 解析
  return rows;
}

/** 从 kramdown 文本解析自定义块的表达式内容，如 ";;;expr\n...\n;;;" 返回 "..." */
export function parseExprFromKramdown(kramdown: string): string | undefined {
  const m = kramdown.match(/;;;[^\n]*\n([\s\S]*?)\n;;;/);
  if (!m) return undefined;
  // info 字符串为 expr（或旧数据兼容 custom-expr）时才认为是表达式块
  return m[1];
}
