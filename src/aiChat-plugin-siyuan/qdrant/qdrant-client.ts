import type { QdrantCollectionInfo, QdrantPoint, QdrantSearchResult } from "./types"

/** Qdrant REST API 响应的基础结构 */
interface QdrantResponse<T = unknown> {
  time: number
  status: string
  result: T
}

/** 发送 Qdrant REST API 请求 */
async function qdrantRequest<T = unknown>(
  baseUrl: string,
  method: string,
  path: string,
  payload?: unknown,
): Promise<T> {
  const url = `${baseUrl}${path}`
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  }
  if (payload !== undefined && method !== "GET") {
    init.body = JSON.stringify(payload)
  }
  const response = await fetch(url, init)
  const parsed: QdrantResponse<T> = await response.json()
  return parsed.result
}

/** 列出所有集合名称 */
export async function listCollections(
  baseUrl: string,
): Promise<string[]> {
  const result = await qdrantRequest<
    { collections: Array<{ name: string }> }
  >(baseUrl, "GET", "/collections")
  return result.collections.map((c) => c.name)
}

/** 获取集合详细信息 */
export async function getCollectionInfo(
  baseUrl: string,
  name: string,
): Promise<QdrantCollectionInfo> {
  return qdrantRequest<QdrantCollectionInfo>(
    baseUrl,
    "GET",
    `/collections/${name}`,
  )
}

/** 创建集合 */
export async function createCollection(
  baseUrl: string,
  name: string,
  /** 向量维度 */
  vectorSize: number,
  /** 距离度量 */
  distance: string = "Cosine",
): Promise<unknown> {
  return qdrantRequest(baseUrl, "PUT", `/collections/${name}`, {
    vectors: { size: vectorSize, distance },
  })
}

/** 删除集合 */
export async function deleteCollection(
  baseUrl: string,
  name: string,
): Promise<unknown> {
  return qdrantRequest(baseUrl, "DELETE", `/collections/${name}`)
}

/** 批量 upsert 点（每批 100 个） */
export async function upsertPoints(
  baseUrl: string,
  collection: string,
  points: QdrantPoint[],
): Promise<void> {
  /** 每批最大点数 */
  const batchSize = 100
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize)
    await qdrantRequest(
      baseUrl,
      "PUT",
      `/collections/${collection}/points`,
      { points: batch },
    )
  }
}

/** 向量相似搜索 */
export async function searchPoints(
  baseUrl: string,
  collection: string,
  /** 查询向量 */
  vector: number[],
  /** 返回结果数 */
  limit: number = 10,
  /** 是否返回 payload */
  withPayload: boolean = true,
): Promise<QdrantSearchResult[]> {
  return qdrantRequest<QdrantSearchResult[]>(
    baseUrl,
    "POST",
    `/collections/${collection}/points/search`,
    {
      vector,
      limit,
      with_payload: withPayload,
    },
  )
}

/** 按 ID 获取点 */
export async function getPoints(
  baseUrl: string,
  collection: string,
  ids: string[],
): Promise<QdrantPoint[]> {
  return qdrantRequest<QdrantPoint[]>(
    baseUrl,
    "POST",
    `/collections/${collection}/points`,
    { ids },
  )
}

/** 滚动浏览点（分页） */
export async function scrollPoints(
  baseUrl: string,
  collection: string,
  limit: number = 20,
  offset?: string,
): Promise<{ points: QdrantPoint[]; next_page_offset: string | null }> {
  const payload: Record<string, unknown> = { limit, with_payload: true }
  if (offset) payload.offset = offset
  return qdrantRequest(baseUrl, "POST", `/collections/${collection}/points/scroll`, payload)
}

/** 删除点 */
export async function deletePoints(
  baseUrl: string,
  collection: string,
  ids: string[],
): Promise<unknown> {
  return qdrantRequest(
    baseUrl,
    "POST",
    `/collections/${collection}/points/delete`,
    { points: ids },
  )
}

/** 按 payload 字段条件删除点 */
export async function deletePointsByFilter(
  baseUrl: string,
  collection: string,
  /** 筛选条件，如 { field: "blockId", value: "xxx" } */
  filter: { field: string; value: string },
): Promise<unknown> {
  return qdrantRequest(
    baseUrl,
    "POST",
    `/collections/${collection}/points/delete`,
    {
      filter: {
        must: [
          { key: filter.field, match: { value: filter.value } },
        ],
      },
    },
  )
}

/** 测试 Qdrant 连接 */
export async function testConnection(
  baseUrl: string,
): Promise<{ ok: boolean; title?: string; version?: string; error?: string }> {
  const response = await fetch(baseUrl)
  const parsed = await response.json()
  return { ok: true, title: parsed.title, version: parsed.version }
}
