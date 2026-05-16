import { reactive } from 'vue'

// #region 配置

export const aiChatConfig = reactive({
  apiBaseUrl: '',
  apiKey: '',
  model: '',
  apiProvider: 'siyuan' as 'siyuan' | 'openai',
  /** 深度思考强度：空字符串表示不启用，"high"/"max" 等表示启用 */
  reasoningEffort: '' as '' | 'low' | 'medium' | 'high' | 'max',
})

// #endregion

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
})

// #endregion
