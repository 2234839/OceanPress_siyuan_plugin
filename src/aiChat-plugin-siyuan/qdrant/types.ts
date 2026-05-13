/** 插件配置，通过 loadData/saveData 持久化 */
export interface QdrantPluginConfig {
  /** Qdrant 服务地址，如 "http://127.0.0.1:6333" */
  qdrantUrl: string
  /** LM Studio 服务地址，如 "http://127.0.0.1:1234" */
  lmStudioUrl: string
  /** LM Studio 中加载的 embedding 模型名称 */
  embeddingModel: string
  /** 默认集合名称 */
  defaultCollection: string
  /** 要索引的笔记本 ID 列表；空数组表示全部 */
  indexNotebooks: string[]
  /** 向量维度（必须与 embedding 模型输出一致） */
  vectorSize: number
  /** 距离度量方式 */
  distanceMetric: "Cosine" | "Euclid" | "Dot"
  /** 分块目标大小（字符数） */
  chunkSize: number
  /** 排除规则列表，每行一条，支持 * 通配符，匹配 hpath */
  excludePatterns: string[]
  /** 上次增量索引完成的时间戳（思源 updated 格式，如 "20240805140351"），空字符串表示全量 */
  lastIndexedTime: string
  /** 是否启用自动增量索引 */
  autoIndex: boolean
  /** 自动索引间隔（分钟） */
  autoIndexInterval: number
}

/** Qdrant 集合信息 */
export interface QdrantCollectionInfo {
  status: string
  optimizer_status: string
  vectors_count: number
  indexed_vectors_count: number
  points_count: number
  config: {
    params: {
      vectors: {
        size: number
        distance: string
      }
    }
  }
}

/** Qdrant 点 */
export interface QdrantPoint {
  id: string
  vector: number[]
  payload: Record<string, unknown>
}

/** Qdrant 搜索结果 */
export interface QdrantSearchResult {
  id: string
  version: number
  score: number
  payload: Record<string, unknown>
}

/** 索引进度状态 */
export interface IndexingState {
  isIndexing: boolean
  currentDoc: string
  indexed: number
  total: number
  errors: string[]
}

/** 丰富化的搜索结果（含思源块信息） */
export interface EnrichedSearchResult {
  /** Qdrant 相似度分数 */
  score: number
  /** 思源块 ID */
  blockId: string
  /** 内容片段（markdown） */
  content: string
  /** 文档路径 */
  hpath: string
  /** 笔记本 ID */
  notebook: string
}

/** 默认配置 */
export const defaultConfig: QdrantPluginConfig = {
  qdrantUrl: "http://127.0.0.1:6333",
  lmStudioUrl: "http://127.0.0.1:1234",
  embeddingModel: "text-embedding-model",
  defaultCollection: "siyuan-notes",
  indexNotebooks: [],
  vectorSize: 768,
  distanceMetric: "Cosine",
  chunkSize: 500,
  excludePatterns: [],
  lastIndexedTime: "",
  autoIndex: false,
  autoIndexInterval: 30,
}

import { reactive } from "vue"

/** Qdrant 插件配置（响应式，由 index.ts 持久化） */
export const qdrantConfig = reactive<QdrantPluginConfig>({ ...defaultConfig })

/** Qdrant 索引进度（响应式） */
export const indexingState = reactive<IndexingState>({
  isIndexing: false,
  currentDoc: "",
  indexed: 0,
  total: 0,
  errors: [],
})
