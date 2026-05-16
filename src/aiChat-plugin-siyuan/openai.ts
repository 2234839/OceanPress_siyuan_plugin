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
