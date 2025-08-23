import OpenAI from 'openai';
import { fetchSyncPost } from 'siyuan';
import { computed, reactive } from 'vue';

// 思源 API 返回类型定义
interface 思源搜索块 {
  id: string;
  markdown: string;
  content: string;
  type: string;
  box: string;
  path: string;
  hpath: string;
  created: string;
  updated: string;
}

interface 思源搜索响应 {
  code: number;
  msg: string;
  data: {
    blocks: 思源搜索块[];
  };
}

interface 思源API响应<T> {
  code: number;
  msg: string;
  data: T;
}

export const aiChatConfig = reactive({
  apiBaseUrl: '',
  apiKey: '',
  model: '',
  apiProvider: 'siyuan' as 'siyuan' | 'openai' | '崮生',
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
  const completion = await ai.openai.chat.completions.create({
    model: ai.model ?? model$.value,
    messages: [
      {
        role: 'system',
        content: `你是一名专业搜索助理，专门协助用户构建高级搜索查询。你需要根据用户的问题提取关键词并考虑 Full-text Query Syntax 的优化。

## Full-text Query Syntax 语法知识

### 高级搜索功能
1. **NEAR() 邻近搜索**：查找指定距离内的词语，如 NEAR(机器学习 算法, 5)
2. **AND/OR/NOT 逻辑操作**：精确控制搜索逻辑
3. **^ 权重提升**：提高某些词的重要性，如 ^深度学习
4. **- 排除功能**：排除不相关内容，如 -广告
5. **() 分组**：构建复杂查询，如 (机器学习 OR 深度学习) AND 应用
6. **\* 前缀匹配**：匹配词根，如 comput*
7. **列指定搜索**：在特定列中搜索，如 content:人工智能

## 你的任务
1. 分析用户问题的核心概念和关键词
2. 考虑如何使用 FTS 语法构建更精确的搜索
3. 提供关键词列表，既要包含简单关键词，也要考虑可以组合成高级查询的词组
4. 平衡搜索精度和召回率

## 输出要求
- 格式：JSON 字符串数组，确保可以被 JSON.parse
- 包含：核心关键词、同义词、可以用于 NEAR 查询的词组对
- 数量：5-10 个最相关的关键词/词组

示例：
用户: "如何学习机器学习和深度学习"
你: ["机器学习", "深度学习", "算法", "神经网络", "学习教程", "实战项目", "理论基础", "编程实现"]

要求：只返回 JSON 数组，不要包含其他说明文字。`,
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

// 混合搜索策略
interface 搜索策略 {
  类型: '原始查询' | '关键词提取' | '语义扩展' | '同义词搜索' | '针对性搜索' | '高级FTS查询';
  权重: number;
  查询: string;
}

interface 搜索结果项 {
  id: string;
  markdown: string;
  相关性得分: number;
  内容质量得分: number;
  时效性得分: number;
  最终得分: number;
  搜索类型: string;
  查询词: string;
  策略权重?: number;
}

// 兼容旧版本的搜索结果类型
interface 传统搜索结果 {
  blocks: 思源搜索块[];
  query: string;
}

// 统一的搜索结果类型
type 统一搜索结果 = 搜索结果项 | 传统搜索结果;

// 判断是否为搜索结果项
function 是搜索结果项(结果: 统一搜索结果): 结果 is 搜索结果项 {
  return 'id' in 结果 && 'markdown' in 结果;
}

// 转换传统搜索结果为搜索结果项
function 转换搜索结果(结果: 传统搜索结果): 搜索结果项[] {
  return 结果.blocks.map(block => ({
    id: block.id,
    markdown: block.markdown,
    相关性得分: 0,
    内容质量得分: 0,
    时效性得分: 0,
    最终得分: 0,
    搜索类型: '传统搜索',
    查询词: 结果.query
  }));
}

interface 自适应搜索状态 {
  轮次: number;
  收敛度: number;
  信息增益: number;
  核心概念覆盖度: number;
}

async function 原始查询搜索(userInput: string, method: number = 1): Promise<{
  blocks: 思源搜索块[];
  query: string;
  type: string;
}> {
  const response = await fetchSyncPost('/api/search/fullTextSearchBlock', {
    query: userInput,
    method: method,
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
  });
  
  const 搜索响应 = response as 思源搜索响应;
  
  return {
    blocks: 搜索响应.data.blocks,
    query: userInput,
    type: '原始查询'
  };
}

async function 生成混合搜索策略(用户问题: string, method: number = 1): Promise<搜索策略[]> {
  if (method === 1) {
    // 使用 Full-text Query Syntax - 直接生成高级查询
    let 高级查询 = '';
    try {
      const 高级查询Promise = ai生成高级搜索查询({ openai: openai$.value }, 用户问题);
      高级查询 = (await 高级查询Promise).res;
    } catch (error) {
      console.error('高级查询生成失败，使用回退策略', error);
      // 如果高级查询生成失败，使用简单查询
      高级查询 = 用户问题.split(/\s+/).slice(0, 3).join(' OR '); // 取前3个关键词用OR连接
    }

    return [
      {
        类型: '高级FTS查询',
        权重: 0.7,
        查询: 高级查询
      },
      {
        类型: '原始查询',
        权重: 0.3,
        查询: 用户问题
      }
    ];
  } else {
    // 使用传统查询方式 - 保留向后兼容
    let 关键词提取 = { res: [用户问题] };
    let 语义扩展 = { res: '' };
    let 同义词扩展 = { res: '' };
    
    try {
      const 关键词提取Promise = ai搜索关键词提取({ openai: openai$.value }, 用户问题);
      const 语义扩展Promise = ai语义扩展({ openai: openai$.value }, 用户问题);
      const 同义词扩展Promise = ai同义词扩展({ openai: openai$.value }, 用户问题);

      [关键词提取, 语义扩展, 同义词扩展] = await Promise.all([
        关键词提取Promise,
        语义扩展Promise,
        同义词扩展Promise
      ]);
    } catch (error) {
      console.error('关键词提取失败，使用回退策略', error);
      // 如果提取失败，使用简单的关键词分割
      关键词提取.res = 用户问题.split(/\s+/).filter(word => word.length > 1);
    }

    return [
      {
        类型: '原始查询',
        权重: 0.4,
        查询: 用户问题
      },
      {
        类型: '关键词提取',
        权重: 0.3,
        查询: Array.isArray(关键词提取.res) ? 关键词提取.res.join(' ') : 关键词提取.res
      },
      {
        类型: '语义扩展',
        权重: 0.2,
        查询: 语义扩展.res
      },
      {
        类型: '同义词搜索',
        权重: 0.1,
        查询: 同义词扩展.res
      }
    ];
  }
}

async function AI选择搜索策略(ai: AI, 用户问题: string, 当前结果: 搜索结果项[], 有效性评估: any): Promise<{
  优化查询: string;
  策略说明: string;
  预期改进: string;
}> {
  try {
    const completion = await ai.openai.chat.completions.create({
      model: ai.model ?? model$.value,
      messages: [
        {
          role: 'system',
          content: `你是一个搜索策略优化专家。根据当前搜索结果的AI评估，选择最适合的下一步搜索策略。

## 当前状况
- 用户问题: ${用户问题}
- 搜索结果数量: ${当前结果.length}
- AI有效性评分: ${有效性评估.有效性评分.toFixed(2)}
- 高质量结果数: ${有效性评估.高质量结果数}
- 质量分布: ${有效性评估.质量分布}
- AI建议策略: ${有效性评估.建议策略}

## 策略选择原则

### 质量差（评分 < 0.3）
- 扩大搜索范围，使用更宽松的条件
- 移除复杂语法，采用基本关键词OR连接
- 添加更多同义词和相关词汇

### 质量一般（评分 0.3-0.6）
- 调整关键词，使用更准确的术语
- 优化搜索精度，针对缺失概念搜索
- 改变搜索角度，尝试不同表述

### 质量较好但不够全面（评分 0.6-0.8）
- 针对性补充搜索，覆盖缺失方面
- 搜索更具体的技术细节或案例
- 从不同角度深化相关内容

### 质量优秀（评分 > 0.8）
- 仅在建议继续搜索时进行补充搜索
- 搜索相关的扩展信息或最新内容

## 搜索语法优化技巧
1. 避免过度使用AND，容易导致零结果
2. 优先使用OR连接同义词
3. NEAR距离设置在10-15之间比较合适
4. 对核心概念使用权重提升^
5. 适当使用-排除明显无关内容

## 输出要求
返回JSON格式：
{
  "优化查询": "新的搜索查询字符串",
  "策略说明": "选择此策略的详细原因",
  "预期改进": "预期达到的搜索效果"
}

最重要原则：确保能找到相关结果，宁可结果多一些也不要零结果`,
        },
        {
          role: 'user',
          content: `用户问题：${用户问题}

当前使用的查询：${当前结果[0]?.查询词 || '未知'}

AI评估结果：
- 有效性评分：${有效性评估.有效性评分.toFixed(2)}/1.0
- 高质量结果数：${有效性评估.高质量结果数}个
- 结果总数：${当前结果.length}个
- 质量分布：${有效性评估.质量分布}
- 相关性分析：${有效性评估.相关性分析}
- 建议继续搜索：${有效性评估.建议继续搜索}
- AI建议策略：${有效性评估.建议策略}

请基于AI的专业评估，选择最适合的搜索策略并提供优化后的查询字符串。`,
        },
      ],
      max_tokens: 1024,
      temperature: 0.3,
      stream: false,
    });

    const response = completion.choices[0].message!.content!;
    
    try {
      return JSON.parse(response);
    } catch (error) {
      // 如果JSON解析失败，返回默认策略
      return {
        优化查询: 用户问题.split(/\s+/).filter(word => word.length > 1).slice(0, 3).join(' OR '),
        策略说明: "AI分析失败，使用默认简化策略",
        预期改进: "扩大搜索范围以获得更多结果"
      };
    }
  } catch (error) {
    console.error('搜索策略选择失败:', error);
    return {
      优化查询: 用户问题.split(/\s+/).filter(word => word.length > 1).slice(0, 3).join(' OR '),
      策略说明: "策略选择失败，使用回退策略",
      预期改进: "使用简化查询确保有搜索结果"
    };
  }
}

async function ai分析搜索结果并优化查询(ai: AI, originalQuery: string, searchResults: 搜索结果项[], userQuestion: string): Promise<{
  优化查询: string;
  分析报告: string;
  需要再次搜索: boolean;
}> {
  const completion = await ai.openai.chat.completions.create({
    model: ai.model ?? model$.value,
    messages: [
      {
        role: 'system',
        content: `你是一个搜索结果分析专家，专门分析搜索效果并优化查询语句。重点是解决"零结果"和"结果过少"的问题。

## 关键分析指标

### 结果数量判断
- **零结果（0个）**：查询过于严格，必须大幅放宽条件
- **结果过少（1-3个）**：查询较严格，需要放宽条件
- **结果适中（4-15个）**：查询合理，可以微调
- **结果过多（20+个）**：查询过宽，可以增加限制

### 零结果/结果过少的优化策略

#### 紧急放宽措施（优先级从高到低）
1. **去掉所有 AND 条件**：AND 是导致零结果的主要原因
2. **用 OR 替换 NEAR**：NEAR 太严格，改为 OR 连接
3. **扩大 NEAR 距离**：如果保留 NEAR，距离改为 15-20
4. **添加更多同义词**：用 OR 连接更多相关词汇
5. **去掉权重限制**：暂时去掉 ^ 符号
6. **去掉排除条件**：暂时去掉 - 条件
7. **使用核心词的单独搜索**：只搜索最重要的1-2个词

#### 查询简化模式
原始: "NEAR(sqlite 数据库, 5) AND (特点 OR 评价) AND ^介绍"
简化1: "sqlite OR 数据库 OR 特点 OR 评价 OR 介绍"
简化2: "sqlite 数据库"
简化3: "sqlite"

### 结果质量优化
- **不相关**：调整关键词，使用更常见的同义词
- **覆盖不全**：添加缺失的关键概念
- **质量差**：^提升核心词权重，-排除干扰词

## 输出格式
返回JSON格式：
{
  "优化查询": "新的FTS查询语句",
  "分析报告": "对当前结果的分析说明",
  "需要再次搜索": true/false
}

## 重要原则
- 零结果时必须大幅放宽查询条件
- 优先保证有结果，再考虑精确性
- 宁可结果多一些，也不要零结果`,
      },
      {
        role: 'user',
        content: `原始查询：${originalQuery}

用户问题：${userQuestion}

搜索结果数量：${searchResults.length}

${searchResults.length === 0 ? '⚠️ 警告：搜索结果为零，需要大幅放宽查询条件！' : 
  searchResults.length <= 3 ? '⚠️ 警告：搜索结果过少，需要放宽查询条件！' : 
  searchResults.length > 20 ? '⚠️ 提醒：搜索结果较多，可以考虑增加限制。' : '✅ 搜索结果数量适中。'}

${searchResults.length > 0 ? `搜索结果摘要：
${searchResults.slice(0, 3).map(r => `ID: ${r.id}\n内容：${r.markdown.substring(0, 100)}...`).join('\n\n')}` : '无搜索结果'}

请分析搜索效果并提供具体的优化建议。如果结果为零或过少，请大幅放宽查询条件。`,
      },
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  
  const response = completion.choices[0].message!.content!;
  
  try {
    return JSON.parse(response);
  } catch (error) {
    // 如果返回的不是有效 JSON，返回默认值
    return {
      优化查询: originalQuery,
      分析报告: response,
      需要再次搜索: false
    };
  }
}

async function ai生成高级搜索查询(ai: AI, userInput: string): Promise<{ res: string; raw: any }> {
  const completion = await ai.openai.chat.completions.create({
    model: ai.model ?? model$.value,
    messages: [
      {
        role: 'system',
        content: `你是一个专业的高级搜索查询构建助手。根据用户问题构建既精确又能找到结果的 FTS 查询。

## Full-text Query Syntax 语法

### 基本操作符
1. **OR** - 逻辑或：包含任一即可（优先使用，保证搜索结果）
2. **NEAR(词1 词2, N)** - 邻近搜索：距离在N词内，如 NEAR(机器学习 算法, 10)
3. **AND** - 逻辑与：必须同时包含（谨慎使用，容易导致零结果）
4. **^词** - 权重提升：提高重要性，如 ^深度学习
5. **-词** - 排除：明确排除，如 -广告
6. **(查询)** - 分组：组合逻辑，如 (机器学习 OR 深度学习)

## 重要原则

### 避免"零结果"的策略
1. **优先使用 OR**：对同义词、相关词用 OR 连接
2. **谨慎使用 AND**：只在确定必须同时出现时使用
3. **放宽 NEAR 距离**：使用 10-15 的较大距离
4. **多层次查询**：主查询 OR (备选查询1) OR (备选查询2)
5. **避免过度限制**：不要堆砌太多 AND 条件

### 查询构建优先级
1. **核心词 OR 相关词**：保证基础搜索结果
2. **NEAR(核心词 相关词, 10-15)**：提升精确度但不过度限制
3. **选择性 AND**：只对绝对必要的条件使用 AND
4. **权重提升**：对最重要概念使用 ^
5. **排除干扰**：只对明显无关内容使用 -

## 实际示例

### 技术类问题
用户: "如何用Python实现机器学习算法"
❌ 错误: "NEAR(Python 机器学习, 5) AND (算法 OR 实现) AND ^教程"
✅ 正确: "Python OR 机器学习 OR 算法 OR 实现 OR NEAR(Python 机器学习, 12) OR ^教程"

### 概念解释类
用户: "什么是深度学习和神经网络"
❌ 错误: "NEAR(深度学习 神经网络, 5) AND (定义 AND 原理)"
✅ 正确: "深度学习 OR 神经网络 OR 定义 OR 原理 OR NEAR(深度学习 神经网络, 15) OR ^基础"

### 特点评价类
用户: "sqlite数据库的特点和评价"
❌ 错误: "NEAR(sqlite 数据库, 5) AND (特点 OR 评价 OR 优缺点) AND ^介绍"
✅ 正确: "sqlite OR 数据库 OR 特点 OR 评价 OR 优缺点 OR NEAR(sqlite 数据库, 12)"

### 实践指导类
用户: "如何养兰花需要注意什么"
❌ 错误: "NEAR(兰花 养殖, 6) AND (注意 OR 要点) AND ^方法"
✅ 正确: "兰花 OR 养殖 OR 注意 OR 要点 OR NEAR(兰花 养殖, 15) OR ^方法"

## 构建思路
1. 先用 OR 连接所有关键词确保有结果
2. 选择性添加 NEAR 提升精确度
3. 谨慎使用 AND 只对必要条件
4. 对核心概念提升权重

输出要求：只返回一个查询字符串，不要解释。`,
      },
      { role: 'user', content: userInput },
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  
  return {
    res: completion.choices[0].message!.content!.trim(),
    raw: completion,
  };
}

async function 执行混合搜索(搜索策略列表: 搜索策略[], method: number = 1): Promise<搜索结果项[]> {
  const 搜索Promise = 搜索策略列表.map(async (策略) => {
    try {
      const 结果 = await fetchSyncPost('/api/search/fullTextSearchBlock', {
        query: 策略.查询,
        method: method,
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
      });

      const 搜索响应 = 结果 as 思源搜索响应;

      return 搜索响应.data.blocks.map((block: 思源搜索块) => ({
        id: block.id,
        markdown: block.markdown,
        相关性得分: 0,
        内容质量得分: 0,
        时效性得分: 0,
        最终得分: 0,
        搜索类型: 策略.类型,
        查询词: 策略.查询,
        策略权重: 策略.权重
      }));
    } catch (error) {
      console.error(`搜索失败 [${策略.类型}]: ${策略.查询}`, error);
      return [] as 搜索结果项[];
    }
  });

  const 所有结果 = await Promise.all(搜索Promise);
  const 合并结果 = 所有结果.flat();
  
  // 如果没有任何结果，尝试回退搜索策略
  if (合并结果.length === 0) {
    console.log('高级搜索策略无结果，尝试回退到简单搜索');
    const 回退结果 = await 执行回退搜索(搜索策略列表[0]?.查询 || '', method);
    return 回退结果;
  }
  
  return 合并结果;
}

async function 执行回退搜索(原始查询: string, method: number = 1): Promise<搜索结果项[]> {
  try {
    // 提取简单的关键词
    const 简化查询 = 原始查询
      .replace(/NEAR\([^)]+\)/g, '') // 移除NEAR查询
      .replace(/\^/g, '') // 移除权重符号
      .replace(/-/g, '') // 移除排除符号
      .replace(/AND/g, 'OR') // 将AND改为OR
      .replace(/\([^)]+\)/g, '') // 移除括号分组
      .replace(/\s+/g, ' ') // 合并空格
      .trim();

    console.log(`执行回退搜索：${简化查询}`);

    const 结果 = await fetchSyncPost('/api/search/fullTextSearchBlock', {
      query: 简化查询,
      method: method,
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
    });

    const 搜索响应 = 结果 as 思源搜索响应;

    return 搜索响应.data.blocks.map((block: 思源搜索块) => ({
      id: block.id,
      markdown: block.markdown,
      相关性得分: 0,
      内容质量得分: 0,
      时效性得分: 0,
      最终得分: 0,
      搜索类型: '回退搜索',
      查询词: 简化查询,
      策略权重: 0.5
    }));
  } catch (error) {
    console.error('回退搜索失败:', error);
    return [] as 搜索结果项[];
  }
}


// AI评估搜索结果的有效性
async function AI评估搜索结果有效性(ai: AI, 搜索结果: 搜索结果项[], 用户问题: string): Promise<{
  有效性评分: number; // 0-1分
  高质量结果数: number;
  相关性分析: string;
  建议继续搜索: boolean;
  建议策略: string;
  质量分布: string; // 质量分布描述
}> {
  if (搜索结果.length === 0) {
    return {
      有效性评分: 0,
      高质量结果数: 0,
      相关性分析: "没有搜索结果",
      建议继续搜索: true,
      建议策略: "需要尝试更宽松的搜索条件",
      质量分布: "无结果"
    };
  }

  try {
    const completion = await ai.openai.chat.completions.create({
      model: ai.model ?? model$.value,
      messages: [
        {
          role: 'system',
          content: `你是一个搜索结果质量评估专家。请仔细分析搜索结果与用户问题的相关性，并给出专业的评估。

## 评估维度

### 1. 相关性评分 (0-1分)
- **完全相关(0.9-1.0)**: 直接回答用户问题，内容精准匹配
- **高度相关(0.7-0.8)**: 核心内容相关，能提供有价值信息
- **中等相关(0.5-0.6)**: 部分相关，有一定参考价值
- **低度相关(0.3-0.4)**: 间接相关，参考价值有限
- **基本无关(0.0-0.2)**: 几乎不相关，无实质帮助

### 2. 内容质量评估
- **信息深度**: 内容是否详细、深入
- **准确性**: 信息是否准确、专业
- **时效性**: 信息是否过时
- **实用性**: 是否对用户有实际帮助

### 3. 覆盖度评估
- **问题覆盖**: 是否覆盖了用户问题的各个方面
- **角度多样性**: 是否提供了不同角度的信息
- **完整性**: 信息是否完整

## 输出要求
必须返回有效的JSON格式：
{
  "有效性评分": 0.75,
  "高质量结果数": 3,
  "相关性分析": "详细的分析说明...",
  "建议继续搜索": true,
  "建议策略": "具体的改进建议...",
  "质量分布": "高质量:2个, 中等:3个, 低质量:1个"
}

## 评估原则
1. 严格根据内容与问题的实际相关性评分
2. 宁可评分保守，也不要过于乐观
3. 如果结果质量一般，建议继续搜索
4. 优先考虑结果的质量而非数量`,
        },
        {
          role: 'user',
          content: `用户问题：${用户问题}

搜索结果数量：${搜索结果.length}

搜索结果内容：
${搜索结果.map((结果, index) => `
结果${index + 1}:
ID: ${结果.id}
内容: ${结果.markdown.substring(0, 300)}${结果.markdown.length > 300 ? '...' : ''}
搜索类型: ${结果.搜索类型}
查询词: ${结果.查询词}
`).join('\n')}

请对这些搜索结果进行全面的质效评估。`,
        },
      ],
      max_tokens: 1024,
      temperature: 0.2,
      stream: false,
    });

    const response = completion.choices[0].message!.content!;
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('AI评估解析失败:', error);
      // 如果解析失败，返回保守的默认评估
      return {
        有效性评分: 0.3,
        高质量结果数: 0,
        相关性分析: "AI评估失败，采用保守评估",
        建议继续搜索: true,
        建议策略: "需要尝试不同的搜索策略",
        质量分布: "未知"
      };
    }
  } catch (error) {
    console.error('AI评估失败:', error);
    return {
      有效性评分: 0.2,
      高质量结果数: 0,
      相关性分析: "评估过程失败",
      建议继续搜索: true,
      建议策略: "需要重新尝试搜索",
      质量分布: "评估失败"
    };
  }
}

function 计算内容质量得分(结果: 搜索结果项): number {
  const 内容 = 结果.markdown;
  let 得分 = 0;
  
  // 内容长度评分
  if (内容.length > 50) 得分 += 0.3;
  if (内容.length > 200) 得分 += 0.2;
  
  // 结构化内容评分
  if (内容.includes('#')) 得分 += 0.2;
  if (内容.includes('```')) 得分 += 0.1;
  if (内容.includes('- ') || 内容.includes('* ')) 得分 += 0.1;
  
  // 代码块评分
  if (内容.includes('```')) 得分 += 0.1;
  
  return Math.min(得分, 1);
}

function 计算时效性得分(结果: 搜索结果项): number {
  // 简单的时效性计算，可以根据实际需求调整
  const 内容 = 结果.markdown;
  let 得分 = 0.5; // 默认分数
  
  // 检查是否包含时间相关信息
  if (内容.includes('2024') || 内容.includes('2023')) {
    得分 += 0.3;
  }
  
  return Math.min(得分, 1);
}

async function 智能排序结果(结果列表: 搜索结果项[], 用户问题: string): Promise<搜索结果项[]> {
  return 结果列表.map(结果 => ({
    ...结果,
    相关性得分: 0.5, // 简化处理，让AI评估来决定质量
    内容质量得分: 计算内容质量得分(结果),
    时效性得分: 计算时效性得分(结果),
    最终得分: (
      0.5 + // 基础相关性得分
      计算内容质量得分(结果) * 0.3 +
      计算时效性得分(结果) * 0.2 +
      (结果.策略权重 || 0) * 0.1
    )
  })).sort((a, b) => b.最终得分 - a.最终得分);
}

function 去重结果(结果列表: 搜索结果项[]): 搜索结果项[] {
  const 已见ID = new Set<string>();
  return 结果列表.filter(结果 => {
    if (已见ID.has(结果.id)) {
      return false;
    }
    已见ID.add(结果.id);
    return true;
  });
}

function 计算信息增益(已有结果: 搜索结果项[], 新结果: 搜索结果项[]): number {
  const 已有内容 = new Set(已有结果.map(r => r.markdown.substring(0, 100)));
  const 新增内容 = 新结果.filter(r => !已有内容.has(r.markdown.substring(0, 100)));
  
  if (新结果.length === 0) return 0;
  return 新增内容.length / 新结果.length;
}

function 计算收敛度(结果列表: 搜索结果项[]): number {
  if (结果列表.length < 5) return 0;
  
  // 计算得分分布的收敛程度
  const 得分列表 = 结果列表.map(r => r.最终得分);
  const 平均得分 = 得分列表.reduce((a, b) => a + b, 0) / 得分列表.length;
  const 标准差 = Math.sqrt(得分列表.reduce((sum, score) => sum + Math.pow(score - 平均得分, 2), 0) / 得分列表.length);
  
  // 标准差越小，收敛度越高
  return Math.max(0, 1 - 标准差);
}

async function ai语义扩展(ai: AI, userInput: string) {
  const completion = await ai.openai.chat.completions.create({
    model: ai.model ?? model$.value,
    messages: [
      {
        role: 'system',
        content: `你是一个语义扩展助手。请将用户的输入扩展为更广泛的搜索查询。

要求：
1. 识别用户问题的核心概念
2. 提供相关的同义词和近义词
3. 扩展为更全面的搜索查询
4. 返回一个字符串，包含扩展后的查询词，用空格分隔

示例：
用户: "如何养兰花"
你: "兰花养护 种植方法 花卉管理 养花技巧"
`,
      },
      { role: 'user', content: userInput },
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  
  return {
    res: completion.choices[0].message!.content!.trim(),
    raw: completion,
  };
}

async function ai同义词扩展(ai: AI, userInput: string) {
  const completion = await ai.openai.chat.completions.create({
    model: ai.model ?? model$.value,
    messages: [
      {
        role: 'system',
        content: `你是一个同义词扩展助手。请为用户的输入提供同义词和近义词。

要求：
1. 识别关键词汇
2. 提供同义词和近义词
3. 返回一个字符串，包含同义词，用空格分隔

示例：
用户: "编程学习"
你: "编程 开发 代码 编码 学习 教育 培训"
`,
      },
      { role: 'user', content: userInput },
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  
  return {
    res: completion.choices[0].message!.content!.trim(),
    raw: completion,
  };
}

async function ai分析搜索结果覆盖度(ai: AI, userInput: string, searchResults: 搜索结果项[]): Promise<{
  核心概念缺失: string[];
  需要深入的概念: string[];
  覆盖度评分: number;
}> {
  const completion = await ai.openai.chat.completions.create({
    model: ai.model ?? model$.value,
    messages: [
      {
        role: 'system',
        content: `你是一个搜索结果分析助手。请分析当前搜索结果对用户问题的覆盖程度。

要求：
1. 识别用户问题的核心概念
2. 分析搜索结果是否覆盖了这些核心概念
3. 指出缺失的概念和需要深入的概念
4. 评估整体覆盖度

回答格式必须是有效的 JSON 对象：
{
  "核心概念缺失": ["概念1", "概念2"],
  "需要深入的概念": ["概念3", "概念4"],
  "覆盖度评分": 0.8
}
`,
      },
      {
        role: 'user',
        content: `用户问题：${userInput}

搜索结果摘要：
${searchResults.slice(0, 10).map(r => r.markdown.substring(0, 200)).join('\n\n')}

请分析搜索结果的覆盖度。`
      }
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  
  const response = completion.choices[0].message!.content!;
  
  try {
    return JSON.parse(response);
  } catch (error) {
    // 如果返回的不是有效 JSON，返回默认值
    return {
      核心概念缺失: [],
      需要深入的概念: [],
      覆盖度评分: 0.5
    };
  }
}

async function 执行自适应搜索(用户问题: string, method: number = 1, onStateUpdate?: (state: SearchState) => void): Promise<{
  最终结果: 搜索结果项[];
  搜索状态: 自适应搜索状态[];
  搜索轮次: number;
}> {
  const 搜索状态历史: 自适应搜索状态[] = [];
  let 轮次 = 0;
  let 最终结果: 搜索结果项[] = [];
  let 收敛度 = 0;
  
  while (轮次 < 8 && 收敛度 < 0.8) {
    if (onStateUpdate) {
      onStateUpdate({
        isSearching: true,
        currentStep: `第 ${轮次 + 1} 轮自适应搜索`,
        round: 轮次,
        keywords: [],
        searchResults: 最终结果,
        thinkingProcess: [`收敛度: ${收敛度.toFixed(2)}`]
      });
    }
    
    let 新结果: 搜索结果项[] = [];
    
    if (轮次 === 0) {
      // 第一轮：执行混合搜索
      const 搜索策略 = await 生成混合搜索策略(用户问题, method);
      新结果 = await 执行混合搜索(搜索策略, method);
    } else {
      // 后续轮次：基于覆盖度分析进行针对性搜索
      // 过滤出搜索结果项用于覆盖度分析
      const 搜索结果项列表 = 最终结果.filter(是搜索结果项) as 搜索结果项[];
      const 覆盖度分析 = await ai分析搜索结果覆盖度(
        { openai: openai$.value },
        用户问题,
        搜索结果项列表
      );
      
      if (覆盖度分析.核心概念缺失.length === 0 && 覆盖度分析.需要深入的概念.length === 0) {
        break;
      }
      
      // 针对缺失概念进行搜索
      const 针对性查询 = [
        ...覆盖度分析.核心概念缺失,
        ...覆盖度分析.需要深入的概念
      ].join(' ');
      
      const 针对性结果 = await 执行混合搜索([
        {
          类型: '针对性搜索',
          权重: 0.8,
          查询: 针对性查询
        }
      ], method);
      
      新结果 = 针对性结果;
    }
    
    // 计算信息增益
    const 信息增益 = 计算信息增益(最终结果, 新结果);
    
    // 合并并排序结果
    最终结果 = await 智能排序结果(
      去重结果([...最终结果, ...新结果]),
      用户问题
    );
    
    // 更新收敛度
    收敛度 = 计算收敛度(最终结果);
    
    // 记录状态
    let 覆盖度评分 = 0.5;
    if (轮次 > 0) {
      // 过滤出搜索结果项用于覆盖度分析
      const 搜索结果项列表 = 最终结果.filter(是搜索结果项) as 搜索结果项[];
      const 覆盖度分析 = await ai分析搜索结果覆盖度(
        { openai: openai$.value },
        用户问题,
        搜索结果项列表
      );
      覆盖度评分 = 覆盖度分析.覆盖度评分;
    }
    
    const 当前状态: 自适应搜索状态 = {
      轮次,
      收敛度,
      信息增益,
      核心概念覆盖度: 覆盖度评分
    };
    
    搜索状态历史.push(当前状态);
    
    if (onStateUpdate) {
      onStateUpdate({
        isSearching: true,
        currentStep: `第 ${轮次 + 1} 轮完成，收敛度: ${收敛度.toFixed(2)}`,
        round: 轮次,
        keywords: [],
        searchResults: 最终结果,
        thinkingProcess: [
          `信息增益: ${信息增益.toFixed(2)}`,
          `收敛度: ${收敛度.toFixed(2)}`,
          `找到结果: ${最终结果.length} 条`
        ]
      });
    }
    
    轮次++;
    
    // 使用AI评估当前搜索结果的有效性
    let 有效性评估;
    try {
      有效性评估 = await AI评估搜索结果有效性({ openai: openai$.value }, 最终结果, 用户问题);
    } catch (error) {
      console.error('AI评估失败，使用默认评估', error);
      有效性评估 = {
        有效性评分: 0.2,
        高质量结果数: 0,
        相关性分析: "评估失败",
        建议继续搜索: true,
        建议策略: "需要重新搜索",
        质量分布: "未知"
      };
    }
    
    // 如果信息增益过低，但结果质量很高，可以停止
    if (信息增益 < 0.1 && 有效性评估.有效性评分 >= 0.6) {
      console.log(`信息增益低但结果质量优秀(${有效性评估.有效性评分.toFixed(2)})，停止搜索`);
      break;
    }
    
    // 如果信息增益过低且结果质量一般，但结果数量足够，也可以停止
    if (信息增益 < 0.1 && 有效性评估.有效性评分 >= 0.4 && 最终结果.length >= 5) {
      console.log(`信息增益低但结果质量良好(${有效性评估.有效性评分.toFixed(2)})，停止搜索`);
      break;
    }
    
    // 如果结果质量很高，即使信息增益较低，也可以考虑停止
    if (有效性评估.有效性评分 >= 0.7 && 最终结果.length >= 4) {
      console.log(`结果质量优秀(${有效性评估.有效性评分.toFixed(2)})，停止搜索`);
      break;
    }
    
    // 如果结果仍然很少或质量差，继续搜索
    if (最终结果.length < 3 || 有效性评估.有效性评分 < 0.3) {
      console.log(`结果数量不足或质量较差(${有效性评估.有效性评分.toFixed(2)})，继续搜索`);
      continue;
    }
  }
  
  return {
    最终结果,
    搜索状态: 搜索状态历史,
    搜索轮次: 轮次
  };
}

export async function 执行优化版ai问答(userInput: string, method: number = 1, onStateUpdate?: (state: SearchState) => void): Promise<{
  finalAnswer: string;
  searchResults: 搜索结果项[];
  searchRounds: number;
}> {
  try {
    // 执行自适应搜索
    const { 最终结果, 搜索轮次 } = await 执行自适应搜索(userInput, method, onStateUpdate);
    
    if (onStateUpdate) {
      onStateUpdate({
        isSearching: true,
        currentStep: '生成最终答案',
        round: 搜索轮次,
        keywords: [],
        searchResults: 最终结果,
        thinkingProcess: [`搜索完成，找到 ${最终结果.length} 条结果`]
      });
    }
    
    // 生成搜索结果格式
    const 搜索结果格式 = 最终结果.map(结果 => ({
      query: 结果.查询词,
      blocks: [{
        id: 结果.id,
        md: 结果.markdown
      }]
    }));
    
    const searchMd = `# 搜索结果json：
${JSON.stringify(搜索结果格式, null, 2)}`;
    
    // 生成最终答案
    const aiRes = await ai回答({ openai: openai$.value }, userInput, searchMd);
    
    return {
      finalAnswer: aiRes.res,
      searchResults: 最终结果,
      searchRounds: 搜索轮次
    };
  } catch (error) {
    console.error('优化版AI问答失败:', error);
    // 如果优化版失败，回退到原版
    const 原版结果 = await 执行ai问答(userInput);
    return {
      finalAnswer: 原版结果.res,
      searchResults: [],
      searchRounds: 1
    };
  }
}
async function batchSearch(keywords: string[], method: number = 1): Promise<{
  blocks: 思源搜索块[];
  query: string;
}[]> {
  async function search(query: string): Promise<{
    blocks: 思源搜索块[];
    query: string;
  }> {
    const response = await fetchSyncPost('/api/search/fullTextSearchBlock', {
      query,
      method: method,
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
    });
    
    const 搜索响应 = response as 思源搜索响应;
    
    return {
      blocks: 搜索响应.data.blocks,
      query,
    };
  }

  const searchRes = await Promise.all(keywords.map((el) => search(el)));

  return searchRes;
}

export interface SearchState {
  isSearching: boolean;
  currentStep: string;
  round: number;
  keywords: string[];
  searchResults: 统一搜索结果[];
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
  searchResults: {
    blocks: 思源搜索块[];
    query: string;
  }[];
  analysis: string;
  needMoreSearch: boolean;
  nextKeywords?: string[];
}

export async function ai分析搜索结果(ai: AI, userInput: string, searchResults: {
  blocks: 思源搜索块[];
  query: string;
}[], round: number): Promise<{
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

export async function 执行自主多轮搜索(userInput: string, maxRounds: number = 5, method: number = 1, onStateUpdate?: (state: SearchState) => void): Promise<{
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
      
      // 第1轮：生成高级查询并搜索
      if (round === 0) {
        searchState.currentStep = '分析问题并生成高级搜索查询';
        if (onStateUpdate) onStateUpdate({ ...searchState });
        
        let searchQueries: string[] = [];
        if (method === 1) {
          const 高级查询结果 = await ai生成高级搜索查询({ openai: openai$.value }, userInput);
          searchQueries = [高级查询结果.res, userInput];
          searchState.keywords = [高级查询结果.res];
          searchState.thinkingProcess.push(`生成高级FTS查询：${高级查询结果.res}`);
        } else {
          const keywords = (await ai搜索关键词提取({ openai: openai$.value }, userInput)).res;
          searchQueries = keywords;
          searchState.keywords = keywords;
          searchState.thinkingProcess.push(`提取到关键词：${keywords.join(', ')}`);
        }
        
        searchState.currentStep = `执行查询：${searchQueries[0]}`;
        if (onStateUpdate) onStateUpdate({ ...searchState });
        
        const searchResults = await batchSearch(searchQueries, method);
        searchState.searchResults = searchResults;
        
        const roundResult: SearchRoundResult = {
          round,
          keywords: searchState.keywords,
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
        
        // 转换搜索结果格式以兼容 ai分析搜索结果 函数
        const 兼容搜索结果 = searchState.searchResults.flatMap(结果 => 
          是搜索结果项(结果) ? [结果] : 转换搜索结果(结果)
        );
        
        const 分析用搜索结果 = 兼容搜索结果.map(结果 => ({
          blocks: [{
            id: 结果.id,
            markdown: 结果.markdown,
            content: 结果.markdown,
            type: 'paragraph',
            box: '',
            path: '',
            hpath: '',
            created: '',
            updated: ''
          }],
          query: 结果.查询词
        }));
        
        const analysis = await ai分析搜索结果(
          { openai: openai$.value }, 
          userInput, 
          分析用搜索结果, 
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
        
        const newSearchResults = await batchSearch(analysis.nextKeywords, method);
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
    const searchMd = `# 搜索结果json：
${JSON.stringify(searchState.searchResults.map((el: any) => ({
      query: el.query || el.查询词,
      blocks: el.blocks ? el.blocks.map((block: any) => ({
        id: block.id,
        md: block.markdown || block.md
      })) : [{
        id: el.id,
        md: el.markdown
      }]
    })), null, 2)}`;
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


export async function 执行ai问答(userInput: string, method: number = 1) {
  let 所有搜索结果: 搜索结果项[] = [];
  let 搜索轮次 = 0;
  const 最大轮次 = 6;
  let 当前查询: string = '';
  
  while (搜索轮次 < 最大轮次) {
    搜索轮次++;
    
    if (搜索轮次 === 1) {
      // 第一轮：生成初始查询
      try {
        if (method === 1) {
          const 高级查询结果 = await ai生成高级搜索查询({ openai: openai$.value }, userInput);
          当前查询 = 高级查询结果.res;
        } else {
          const keywords = (await ai搜索关键词提取({ openai: openai$.value }, userInput)).res;
          当前查询 = Array.isArray(keywords) ? keywords[0] || userInput : keywords;
        }
      } catch (error) {
        console.error('查询生成失败，使用原始查询', error);
        当前查询 = userInput;
      }
      console.log(`第${搜索轮次}轮查询：`, 当前查询);
    } else {
      // 后续轮次：基于上一轮的AI评估选择搜索策略
      // 注意：这里使用的是上一轮的评估结果，这一轮的搜索还没执行
      try {
        // 获取上一轮的评估结果（如果有的话）
        let 上一轮评估;
        if (搜索轮次 > 1) {
          try {
            上一轮评估 = await AI评估搜索结果有效性({ openai: openai$.value }, 所有搜索结果, userInput);
          } catch (error) {
            console.error('获取上一轮评估失败', error);
            上一轮评估 = {
              有效性评分: 0.3,
              高质量结果数: 0,
              相关性分析: "评估失败",
              建议继续搜索: true,
              建议策略: "需要继续搜索",
              质量分布: "未知"
            };
          }
        } else {
          上一轮评估 = {
            有效性评分: 0.3,
            高质量结果数: 0,
            相关性分析: "首轮搜索",
            建议继续搜索: true,
            建议策略: "需要继续搜索",
            质量分布: "未知"
          };
        }

        const 策略选择 = await AI选择搜索策略(
          { openai: openai$.value },
          userInput,
          所有搜索结果,
          上一轮评估
        );
        
        console.log(`第${搜索轮次}轮AI策略选择：${策略选择.策略说明}`);
        console.log(`预期改进：${策略选择.预期改进}`);
        
        // 如果AI不建议继续搜索，停止
        if (!上一轮评估.建议继续搜索) {
          console.log(`AI评估不建议继续搜索，停止搜索`);
          break;
        }
        
        当前查询 = 策略选择.优化查询;
        console.log(`第${搜索轮次}轮AI优化查询：${当前查询}`);
      } catch (error) {
        console.error('AI策略选择失败，使用回退策略', error);
        // 如果AI策略选择失败，使用更简单的查询
        当前查询 = 当前查询
          .replace(/NEAR\([^)]+\)/g, '')
          .replace(/\^/g, '')
          .replace(/-/g, '')
          .replace(/AND/g, 'OR')
          .replace(/\([^)]+\)/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // 如果仍然没有结果，尝试最简单的关键词
        if (所有搜索结果.length === 0) {
          当前查询 = userInput.split(/\s+/).filter(word => word.length > 1).slice(0, 3).join(' OR ');
        }
        
        console.log(`第${搜索轮次}轮回退查询：${当前查询}`);
      }
    }
    
    // 执行搜索
    const 当前搜索结果 = await batchSearch([当前查询], method);
    const 转换结果 = 当前搜索结果.flatMap(结果 => 
      结果.blocks.map(block => ({
        id: block.id,
        markdown: block.markdown,
        相关性得分: 0,
        内容质量得分: 0,
        时效性得分: 0,
        最终得分: 0,
        搜索类型: `第${搜索轮次}轮搜索`,
        查询词: 当前查询,
        策略权重: 1
      }))
    );
    
    所有搜索结果 = [...所有搜索结果, ...转换结果];
    
    // 使用AI评估当前搜索结果的有效性
    let 有效性评估;
    try {
      有效性评估 = await AI评估搜索结果有效性({ openai: openai$.value }, 所有搜索结果, userInput);
      console.log(`第${搜索轮次}轮AI评估：${有效性评估.相关性分析}，评分：${有效性评估.有效性评分.toFixed(2)}`);
    } catch (error) {
      console.error('AI评估失败，使用默认评估', error);
      有效性评估 = {
        有效性评分: 0.2,
        高质量结果数: 0,
        相关性分析: "评估失败",
        建议继续搜索: true,
        建议策略: "需要重新搜索",
        质量分布: "未知"
      };
    }
    
    // 如果结果质量很高且数量适中，可以提前结束
    if (搜索轮次 >= 3 && 
        有效性评估.有效性评分 >= 0.6 && 
        有效性评估.高质量结果数 >= 3 && 
        所有搜索结果.length >= 4 && 
        所有搜索结果.length <= 15) {
      console.log(`第${搜索轮次}轮搜索结果质量优秀(${有效性评估.有效性评分.toFixed(2)})，停止进一步搜索`);
      break;
    }
    
    // 如果结果质量较好且数量适中，也可以提前结束
    if (搜索轮次 >= 4 && 
        有效性评估.有效性评分 >= 0.4 && 
        有效性评估.高质量结果数 >= 2 && 
        所有搜索结果.length >= 3) {
      console.log(`第${搜索轮次}轮搜索结果质量良好(${有效性评估.有效性评分.toFixed(2)})，停止进一步搜索`);
      break;
    }
    
    // 如果结果过少或质量差，强制继续搜索（至少5轮）
    if (搜索轮次 < 5 && 
        (所有搜索结果.length === 0 || 
         所有搜索结果.length <= 2 || 
         有效性评估.有效性评分 < 0.3 || 
         有效性评估.高质量结果数 === 0)) {
      console.log(`第${搜索轮次}轮结果${有效性评估.建议继续搜索 ? '质量较差' : '过少'}，继续搜索`);
      continue;
    }
    
    // 如果完全没有结果，尝试紧急回退策略
    if (所有搜索结果.length === 0 && 搜索轮次 >= 2) {
      console.log(`第${搜索轮次}轮仍然无结果，尝试紧急回退策略`);
      // 尝试最简单的关键词搜索
      const 紧急查询 = userInput.split(/\s+/).filter(word => word.length > 1).slice(0, 3).join(' OR ');
      if (紧急查询 !== 当前查询) {
        当前查询 = 紧急查询;
        console.log(`使用紧急查询：${当前查询}`);
        搜索轮次--; // 重试这一轮
        continue;
      }
    }
    
    // 如果结果过多，可以考虑停止或优化
    if (所有搜索结果.length > 25) {
      console.log(`第${搜索轮次}轮结果过多(${所有搜索结果.length}条)，可以考虑停止`);
      // 可以选择在这里停止或优化查询
      if (搜索轮次 >= 3) break;
    }
  }
  
  // 去重并排序结果
  const 去重后的结果 = 去重结果(所有搜索结果);
  const 最终结果 = await 智能排序结果(去重后的结果, userInput);
  
  console.log(`总共搜索${搜索轮次}轮，找到${最终结果.length}条最终结果`);
  
  // 生成搜索结果格式
  const 搜索结果格式 = 最终结果.map(结果 => ({
    query: 结果.查询词,
    blocks: [{
      id: 结果.id,
      md: 结果.markdown
    }]
  }));
  
  const searchMd = `# 搜索结果json：
${JSON.stringify(搜索结果格式, null, 2)}`;
  
  const aiRes = await ai回答({ openai: openai$.value }, userInput, searchMd);
  return aiRes;
}
