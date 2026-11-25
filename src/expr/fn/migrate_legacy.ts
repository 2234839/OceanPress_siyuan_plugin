import * as api from '~/libs/api';
import { customBlockInfo } from './get_exprCustomBlocks';
import type { MergedBlock } from '../type';
import { exprName } from '../constant';

/**
 * 数据迁移：将旧架构（任意块上的 custom-expr 属性）升级为思源自定义块架构。
 *
 * 旧数据形态：块上存在 name="custom-expr" 的属性，属性值即表达式源码，
 *            求值结果写在块文本内容中，并记录 custom-expr-value 属性。
 * 新数据形态：NodeCustomBlock 块，data-info="expr"，data-content 为表达式源码，
 *            求值结果渲染进块的 data-content？不——求值结果作为块内容渲染由插件 UI 负责，
 *            结果值仍存到块属性 custom-expr-value 中，保证历史链路可读。
 *
 * 迁移策略（保守，不删除旧属性，方便回退）：
 * 1. 找到所有带 custom-expr 属性的块
 * 2. 在其后面插入一个新的表达式自定义块 ;;;expr <旧表达式> ;;;
 * 3. 旧块保留不动（不破坏用户文档结构），用户确认新架构工作正常后可自行删除
 */
export async function migrateLegacyExprBlocks() {
  /** 旧架构的表达式块 */
  const legacyBlocks: MergedBlock[] =
    (await api.sql(
      `SELECT b.*, a.id AS a_id, a."name" AS a_name, a."value" AS a_value, a."type" AS a_type, a.block_id AS a_block_id, a.root_id AS a_root_id, a.box AS a_box, a."path" AS a_path
       FROM blocks AS b
       INNER JOIN attributes AS a ON b.id = a.block_id
       WHERE a.name = "${exprName}"`,
    )) ?? [];

  const results: { legacyId: string; newBlockId?: string; error?: string }[] = [];
  for (const block of legacyBlocks) {
    try {
      const exprSource = block.a_value;
      // 构造自定义块 markdown：;;;expr 围栏
      const customBlockMarkdown = `;;;${customBlockInfo}\n${exprSource}\n;;;`;
      // 插入到旧块之后（previousID = 旧块 id）
      const res = await api.insertBlock('markdown', customBlockMarkdown, undefined, block.id);
      const newBlockId = res?.[0]?.doOperations?.[0]?.id;
      results.push({ legacyId: block.id, newBlockId });
    } catch (e) {
      results.push({ legacyId: block.id, error: String(e) });
    }
  }
  return results;
}
