import { Configuration, OpenAIApi, type ResponseTypes } from "openai-edge";
import { fetchSyncPost } from "siyuan";

const configuration = new Configuration({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  basePath: import.meta.env.VITE_OPENAI_BASE_PATH,
});
const openai = new OpenAIApi(configuration);

type AI = {
  openai: OpenAIApi;
  model?: string;
  max_tokens?: number;
  temperature?: number;
};
const defaultConfig = {
  //   model: "gpt-3.5-turbo",
  /** 智谱清言 免费模型 */
  model: "GLM-4-Flash",
  //   max_tokens: undefined,
  max_tokens: 9999,
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
  const completion = await ai.openai.createChatCompletion({
    model: ai.model ?? defaultConfig.model,
    messages: [
      {
        role: "system",
        content: `You are an assistant who specializes in assisting users with their searches. Split and conjugate phrases from user questions that can be used in searches.

## The content of your answer
1. Format: Your answer should be a single-line json string array, and should not contain any other content.
2. Not only should you include the keywords that appeared in the user's question, but you should also think of possible variations of the keywords.

## Search engine features
1. search programs support the use of spaces to connect multiple keywords
2. Sometimes a single keyword can be searched for relevant content, multiple keywords connected to the search instead of searching, so you not only want to return to the space connected to multiple keywords, you should also return to the need to search for a single keyword and so on, but too many single keywords and may be searched for irrelevant content, this is the need for you to take the place of trade-offs!`,
      },
      //   { role: "user", content: "Who won the world series in 2020?" },
      //   {
      //     role: "assistant",
      //     content: "The Los Angeles Dodgers won the World Series in 2020.",
      //   },
      { role: "user", content: userInput },
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  const data = (await completion.json()) as ResponseTypes["createChatCompletion"];
  return {
    res: JSON.parse(data.choices[0].message!.content!),
    raw: data,
  };
}
export async function ai回答(ai: AI, userInput: string, searchMd: string) {
  const completion = await ai.openai.createChatCompletion({
    model: ai.model ?? defaultConfig.model,
    messages: [
      {
        role: "system",
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
        role: "assistant",
        content: `检索到的内容:\n${searchMd}`,
      },
      { role: "user", content: userInput },
    ],
    max_tokens: ai.max_tokens ?? defaultConfig.max_tokens,
    temperature: ai.temperature ?? defaultConfig.temperature,
    stream: false,
  });
  const data = (await completion.json()) as ResponseTypes["createChatCompletion"];
  return {
    res: data.choices[0].message!.content!,
    raw: data,
  };
}
async function batchSearch(keywords: string[]) {
  async function search(query: string) {
    return await fetchSyncPost("/api/search/fullTextSearchBlock", {
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
      blocks: r.data.blocks as Block[],
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

export async function 执行ai问答(userInput: string) {
  const keywords = (await ai搜索关键词提取({ openai }, userInput)).res;
  console.log("keywords", keywords);
  const searchMd = await batchSearchParse(keywords);
  console.log("searchMd", searchMd);
  const aiRes = await ai回答({ openai }, userInput, searchMd);
  console.log("aiRes", aiRes);
  return aiRes;
}
