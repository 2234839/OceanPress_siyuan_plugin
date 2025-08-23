import OpenAI from 'openai';
import { fetchSyncPost } from 'siyuan';
import { computed, reactive } from 'vue';

export const aiChatConfig = reactive({
  apiBaseUrl: '',
  apiKey: '',
  model: '',
  apiProvider: 'siyuan' as 'siyuan' | 'openai' | '崮生',
});

export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '09bc63119e1f26d148cac77cda12e089.Rw7lnq1zkg3FcmYZ',
  baseURL: import.meta.env.VITE_OPENAI_BASE_PATH ?? 'https://open.bigmodel.cn/api/paas/v4',
});
export const openai$ = computed(() => {
  if (aiChatConfig.apiProvider === 'siyuan') {
    return new OpenAI({
      apiKey: window.siyuan.config.ai.openAI.apiKey,
      baseURL: window.siyuan.config.ai.openAI.apiBaseURL,
    });
  } else if (aiChatConfig.apiProvider === '崮生') {
    return new OpenAI({
      apiKey:
        import.meta.env.VITE_OPENAI_API_KEY ??
        '09bc63119e1f26d148cac77cda12e089.Rw7lnq1zkg3FcmYZ',
      baseURL: import.meta.env.VITE_OPENAI_BASE_PATH ?? 'https://open.bigmodel.cn/api/paas/v4',
    });
  } else if (aiChatConfig.apiProvider === 'openai') {
    return new OpenAI({
      apiKey: aiChatConfig.apiKey,
      baseURL: aiChatConfig.apiBaseUrl,
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
type AI = {
  openai: OpenAI;
  model?: string;
  max_tokens?: number;
  temperature?: number;
};
const defaultConfig = {
  //   model: "gpt-3.5-turbo",
  //   max_tokens: undefined,
  max_tokens: 8192,
  temperature: 0.3,
};
export async function ai搜索关键词提取(ai: AI, userInput: string) {
  // 你是一个专业辅助用户搜索的助手，请从用户的提问之中拆分和联想出可以用于搜索的词组

  // ## 你回答的内容
  // 1. 格式：你的回答应该是一个单行json字符串数组，不要包含其他的内容
  // 2. 不仅仅要包含用户提问中出现过的关键词，你还应该要联想到关键词的可能变体

  // ## 搜索引擎的特性
  // 1. 搜索程序支持使用空格连接多个关键词
  // 2. 有时候单个关键词可以搜索到相关内容，多个关键词连接反而搜索不到，所以你不仅要返回空格连接的多个关键词，还应该返回需要搜索的单个关键词之类的，但是太多的单个关键词又可能搜索到无关紧要的内容，这个就是需要你取舍的地方了
  const completion = await ai.openai.chat.completions.create({
    model: ai.model ?? model$.value,
    messages: [
      {
        role: 'system',
        content: `你是一名助理，专门协助用户进行搜索。请按照以下规则提供答案：

1. 输出格式：**JSON 格式**，不要使用代码块,要确保你的回答可以直接被 JSON.parse。
2. 内容要求：
   - 答案应该是**单行的 JSON 字符串数组**。
   - 包含**用户问题中的关键词**及其**可能的变体**。
3. 搜索引擎功能：
   - 支持使用空格连接多个关键词，但也要考虑**单个关键词**的可能性。
   - 选择合适的关键词，以避免返回过多无关的结果。

示例：
用户: "有哪些关键词"
你: ["关键词1", "关键词2"]
`,
      },
      { role: 'user', content: userInput },
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  const data = completion;
  const resStr = data.choices[0].message!.content!;
  let queryArr;
  try {
    if (resStr.startsWith('```')) {
      const lines = resStr.split('\n');
      lines[0] = '';
      lines[lines.length - 1] = '';
      queryArr = JSON.parse(lines.join('\n'));
    } else {
      queryArr = JSON.parse(resStr);
    }
  } catch (error) {
    console.log('[error]', error);
    queryArr = [resStr];
  }
  return {
    res: queryArr,
    raw: data,
  };
}
export async function ai回答(ai: AI, userInput: string, searchMd: string) {
  const completion = await ai.openai.chat.completions.create({
    model: ai.model ?? model$.value,
    messages: [
      {
        role: 'system',
        content: `你是用户的笔记ai提问助手，请根据用户的问题和你检索到的笔记内容来回答用户的问题
## 回答的格式

你的回答要表示是基于哪些块的内容回答的，表现方式是在对应回答的后面添加 :[种花心得(这个块的内容摘要)](siyuan://blocks/20240113141417-va4uedb(笔记块的id))
例如 :

提问:怎么养兰花
回答:

1. 保持适宜的空气湿度 [养兰花的第三天](siyuan://blocks/20130123242415-ad32fad12)
2. 需要准备的一些工具:.....  [种花心得](siyuan://blocks/20160133242325-d23dfg1)

## 注意你的回答最后面附加的链接 [] 内填的是这个块的摘要文本 () 中的 siyuan://blocks/id 是思源特有的链接方式
`,
      },
      {
        role: 'assistant',
        content: `检索到的内容:\n${searchMd}`,
      },
      { role: 'user', content: userInput },
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  const data = completion;
  return {
    res: data.choices[0].message!.content!,
    raw: data,
  };
}
export async function ai翻译为英文(ai: AI, userInput: string) {
  const completion = await ai.openai.chat.completions.create({
    model: ai.model ?? model$.value,
    messages: [
      {
        role: 'system',
        content: `你是一名翻译助手，专门将用户输入的内容翻译为英文。请确保翻译的准确性和流畅性。
## 注意

1. 仅输出译文
2. 原文是 kramdown 格式的，会有 {: id="20250306213356-961wtvs" updated="20250306213413"} 这样的属性，你不要输出其中的 id`,
      },
      { role: 'user', content: `请将以下内容翻译为英文：\n${userInput}` },
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  const data = completion;
  return {
    res: data.choices[0].message!.content!,
    raw: data,
  };
}

async function batchSearch(keywords: string[]) {
  async function search(query: string) {
    return await fetchSyncPost('/api/search/fullTextSearchBlock', {
      query,
      method: 0,
      types: {
        audioBlock: true,
        blockquote: true,
        codeBlock: true,
        databaseBlock: true,
        document: true,
        embedBlock: true,
        heading: true,
        htmlBlock: true,
        iframeBlock: true,
        list: false,
        listItem: false,
        mathBlock: true,
        paragraph: true,
        superBlock: true,
        table: false,
        videoBlock: true,
        widgetBlock: true,
      },
      paths: [],
      groupBy: 0,
      orderBy: 0,
      page: 1,
      reqId: Date.now(),
    }).then((r) => ({
      blocks: r.data.blocks as any[],
      query,
    }));
  }

  const searchRes = await Promise.all(keywords.map((el) => search(el)));

  return searchRes;
}
async function batchSearchParse(keywords: string[]) {
  const searchRes = await batchSearch(keywords);
  let s = `# 搜索结果json：\n
${JSON.stringify(
  searchRes.map((el) => {
    return {
      query: el.query,
      blocks: el.blocks.map((block) => ({
        id: block.id,
        md: block.markdown,
      })),
    };
  }),
)}}`;

  return s;
}

export interface SearchState {
  isSearching: boolean;
  currentStep: string;
  round: number;
  keywords: string[];
  searchResults: any[];
  thinkingProcess: string[];
}

export const searchState = reactive<SearchState>({
  isSearching: false,
  currentStep: '',
  round: 0,
  keywords: [],
  searchResults: [],
  thinkingProcess: []
});

export interface SearchRoundResult {
  round: number;
  keywords: string[];
  searchResults: any[];
  analysis: string;
  needMoreSearch: boolean;
  nextKeywords?: string[];
}

export async function ai分析搜索结果(ai: AI, userInput: string, searchResults: any[], round: number): Promise<{
  analysis: string;
  needMoreSearch: boolean;
  nextKeywords?: string[];
}> {
  const completion = await ai.openai.chat.completions.create({
    model: ai.model ?? model$.value,
    messages: [
      {
        role: 'system',
        content: `你是一个智能搜索分析助手。你需要分析当前的搜索结果，判断是否需要进一步搜索来更好地回答用户的问题。

你的任务是：
1. 分析当前搜索结果的质量和相关性
2. 判断是否需要更多搜索来获取更全面的信息
3. 如果需要更多搜索，提供新的搜索关键词

回答格式必须是有效的 JSON 对象：
{
  "analysis": "对当前搜索结果的分析...",
  "needMoreSearch": true/false,
  "nextKeywords": ["关键词1", "关键词2"] (仅在 needMoreSearch 为 true 时提供)
}

如果信息已经足够，needMoreSearch 设为 false，不需要提供 nextKeywords。`
      },
      {
        role: 'user',
        content: `用户问题：${userInput}

当前搜索轮次：${round + 1}

搜索结果：
${JSON.stringify(searchResults, null, 2)}

请分析这些搜索结果，判断是否需要进一步搜索。`
      }
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  
  const data = completion;
  const response = data.choices[0].message!.content!;
  
  try {
    return JSON.parse(response);
  } catch (error) {
    // 如果返回的不是有效 JSON，尝试提取
    return {
      analysis: response,
      needMoreSearch: false
    };
  }
}

export async function 执行自主多轮搜索(userInput: string, maxRounds: number = 3, onStateUpdate?: (state: SearchState) => void): Promise<{
  finalAnswer: string;
  searchRounds: SearchRoundResult[];
}> {
  searchState.isSearching = true;
  searchState.round = 0;
  searchState.thinkingProcess = [];
  searchState.searchResults = [];
  
  try {
    const searchRounds: SearchRoundResult[] = [];
    
    for (let round = 0; round < maxRounds; round++) {
      searchState.round = round;
      searchState.currentStep = `第 ${round + 1} 轮搜索`;
      
      if (onStateUpdate) {
        onStateUpdate({ ...searchState });
      }
      
      // 第1轮：提取关键词并搜索
      if (round === 0) {
        searchState.currentStep = '分析问题并提取搜索关键词';
        if (onStateUpdate) onStateUpdate({ ...searchState });
        
        const keywords = (await ai搜索关键词提取({ openai: openai$.value }, userInput)).res;
        searchState.keywords = keywords;
        searchState.thinkingProcess.push(`提取到关键词：${keywords.join(', ')}`);
        
        searchState.currentStep = `搜索关键词：${keywords.join(', ')}`;
        if (onStateUpdate) onStateUpdate({ ...searchState });
        
        const searchResults = await batchSearch(keywords);
        searchState.searchResults = searchResults;
        
        const roundResult: SearchRoundResult = {
          round,
          keywords,
          searchResults,
          analysis: '',
          needMoreSearch: true
        };
        
        searchRounds.push(roundResult);
      } 
      // 后续轮次：分析结果并决定是否继续搜索
      else {
        searchState.currentStep = '分析搜索结果';
        if (onStateUpdate) onStateUpdate({ ...searchState });
        
        const analysis = await ai分析搜索结果(
          { openai: openai$.value }, 
          userInput, 
          searchState.searchResults, 
          round
        );
        
        searchState.thinkingProcess.push(`分析结果：${analysis.analysis}`);
        
        if (!analysis.needMoreSearch || !analysis.nextKeywords || analysis.nextKeywords.length === 0) {
          searchState.currentStep = '搜索完成，生成最终答案';
          if (onStateUpdate) onStateUpdate({ ...searchState });
          break;
        }
        
        searchState.currentStep = `进行第 ${round + 1} 轮搜索：${analysis.nextKeywords.join(', ')}`;
        if (onStateUpdate) onStateUpdate({ ...searchState });
        
        const newSearchResults = await batchSearch(analysis.nextKeywords);
        searchState.searchResults = [...searchState.searchResults, ...newSearchResults];
        searchState.thinkingProcess.push(`新增搜索结果：${newSearchResults.length} 条`);
        
        const roundResult: SearchRoundResult = {
          round,
          keywords: analysis.nextKeywords,
          searchResults: newSearchResults,
          analysis: analysis.analysis,
          needMoreSearch: analysis.needMoreSearch,
          nextKeywords: analysis.nextKeywords
        };
        
        searchRounds.push(roundResult);
      }
    }
    
    searchState.currentStep = '整合所有搜索结果并生成最终答案';
    if (onStateUpdate) onStateUpdate({ ...searchState });
    
    // 生成最终答案
    const searchMd = batchSearchParseFormat(searchState.searchResults);
    const finalAnswer = (await ai回答({ openai: openai$.value }, userInput, searchMd)).res;
    
    return {
      finalAnswer,
      searchRounds
    };
    
  } finally {
    searchState.isSearching = false;
    searchState.currentStep = '搜索完成';
    if (onStateUpdate) onStateUpdate({ ...searchState });
  }
}

function batchSearchParseFormat(searchResults: any[]): string {
  let s = `# 搜索结果json：\n
${JSON.stringify(
  searchResults.map((el) => {
    return {
      query: el.query,
      blocks: el.blocks.map((block: any) => ({
        id: block.id,
        md: block.markdown,
      })),
    };
  }),
)}`;
  return s;
}

export async function 执行ai问答(userInput: string) {
  const keywords = (await ai搜索关键词提取({ openai: openai$.value }, userInput)).res;
  console.log('keywords', keywords);
  const searchMd = await batchSearchParse(keywords);
  console.log('searchMd', searchMd);
  const aiRes = await ai回答({ openai: openai$.value }, userInput, searchMd);
  console.log('aiRes', aiRes);
  return aiRes;
}
