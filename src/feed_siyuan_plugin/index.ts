import { fetchPost } from 'siyuan';
import { SiyuanPlugin } from '~/libs/siyuanPlugin';
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;

import { removeAllCronJob, scheduleCronJob } from './libs/cron';
import { getAllFeedBlocks, parseFeedBlock, parseFeed, linkFilter } from './libs/feed';
import { DEFAULT_CRON } from './libs/const';
import { insertBlock } from './libs/siyuan_api';
import { getBlockByID } from '~/libs/api';

export default class FeedPlugin extends SiyuanPlugin {
  /** 拉取feed链接并进行解析的函数 */
  _feedFetch: (() => void)[] = [];
  async onload() {
    this.addCommand({
      hotkey: '',
      langKey: '_feedFetch',
      langText: '立刻对所有feed进行一次拉取',
      callback: async () => {
        await this.registerAllFeed();
        this._feedFetch.forEach((feedFetch) => feedFetch());
      },
    });
    this.registerAllFeed();
  }
  async registerAllFeed() {
    this._feedFetch = [];
    removeAllCronJob();

    /** 解析并注册定时任务 */
    const feedBlocks = await getAllFeedBlocks();
    return Promise.all(
      feedBlocks.map(async (block) => {
        const feedDoc = await parseFeedBlock(block.block_id);
        if (feedDoc.getAttr('feed')) {
          const cron = feedDoc.getAttr('cron') || DEFAULT_CRON;
          console.log(`注册 cron job 表达式:${cron} by ${feedDoc.getAttr('feed')}`, feedDoc);
          const feedFetch = async () => {
            this.feedFetch(block.block_id);
          };
          scheduleCronJob(cron, feedFetch);
          this._feedFetch.push(feedFetch);
        } else {
          console.log(feedDoc, '没有读取到 feed 属性，请对照文档进行设定 feed');
        }
      }),
    );
  }
  async feedFetch(feedId: string) {
    const feedDoc = await parseFeedBlock(feedId);
    const feed = await parseFeed(feedDoc);
    if (feed instanceof Error) {
      throw feed;
    }
    const insertEntry = feed.entryList
      .sort((a, b) => {
        return Number(b.updated) - Number(a.updated);
      })
      /** 没有链接的不要 TODO 是否该给出提示 */
      .filter((el) => el.link)
      .filter((el) => {
        /** 既然本地已经存在了，就不再插入，所以过滤掉  */
        const s = !feedDoc.entryBlock.find(
          /** 如果entryBlock 的第一行存在当前 entry 的链接就当他俩是同一个 entry
           * TODO 如果有更新的话应该也要再次处理
           */
          (entryBlock) =>
            el.link && entryBlock.content.split('\n')[0].includes(linkFilter(el.link)),
        );
        return s;
      });
    const msg = `feed:${feedDoc.getAttr('feed')} 共 ${feed.entryList.length} 条，新增 ${
      insertEntry.length
    } 条`;
    console.log(msg);
    fetchPost('/api/notification/pushMsg', {
      msg,
    });

    const feedBlockId = feedDoc.attrBlock?.id ?? feedId;

    const block = await getBlockByID(feedBlockId);
    insertEntry.forEach(async (entry) => {
      let data = `* [ ] ###### [${entry.title ?? entry.link}](${entry.link})\n`;
      if (entry.published) data += `    - published:${entry.published}\n`;
      if (entry.updated) data += `    - updated:${entry.updated}\n`;
      if (entry.summary) data += `    > ${entry.summary}\n`;
      data += `  `;
      insertBlock({
        dataType: 'markdown',
        ...(block.type === 'd'
          ? {
              parentID: feedBlockId,
            }
          : {
              previousID: feedBlockId,
            }),

        data,
      });
    });
  }
  async onunload() {
    /** 取消注册的定时任务 */
    removeAllCronJob();
    this.commands = [];
  }
}
