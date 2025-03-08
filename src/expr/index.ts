import { siyuan } from '@llej/js_util';
import { updateBlock } from '~/libs/api';
import * as api from '~/libs/api';
import { pluginClassName } from './constant';
import { get_exprBlocks } from './fn/get_exprBlocks';
import './index.css';
import type { MergedBlock } from './type';

import { encodeHTML, generateTimestamp } from '~/libs/js_util';
import { SiyuanPlugin } from '~/libs/siyuanPlugin';
import { ialToJson, jsonToIal } from '~/libs/siyuan_util';
const dev = console.log;
declare global {
  var expr: Expr;
}

export default class Expr extends SiyuanPlugin {
  IntervalId = setInterval(() => {});
  /** 主循环的间隔毫秒数 */
  intervalMs = 1_000;
  /** 控制sql相关 TODO 添加选项配置 */
  intervalUpdateSql = siyuan.bindData({
    initValue: true,
    that: this,
    storageName: 'intervalUpdateSql.json',
  });
  /** 只更新这个时间戳以后的表达式 */
  updated = siyuan.bindData({
    initValue: 0,
    that: this,
    storageName: 'updated.json',
  });
  /** 为 true 代表正在进行求值运算中 */
  evalState = false;
  flag = {
    /** 表达式返回这个值则不会更新之前的内容 */
    noOutput: Symbol(),
  };
  /** 记录计算完成的 id ，不再计算 */
  evalExprIDs: string[] = [];

  evaling = {
    ids: [] as string[],
    evalingClassName: 'expr-evaling',
    set(id?: string) {
      if (id) this.ids.push(id);
      const element = document.querySelector(`[data-node-id="${id}"]`);
      if (element) {
        element.classList.add(this.evalingClassName);
      }
    },
    has(id: string) {
      return this.ids.includes(id);
    },
    remove(id: string) {
      this.ids = this.ids.filter((i) => i !== id);
      const element = document.querySelector(`[data-node-id="${id}"]`);
      if (element) {
        element.classList.remove(this.evalingClassName);
      }
    },
  };
  async onload() {
    /** 注册Expr实例到全局变量 */
    globalThis.expr = this;
    this.addUnloadFn(
      () =>
        //@ts-ignore
        delete globalThis.expr,
    );

    // 切换页签时清空已计算的id数组来实现每次打开自动计算
    this.eventBus.on('switch-protyle', () => {
      this.evalExprIDs = [];
    });

    /** 注册求值循环 */
    this.IntervalId = setInterval(this.evalAllExpr.bind(this), this.intervalMs);
    this.addUnloadFn(() => clearInterval(this.IntervalId));

    /** 在 body 上注册插件类名，用于控制样式的开关 */
    document.body.classList.add(pluginClassName);
    this.addUnloadFn(() => document.body.classList.remove(pluginClassName));
  }

  /** 对所有表达式进行求值 */
  async evalAllExpr() {
    if (this.evalState) {
      /** 只有上一轮求值计算进行完毕后才会开始新一轮计算 */
      return;
    }
    const exprIDs = [...document.querySelectorAll<HTMLElement>('[custom-expr]')]
      .map((el) => {
        let nodeId = el.dataset.nodeId;
        if (el.dataset.docType === 'NodeDocument') {
          // 文档节点略有不同
          nodeId = el
            .closest('.protyle-content')
            ?.querySelector<HTMLElement>('.protyle-top .protyle-title[data-node-id')
            ?.dataset.nodeId;
        }
        return nodeId!;
      })
      .filter((id) => {
        if (id && this.evalExprIDs.includes(id)) {
          // 已经求值过了的不在参加计算
          return false;
        }
        if (id && this.evaling.has(id)) {
          // 正在求值中的不参加计算
          return false;
        }
        return true;
      });

    // 当配置不根据update字段更新的时候，不进行求值
    if (!this.intervalUpdateSql.value() && exprIDs.length === 0) {
      return;
    }

    try {
      this.evalState = true;
      const exprBlock = await get_exprBlocks(exprIDs);

      if (exprBlock && exprBlock.length > 0) {
        await Promise.all(exprBlock.map(this.exprEval.bind(this)));
      }
    } catch (error) {
      dev('求值错误', error);
    } finally {
      this.evalState = false;
    }
  }

  /** 对指定id进行求值 */
  async exprEvalByID(block_id: string) {
    const blocks = await get_exprBlocks([block_id]);
    return this.exprEval(blocks[0]);
  }

  async exprEval(block: MergedBlock) {
    const expr = this;
    try {
      expr.evaling.set(block.id);
      //#region 解析并执行表达式
      const code = `async ()=>{\n${block.a_value}\n}`;
      let evalValue = await eval(code)();
      //#endregion 解析并执行表达式

      const updated = generateTimestamp();
      if (Number(updated) > expr.updated.value()) {
        this.updated.set(Number(updated));
      }
      let newKramdownAttr = {
        ...ialToJson(block.ial!),
        /** 允许脚本通过block.Attr设置当前块的属性 */ ...block.Attr,
      };
      newKramdownAttr['updated'] = updated;
      newKramdownAttr['custom-expr'] = newKramdownAttr['expr'];
      const evalValue_string = String(evalValue);
      newKramdownAttr['custom-expr-value'] = encodeHTML(evalValue_string);

      let updateBlockRes;
      if (evalValue !== expr.flag.noOutput) {
        /** 将求值结果更新到块文本 */
        updateBlockRes = await updateBlock(
          'markdown',
          String(evalValue_string + '\n' + jsonToIal(newKramdownAttr)),
          block.id,
        );
      }
      dev('expr eval:', {
        id: block.id,
        block,
        expr: block.a_value,
        evalValue,
        newKramdownAttr,
        updateBlockRes,
      });

      return evalValue;
    } catch (error) {
      throw error;
    } finally {
      expr.evalExprIDs.push(block.id);
      expr.evaling.remove(block.id);
    }
  }

  util = {
    api,
  };
}
