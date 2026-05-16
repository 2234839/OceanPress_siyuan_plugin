/**
 * agent.ts — micro-agent 桥接层
 *
 * 将 micro-agent 的 Agent 框架接入思源笔记 aiChat 插件，
 * 替代手工 tool calling 循环，获得流式输出、重试、上下文压缩等能力。
 */

import { createMicroAgent, createOpenAILLMCaller, type MicroAgentInstance, type CustomToolDef } from 'micro-agent'
import type { SkillConfig } from 'micro-agent'
import { fetchSyncPost } from 'siyuan'
import { sql } from '~/libs/api'
import { aiChatConfig } from './openai'
import { semanticSearch } from './qdrant/search'
import { qdrantConfig } from './qdrant/types'

// #region 工具定义

/** 思源全文搜索块类型配置 */
const searchTypes = {
  audioBlock: true, blockquote: true, codeBlock: true,
  databaseBlock: true, document: true, embedBlock: true,
  heading: true, htmlBlock: true, iframeBlock: true,
  list: true, listItem: true, mathBlock: true,
  paragraph: true, superBlock: true, table: true,
  videoBlock: true, widgetBlock: true,
}

interface 思源搜索块 {
  id: string
  markdown: string
  content: string
  type: string
  box: string
  path: string
  hpath: string
}

function formatSearchResults(blocks: 思源搜索块[]): string {
  if (!blocks.length) return '未找到相关内容'
  return blocks.map(b =>
    `[${b.hpath}](siyuan://blocks/${b.id})\n${b.markdown.slice(0, 500)}`
  ).join('\n---\n')
}

/** 构建当前可用的自定义工具列表 */
function buildCustomTools(): CustomToolDef[] {
  const tools: CustomToolDef[] = [
    {
      name: 'siyuan_search',
      description: '在思源笔记中执行全文搜索，适合精确关键词搜索',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: '搜索查询关键词' } },
        required: ['query'],
      },
      handler: async (args) => {
        const res = await fetchSyncPost('/api/search/fullTextSearchBlock', {
          query: args.query, method: 0, types: searchTypes,
          paths: [], groupBy: 0, orderBy: 0, page: 1, reqId: Date.now(),
        }) as any
        return formatSearchResults(res?.data?.blocks ?? [])
      },
    },
  ]

  if (qdrantConfig.qdrantUrl.trim()) {
    tools.push({
      name: 'qdrant_search',
      description: '使用 Qdrant 执行语义向量搜索，适合概念性、模糊性或跨语言的查询',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索查询文本，可以是自然语言描述' },
          limit: { type: 'number', description: '返回结果数量，默认 10' },
        },
        required: ['query'],
      },
      handler: async (args) => {
        const results = await semanticSearch(qdrantConfig, args.query as string, (args.limit as number) ?? 10)
        if (!results.length) return '未找到相关内容'
        return results.map(r =>
          `[${r.hpath}](siyuan://blocks/${r.blockId}) (相关度: ${r.score.toFixed(3)})\n${r.content.slice(0, 500)}`
        ).join('\n---\n')
      },
    })
  }

  tools.push({
    name: 'sql_query',
    description: '直接执行 SQL 查询思源笔记数据库（只读 SELECT），适合需要精确筛选、聚合、按属性查找等复杂查询',
    parameters: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'SQL SELECT 语句。可用表：blocks（字段：id, content, markdown, type, box, hpath, name, tag, memo, created, updated, root_id, parent_id）、attributes（字段：id, block_id, name, value, type, root_id）。默认只返回 64 条，记得加 LIMIT',
        },
      },
      required: ['sql'],
    },
    handler: async (args) => {
      const trimmed = (args.sql as string).trim()
      if (!/^SELECT\s/i.test(trimmed)) {
        return '错误：只允许 SELECT 查询'
      }
      const rows = await sql(trimmed) as any[]
      if (!rows || rows.length === 0) return '查询结果为空'
      return JSON.stringify(rows.slice(0, 50), null, 2)
    },
  })

  return tools
}

// #endregion

// #region system prompt

/** 动态构建 system prompt */
function buildSystemPrompt(): string {
  const hasQdrant = qdrantConfig.qdrantUrl.trim()

  let toolsSection = `- **siyuan_search**: 思源笔记全文搜索，适合精确关键词搜索`
  if (hasQdrant) {
    toolsSection = `- **qdrant_search**: 语义向量搜索，适合概念性/模糊性/跨语言查询，优先使用
- **siyuan_search**: 思源笔记全文搜索，适合精确关键词搜索，作为补充`
  }
  toolsSection += `\n- **sql_query**: 直接 SQL 查询思源数据库，适合按属性/标签/时间等精确筛选，或需要 JOIN attributes 表查自定义属性的场景`

  return `你是用户的笔记AI助手，负责根据用户的问题在笔记库中搜索相关信息并给出回答。

## 可用工具

${toolsSection}

## 搜索策略

1. 先理解用户问题的核心概念
2. 根据问题选择合适的搜索工具和查询词
3. 可以多次调用不同的工具，使用不同的查询词
4. 评估搜索结果是否足够回答问题，不够就继续搜索
5. 搜索完毕后，基于找到的内容生成回答

## 回答格式

你的回答要表示是基于哪些块的内容回答的，表现方式是在对应回答的后面添加 :[种花心得(这个块的内容摘要)](siyuan://blocks/20240113141417-va4uedb(笔记块的id))
例如 :

提问:怎么养兰花
回答:

1. 保持适宜的空气湿度 [养兰花的第三天](siyuan://blocks/20130123242415-ad32fad12)
2. 需要准备的一些工具:.....  [种花心得](siyuan://blocks/20160133242325-d23dfg1)

## 注意

- [] 内填的是这个块的摘要文本
- () 中的 siyuan://blocks/id 是思源特有的链接方式
- 回答要准确，只基于搜索到的笔记内容
- 如果搜索结果不足以回答问题，明确告知用户`
}

// #endregion

// #region Agent 管理

/** 思源笔记专用 SkillConfig（无 bash 命令，纯自定义工具） */
const siyuanSkill: SkillConfig = {
  name: 'siyuan-notes-assistant',
  description: '思源笔记搜索助手',
  commands: [],
  systemPrompt: buildSystemPrompt(),
  initialMessage: '',
}

/** 从 aiChatConfig 中获取当前有效的 API 配置 */
function getApiConfig(): { apiKey: string; baseUrl: string; model: string } {
  if (aiChatConfig.apiProvider === 'siyuan') {
    return {
      apiKey: window.siyuan.config.ai.openAI.apiKey,
      baseUrl: window.siyuan.config.ai.openAI.apiBaseURL,
      model: window.siyuan.config.ai.openAI.apiModel,
    }
  } else {
    return {
      apiKey: aiChatConfig.apiKey,
      baseUrl: aiChatConfig.apiBaseUrl,
      model: aiChatConfig.model,
    }
  }
}

/** 当前 agent 实例 */
let currentAgent: MicroAgentInstance | null = null
/** 上次创建 agent 时的配置指纹，用于检测配置变化 */
let lastConfigFingerprint = ''

/** 计算当前配置指纹（用于检测是否需要重建 agent） */
function getConfigFingerprint(): string {
  const { apiKey, baseUrl, model } = getApiConfig()
  return `${apiKey}|${baseUrl}|${model}|${aiChatConfig.apiProvider}|${aiChatConfig.reasoningEffort}`
}

/**
 * 获取或创建 Agent 实例
 *
 * 配置变化时自动销毁旧实例、创建新实例。
 */
export function getSiyuanAgent(): MicroAgentInstance {
  const fingerprint = getConfigFingerprint()
  if (currentAgent && fingerprint === lastConfigFingerprint) {
    return currentAgent
  }

  /** 配置变化，销毁旧实例 */
  if (currentAgent) {
    currentAgent.destroy()
    currentAgent = null
  }

  const { apiKey, baseUrl, model } = getApiConfig()

  currentAgent = createMicroAgent({
    llm: createOpenAILLMCaller({ apiKey, baseUrl, model }),
    skills: [siyuanSkill],
    tools: buildCustomTools(),
    systemPrompt: buildSystemPrompt(),
    maxRounds: 15,
    temperature: aiChatConfig.reasoningEffort ? undefined : 0.3,
    enableReasoning: !!aiChatConfig.reasoningEffort,
    reasoningEffort: (aiChatConfig.reasoningEffort === 'max' ? 'high' : aiChatConfig.reasoningEffort) || undefined,
    maxTokens: 8192,
  })

  lastConfigFingerprint = fingerprint
  return currentAgent
}

/** 中止当前对话（不销毁 agent，保留上下文） */
export function stopCurrentChat(): void {
  if (currentAgent) {
    currentAgent.stop()
  }
}

/** 销毁当前 Agent 实例 */
export function destroySiyuanAgent(): void {
  if (currentAgent) {
    currentAgent.destroy()
    currentAgent = null
    lastConfigFingerprint = ''
  }
}

// #endregion
