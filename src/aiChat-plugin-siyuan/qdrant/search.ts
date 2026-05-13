import * as qdrant from "./qdrant-client"
import { getEmbedding } from "./embedding"
import type { QdrantPluginConfig, EnrichedSearchResult } from "./types"

/** 语义搜索：查询文本 → embedding → Qdrant 搜索 → 返回丰富化结果 */
export async function semanticSearch(
  config: QdrantPluginConfig,
  /** 搜索查询文本 */
  query: string,
  /** 返回结果数量 */
  limit: number = 10,
): Promise<EnrichedSearchResult[]> {
  const vector = await getEmbedding(config, query)
  const results = await qdrant.searchPoints(
    config.qdrantUrl,
    config.defaultCollection,
    vector,
    limit,
    true,
  )

  return results.map((r) => ({
    score: r.score,
    blockId: (r.payload?.blockId as string) ?? String(r.id),
    content: (r.payload?.content as string) ?? "",
    hpath: (r.payload?.hpath as string) ?? "",
    notebook: (r.payload?.notebook as string) ?? "",
  }))
}
