import OpenAI from "openai"
import type { QdrantPluginConfig } from "./types"

/** 创建配置好的 OpenAI 客户端指向 LM Studio */
export function createEmbeddingClient(config: QdrantPluginConfig): OpenAI {
  return new OpenAI({
    apiKey: "lm-studio",
    baseURL: `${config.lmStudioUrl}/v1`,
    dangerouslyAllowBrowser: true,
  })
}

/** 获取单条文本的 embedding 向量 */
export async function getEmbedding(
  config: QdrantPluginConfig,
  text: string,
): Promise<number[]> {
  const client = createEmbeddingClient(config)
  const response = await client.embeddings.create({
    model: config.embeddingModel,
    input: text,
    encoding_format: "float",
  })
  return response.data[0].embedding
}

/** 批量获取 embedding 向量 */
export async function getEmbeddings(
  config: QdrantPluginConfig,
  texts: string[],
): Promise<number[][]> {
  const client = createEmbeddingClient(config)
  const response = await client.embeddings.create({
    model: config.embeddingModel,
    input: texts,
    encoding_format: "float",
  })
  return response.data.map((item) => item.embedding)
}

/** 测试 LM Studio embedding 连接 */
export async function testEmbeddingConnection(
  config: QdrantPluginConfig,
): Promise<{ ok: boolean; error?: string; dimensions?: number }> {
  const client = createEmbeddingClient(config)
  const response = await client.embeddings.create({
    model: config.embeddingModel,
    input: "test",
    encoding_format: "float",
  })
  return {
    ok: true,
    dimensions: response.data[0].embedding.length,
  }
}
