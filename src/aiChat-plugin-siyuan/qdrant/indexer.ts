import { sql, exportMdContent } from "~/libs/api"
import * as qdrant from "./qdrant-client"
import { getEmbeddings } from "./embedding"
import type { QdrantPluginConfig, QdrantPoint, IndexingState } from "./types"

/** 确定性 UUID 生成：基于输入字符串生成合法 UUID */
function toUUID(input: string): string {
  let h1 = 0x6ba7b810, h2 = 0x9dad11d1, h3 = 0x80b400c0, h4 = 0x4fd430c8
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 ^= c; h1 = Math.imul(h1, 0x5bd1e995) >>> 0
    h2 ^= c; h2 = Math.imul(h2, 0x5bd1e995) >>> 0
    h3 ^= c; h3 = Math.imul(h3, 0x5bd1e995) >>> 0
    h4 ^= c; h4 = Math.imul(h4, 0x5bd1e995) >>> 0
  }
  /** 设置版本号 5 (byte6 高 4 位 = 0101) 和变体 RFC 4122 (byte8 高 2 位 = 10) */
  h1 = (h1 & 0xffff0fff) | 0x00005000
  h3 = (h3 & 0x3fffffff) | 0x80000000

  /** 拼接 4 个 uint32 hex (共 32 字符)，再按 8-4-4-4-12 插入横线 */
  const hex = [h1, h2, h3, h4].map((n) => (n >>> 0).toString(16).padStart(8, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** 检查 hpath 是否匹配任意一条排除规则（支持 * 通配符） */
function isExcluded(hpath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const trimmed = pattern.trim()
    if (!trimmed) continue
    /** 将 glob 风格的 * 转为正则 */
    const regex = new RegExp(
      "^" + trimmed.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
    )
    if (regex.test(hpath)) return true
  }
  return false
}

/** 确保目标集合存在，不存在则创建 */
export async function ensureCollection(
  config: QdrantPluginConfig,
): Promise<void> {
  const collections = await qdrant.listCollections(config.qdrantUrl)
  if (!collections.includes(config.defaultCollection)) {
    await qdrant.createCollection(
      config.qdrantUrl,
      config.defaultCollection,
      config.vectorSize,
      config.distanceMetric,
    )
  }
}

/** 将 markdown 按段落边界分块 */
function chunkMarkdown(md: string, targetSize: number): string[] {
  const paragraphs = md.split(/\n\n+/).filter((p) => p.trim().length > 0)
  const chunks: string[] = []
  /** 当前正在构建的块 */
  let current = ""

  for (const para of paragraphs) {
    /** 去除思源属性语法 {: id="..." updated="..."} */
    const cleaned = para.replace(/\s*\{:[^}]*\}/g, "").trim()
    if (cleaned.length === 0) continue

    if (current.length + cleaned.length > targetSize && current.length > 0) {
      chunks.push(current.trim())
      current = cleaned
    } else {
      current += "\n\n" + cleaned
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim())
  }

  return chunks
}

/** 索引思源笔记到 Qdrant（增量模式） */
export async function indexNotes(
  config: QdrantPluginConfig,
  state: IndexingState,
): Promise<void> {
  state.isIndexing = true
  state.errors = []
  state.indexed = 0

  await ensureCollection(config)

  /** 构建查询（必须显式指定 LIMIT，思源默认只返回 64 条） */
  let query = "SELECT id, box, hpath FROM blocks WHERE type='d'"
  /** 增量：如果有上次索引时间，只查更新的文档 */
  if (config.lastIndexedTime) {
    query += ` AND updated > '${config.lastIndexedTime}'`
  }
  if (config.indexNotebooks.length > 0) {
    const notebooks = config.indexNotebooks.map((n) => `'${n}'`).join(",")
    query += ` AND box IN (${notebooks})`
  }
  query += " LIMIT 100000"
  const docs = (await sql(query)) as Array<{
    id: string
    box: string
    hpath: string
  }>
  state.total = docs.length

  /** 逐文档处理，边处理边写入（增量 upsert） */
  for (const doc of docs) {
    state.currentDoc = doc.hpath

    /** 按 hpath 排除规则过滤 */
    if (isExcluded(doc.hpath, config.excludePatterns)) continue

    const mdRes = await exportMdContent(doc.id)
    const content = mdRes.content
    if (!content || content.trim().length === 0) continue

    const chunks = chunkMarkdown(content, config.chunkSize)
    if (chunks.length === 0) continue

    /** 批量向量化 */
    const vectors = await getEmbeddings(config, chunks)

    /** 构建点，用确定性 UUID 作为 point ID */
    const points: QdrantPoint[] = []
    for (const [i, chunk] of chunks.entries()) {
      points.push({
        id: toUUID(`${doc.id}-chunk-${i}`),
        vector: vectors[i],
        payload: {
          blockId: doc.id,
          hpath: doc.hpath,
          notebook: doc.box,
          content: chunk,
          chunkIndex: i,
        },
      })
    }

    /** 增量 upsert：同一个文档的旧分块先删除，再写入新分块 */
    await qdrant.deletePointsByFilter(
      config.qdrantUrl,
      config.defaultCollection,
      { field: "blockId", value: doc.id },
    )
    await qdrant.upsertPoints(
      config.qdrantUrl,
      config.defaultCollection,
      points,
    )
    state.indexed++
  }

  state.isIndexing = false

  /** 记录本次索引完成时间，供下次增量使用 */
  const now = new Date()
  config.lastIndexedTime = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("")
}
