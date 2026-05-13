import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { fetchSyncPost } from 'siyuan';
import { computed, reactive } from 'vue';
import { sql } from '~/libs/api';
import { semanticSearch } from './qdrant/search';
import { qdrantConfig } from './qdrant/types';

export const aiChatConfig = reactive({
  apiBaseUrl: '',
  apiKey: '',
  model: '',
  apiProvider: 'siyuan' as 'siyuan' | 'openai' | '崮生',
  /** 深度思考强度：空字符串表示不启用，"high"/"max" 等表示启用 */
  reasoningEffort: '' as '' | 'low' | 'medium' | 'high' | 'max',
});

export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '09bc63119e1f26d148cac77cda12e089.Rw7lnq1zkg3FcmYZ',
  baseURL: import.meta.env.VITE_OPENAI_BASE_PATH ?? 'https://open.bigmodel.cn/api/paas/v4',
  dangerouslyAllowBrowser: true,
});

export const openai$ = computed(() => {
  if (aiChatConfig.apiProvider === 'siyuan') {
    return new OpenAI({
      apiKey: window.siyuan.config.ai.openAI.apiKey,
      baseURL: window.siyuan.config.ai.openAI.apiBaseURL,
      dangerouslyAllowBrowser: true,
    });
  } else if (aiChatConfig.apiProvider === '崮生') {
    return new OpenAI({
      apiKey:
        import.meta.env.VITE_OPENAI_API_KEY ??
        '09bc63119e1f26d148cac77cda12e089.Rw7lnq1zkg3FcmYZ',
      baseURL: import.meta.env.VITE_OPENAI_BASE_PATH ?? 'https://open.bigmodel.cn/api/paas/v4',
      dangerouslyAllowBrowser: true,
    });
  } else if (aiChatConfig.apiProvider === 'openai') {
    return new OpenAI({
      apiKey: aiChatConfig.apiKey,
      baseURL: aiChatConfig.apiBaseUrl,
      dangerouslyAllowBrowser: true,
    });
  } else {
    throw new Error('Unsupported API provider');
  }
});

const model$ = computed(() => {
  if (aiChatConfig.apiProvider === 'openai') {
    return aiChatConfig.model;
  } else if (aiChatConfig.apiProvider === 'siyuan') {
    return window.siyuan.config.ai.openAI.apiModel;
  } else if (aiChatConfig.apiProvider === '崮生') {
    return 'GLM-4-Flash';
  } else {
    throw new Error('Unsupported API provider');
  }
});

// #region 搜索状态

export interface SearchState {
  isSearching: boolean
  currentStep: string
  round: number
  keywords: string[]
  searchResults: any[]
  thinkingProcess: string[]
  /** 流式输出时的当前文本快照 */
  streamingText: string
  /** 工具调用记录 */
  toolCalls: ToolCallRecord[]
}

/** 单次工具调用记录 */
export interface ToolCallRecord {
  name: string
  args: Record<string, unknown>
  result?: string
}

export const searchState = reactive<SearchState>({
  isSearching: false,
  currentStep: '',
  round: 0,
  keywords: [],
  searchResults: [],
  thinkingProcess: [],
  streamingText: '',
  toolCalls: [],
});

// #endregion

// #region Agent system prompt

/** 动态构建 system prompt，根据当前可用工具生成描述 */
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

const simpleSystemPrompt = `你是用户的笔记AI助手，负责回答用户的问题。

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
- 如果搜索结果不足以回答问题，明确告知用户
`;

// #endregion

// #region 工具定义与实现

/** 思源全文搜索块类型配置 */
const searchTypes = {
  audioBlock: true, blockquote: true, codeBlock: true,
  databaseBlock: true, document: true, embedBlock: true,
  heading: true, htmlBlock: true, iframeBlock: true,
  list: true, listItem: true, mathBlock: true,
  paragraph: true, superBlock: true, table: true,
  videoBlock: true, widgetBlock: true,
};

interface 思源搜索块 {
  id: string;
  markdown: string;
  content: string;
  type: string;
  box: string;
  path: string;
  hpath: string;
}

function formatSearchResults(blocks: 思源搜索块[]): string {
  if (!blocks.length) return '未找到相关内容';
  return blocks.map(b =>
    `[${b.hpath}](siyuan://blocks/${b.id})\n${b.markdown.slice(0, 500)}`
  ).join('\n---\n');
}

/** 工具执行函数表 */
const toolHandlers: Record<string, (args: any) => Promise<string>> = {
  siyuan_search: async (args: { query: string }) => {
    const res = await fetchSyncPost('/api/search/fullTextSearchBlock', {
      query: args.query, method: 0, types: searchTypes,
      paths: [], groupBy: 0, orderBy: 0, page: 1, reqId: Date.now(),
    }) as any;
    return formatSearchResults(res?.data?.blocks ?? []);
  },
  qdrant_search: async (args: { query: string; limit?: number }) => {
    const results = await semanticSearch(qdrantConfig, args.query, args.limit ?? 10);
    if (!results.length) return '未找到相关内容';
    return results.map(r =>
      `[${r.hpath}](siyuan://blocks/${r.blockId}) (相关度: ${r.score.toFixed(3)})\n${r.content.slice(0, 500)}`
    ).join('\n---\n');
  },
  sql_query: async (args: { sql: string }) => {
    /** 安全限制：只允许 SELECT */
    const trimmed = args.sql.trim()
    if (!/^SELECT\s/i.test(trimmed)) {
      return '错误：只允许 SELECT 查询';
    }
    const rows = await sql(trimmed) as any[];
    if (!rows || rows.length === 0) return '查询结果为空';
    return JSON.stringify(rows.slice(0, 50), null, 2);
  },
};

/** 构建 OpenAI tool 定义（纯 JSON schema，不含 function 实现） */
function buildToolDefinitions(): ChatCompletionTool[] {
  const tools: ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'siyuan_search',
        description: '在思源笔记中执行全文搜索，适合精确关键词搜索',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: '搜索查询关键词' } },
          required: ['query'],
        },
      },
    },
  ];

  if (qdrantConfig.qdrantUrl.trim()) {
    tools.push({
      type: 'function',
      function: {
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
      },
    });
  }

  tools.push({
    type: 'function',
    function: {
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
    },
  });

  return tools;
}

// #endregion

// #region 核心：手工 tool calling 循环

/** 构建 create 调用的额外参数（支持 DeepSeek 思考模式等） */
function buildExtraParams() {
  const params: Record<string, unknown> = {};
  if (aiChatConfig.reasoningEffort) {
    params.reasoning_effort = aiChatConfig.reasoningEffort;
    /** DeepSeek 思考模式开关 */
    params.thinking = { type: 'enabled' };
  }
  return params;
}

/** 最大 tool call 循环轮次 */
const MAX_TOOL_ROUNDS = 15;

/**
 * Agent 主循环：手工管理 tool calling + reasoning_content 回传 + 流式输出
 */
export async function 执行优化版ai问答(
  userInput: string,
  _method?: number,
  onStateUpdate?: (state: SearchState) => void,
  history?: ChatCompletionMessageParam[],
): Promise<{ finalAnswer: string; searchResults: any[]; searchRounds: number }> {
  const ai = openai$.value;
  const model = model$.value;
  const tools = buildToolDefinitions();
  const extra = buildExtraParams();
  const isReasoning = !!aiChatConfig.reasoningEffort;

  /** 构建完整 messages */
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...(history ?? []),
    { role: 'user', content: userInput },
  ];

  const toolCallRecords: ToolCallRecord[] = [];
  let toolCallCount = 0;

  if (onStateUpdate) {
    onStateUpdate({ ...searchState, isSearching: true, currentStep: 'AI 正在分析问题...', streamingText: '', toolCalls: [] });
  }

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    /** 调用 API（流式） */
    const createParams: Record<string, unknown> = {
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: true as const,
      max_tokens: 8192,
      ...extra,
    };
    /** 非思考模式才设 temperature */
    if (!isReasoning) {
      createParams.temperature = 0.3;
    }

    const stream = await ai.chat.completions.create(
      createParams as unknown as OpenAI.ChatCompletionCreateParamsStreaming,
    );

    /** 收集本次响应的内容 */
    let content = '';
    let reasoningContent = '';
    const pendingToolCalls: Array<{ id: string; name: string; arguments: string }> = [];
    let hasToolCalls = false;
    let currentToolCallId = '';
    let currentToolCallName = '';
    let currentToolCallArgs = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      /** 收集 reasoning_content（DeepSeek 思考模式） */
      if ((delta as any).reasoning_content) {
        reasoningContent += (delta as any).reasoning_content;
      }

      /** 收集文本内容 */
      if (delta.content) {
        content += delta.content;
        if (onStateUpdate) {
          onStateUpdate({
            ...searchState,
            isSearching: true,
            currentStep: 'AI 正在回答...',
            streamingText: content,
            toolCalls: [...toolCallRecords],
          });
        }
      }

      /** 收集 tool calls */
      if (delta.tool_calls) {
        hasToolCalls = true;
        for (const tc of delta.tool_calls) {
          if (tc.id) {
            /** 新的 tool call 开始 */
            if (currentToolCallId) {
              pendingToolCalls.push({ id: currentToolCallId, name: currentToolCallName, arguments: currentToolCallArgs });
            }
            currentToolCallId = tc.id;
            currentToolCallName = tc.function?.name ?? '';
            currentToolCallArgs = '';
          }
          if (tc.function?.arguments) {
            currentToolCallArgs += tc.function.arguments;
          }
        }
      }
    }

    /** 保存最后一个 tool call */
    if (currentToolCallId) {
      pendingToolCalls.push({ id: currentToolCallId, name: currentToolCallName, arguments: currentToolCallArgs });
    }

    /** 构建 assistant 消息，保留 reasoning_content（DeepSeek 要求） */
    const assistantMsg: Record<string, unknown> = {
      role: 'assistant',
      content: content || null,
    };
    if (reasoningContent) {
      assistantMsg.reasoning_content = reasoningContent;
    }
    if (pendingToolCalls.length > 0) {
      assistantMsg.tool_calls = pendingToolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments },
      }));
    }
    messages.push(assistantMsg as unknown as ChatCompletionMessageParam);

    /** 如果没有 tool calls，循环结束 */
    if (!hasToolCalls || pendingToolCalls.length === 0) {
      break;
    }

    /** 执行每个 tool call 并添加结果到 messages */
    for (const tc of pendingToolCalls) {
      toolCallCount++;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.arguments); } catch { /* ignore */ }

      const record: ToolCallRecord = { name: tc.name, args };
      toolCallRecords.push(record);

      if (onStateUpdate) {
        onStateUpdate({
          ...searchState,
          isSearching: true,
          currentStep: `正在调用 ${tc.name}...`,
          round: toolCallCount,
          streamingText: '',
          toolCalls: [...toolCallRecords],
        });
      }

      /** 执行工具 */
      const handler = toolHandlers[tc.name];
      let result: string;
      if (handler) {
        result = await handler(args);
      } else {
        result = `未知工具: ${tc.name}`;
      }

      record.result = result.length > 200 ? result.slice(0, 200) + '...' : result;

      /** 添加 tool 结果到 messages */
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      } as ChatCompletionMessageParam);

      if (onStateUpdate) {
        onStateUpdate({
          ...searchState,
          isSearching: true,
          currentStep: `搜索完成 (第 ${toolCallCount} 次)`,
          toolCalls: [...toolCallRecords],
        });
      }
    }
  }

  const finalContent = (messages[messages.length - 1] as any)?.content ?? '';

  if (onStateUpdate) {
    onStateUpdate({
      ...searchState,
      isSearching: false,
      currentStep: '完成',
      round: toolCallCount,
      streamingText: finalContent,
      toolCalls: [...toolCallRecords],
    });
  }

  return { finalAnswer: finalContent || '', searchResults: [], searchRounds: toolCallCount };
}

// #endregion

// #region 简化版问答（兼容入口）

export async function 执行ai问答(
  userInput: string,
  _method?: number,
): Promise<{ res: string; raw: any }> {
  const ai = openai$.value;
  const isReasoning = !!aiChatConfig.reasoningEffort;

  const searchRes = await fetchSyncPost('/api/search/fullTextSearchBlock', {
    query: userInput, method: 0, types: searchTypes,
    paths: [], groupBy: 0, orderBy: 0, page: 1, reqId: Date.now(),
  }) as any;
  const searchMd = formatSearchResults(searchRes?.data?.blocks ?? []);

  const createParams: Record<string, unknown> = {
    model: model$.value,
    messages: [
      { role: 'system', content: simpleSystemPrompt },
      { role: 'assistant', content: `检索到的内容:\n${searchMd}` },
      { role: 'user', content: userInput },
    ],
    max_tokens: 8192,
    stream: false,
    ...buildExtraParams(),
  };
  if (!isReasoning) {
    createParams.temperature = 0.3;
  }

  const completion = await ai.chat.completions.create(createParams as any);
  return { res: completion.choices[0].message!.content!, raw: completion };
}

// #endregion
