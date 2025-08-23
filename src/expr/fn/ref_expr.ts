import { get_exprBlocks } from "./get_exprBlocks";

export async function ref_expr(expr_block_id: string) {
    get_exprBlocks([expr_block_id])
}
