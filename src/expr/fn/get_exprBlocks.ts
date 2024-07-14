import { sql } from "~/libs/api";
import type { MergedBlock } from "../type";
import { exprName } from "../constant";

export async function get_exprBlocks(
  /** 会查询此数组中所有id的表达式 */
  exprIDs: string[],
  /** 传递此参数时还会查询所有此时间后更新的 */ updated?: number,
) {
  const exprIDsStr = exprIDs.map((id) => `"${id}"`).join(",");

  const exprBlock: MergedBlock[] =
    (await sql(
      `SELECT b.*,a.id AS a_id,a."name" AS a_name,a."value" as a_value,a."type" AS a_type,a.block_id AS a_block_id,a.root_id AS a_root_id,a.box AS a_box,a."path" AS a_path
      FROM blocks AS  b
      INNER JOIN attributes AS a
      ON b.id = a.block_id
      WHERE
          a.name = "${exprName}"
        AND
          (
            ( b.id IN (${exprIDsStr}) )
            ${
              updated
                ? `
              OR
            (CAST(b.updated AS INTEGER)  > ${updated})`
                : ""
            }
          )
      ORDER BY b.updated DESC;`,
    )) ?? [];

  return exprBlock;
}
