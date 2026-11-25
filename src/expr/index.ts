import { siyuan } from '@llej/js_util';
import { updateBlock } from '~/libs/api';
import * as api from '~/libs/api';
import { pluginClassName } from './constant';
import { get_exprBlocks } from './fn/get_exprBlocks';
import './index.css';
import type { MergedBlock } from './type';

import { encodeHTML, generateTimestamp, generateUniqueId } from '~/libs/js_util';
import { SiyuanPlugin } from '~/libs/siyuanPlugin';
import { ialToJson, jsonToIal } from '~/libs/siyuan_util';
import { SettingUtils } from '~/libs/setting-utils';
import { exprCustomBlockSelector } from './fn/get_exprCustomBlocks';
import { migrateLegacyExprBlocks } from './fn/migrate_legacy';
import { customBlockInfo } from './fn/get_exprCustomBlocks';
import ExprEditBtn from './components/ExprEditBtn.vue';
import type { Protyle } from 'siyuan';
const dev = console.log;

/** 获取 protyle 编辑器中当前光标所在块的 id（用于定位插入位置） */
function getFocusedBlockId(protyle: Protyle): string | undefined {
  const range: Range | null = (protyle as unknown as {
    wysiwyg?: { lastElementRange?: Range | null };
  }).wysiwyg?.lastElementRange ?? null;
  if (!range) return undefined;
  /** 从选区起点向上找最近的带 data-node-id 的元素 */
  let node: Node | null = range.startContainer;
  while (node) {
    if (node instanceof Element) {
      const id = node.getAttribute('data-node-id');
      if (id) return id;
    }
    node = node.parentElement;
  }
  return undefined;
}

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
  /** 插件设置工具 */
  settingUtils!: SettingUtils;
  async onload() {
    /** 注册Expr实例到全局变量 */
    globalThis.expr = this;
    this.addUnloadFn(
      () =>
        //@ts-ignore
        delete globalThis.expr,
    );

    this.initSetting();

    // 切换页签时清空已计算的id数组来实现每次打开自动计算
    this.eventBus.on('switch-protyle', () => {
      this.evalExprIDs = [];
    });

    /** 斜杠命令 — 在光标处插入 ;;;expr 表达式自定义块 */
    this.protyleSlash.push({
      id: 'expr:insert',
      filter: ['expr', '表达式', 'biaodashi'],
      callback: (protyle) => {
        /** 待插入的表达式源码，默认演示 new Date() */
        const exprSource = 'new Date()';
        const id = generateUniqueId();
        const updated = generateTimestamp();
        /** 通过 dom 协议插入真正的 NodeCustomBlock：
         * markdown 协议下 ;;;expr 围栏会被存成纯文本段落（实测 type=p），
         * 只有 dom 协议 + data-type="NodeCustomBlock" 才能让内核生成自定义块 */
        const dom = `<div data-node-id="${id}" data-type="NodeCustomBlock" data-info="${customBlockInfo}" data-content="${encodeHTML(exprSource)}" class="custom-block" updated="${updated}"></div>`;
        api
          .insertBlock('dom', dom, undefined, getFocusedBlockId(protyle))
          .then(() => {
            /** 插入后重新渲染，触发新一轮求值 */
            this.evalExprIDs = [];
          });
      },
      html: `<div style="display: flex; align-items: center; gap: 4px;">插入表达式块 <span style="opacity:.5">;;;expr</span></div>`,
    });

    /** 注册求值循环 */
    this.IntervalId = setInterval(this.evalAllExpr.bind(this), this.intervalMs);
    this.addUnloadFn(() => clearInterval(this.IntervalId));

    /** 轮询为所有表达式自定义块挂载右上角编辑按钮 */
    this.editBtnLoopId = setInterval(() => this.mountEditBtns(), 1_000);
    this.addUnloadFn(() => clearInterval(this.editBtnLoopId));

    /** 在 body 上注册插件类名，用于控制样式的开关 */
    document.body.classList.add(pluginClassName);
    this.addUnloadFn(() => document.body.classList.remove(pluginClassName));
  }

  /** 轮询挂载循环的 id */
  editBtnLoopId = setInterval(() => {});

  /** 为 DOM 中尚未挂载按钮的表达式自定义块挂载编辑按钮 */
  mountEditBtns() {
    document.querySelectorAll<HTMLElement>(exprCustomBlockSelector).forEach((el) => {
      /** 相对定位容器，按钮 absolute 定位到右上角 */
      if (getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
      }
      this.addVueUi(el, ExprEditBtn, {
        onSaved: (blockId: string) => {
          /** 保存后触发重算 */
          this.evalExprIDs = this.evalExprIDs.filter((i) => i !== blockId);
        },
      });
    });
  }

  /** 初始化插件设置面板 */
  async initSetting() {
    const settingUtils = new SettingUtils(this, 'expr-setting');
    this.settingUtils = settingUtils;
    await settingUtils.load();

    /** 将旧架构（custom-expr 属性）数据一键升级为自定义块架构 */
    settingUtils.addItem({
      key: 'migrateLegacyExpr',
      type: 'button',
      value: '',
      title: '升级旧表达式数据',
      description: '扫描所有带 custom-expr 属性的块，在其后插入等价的 ;;;expr 自定义块（旧块保留不删除，确认无误后可手动删除）',
      button: {
        label: '开始升级',
        callback: async () => {
          const results = await migrateLegacyExprBlocks();
          console.log('[expr] 旧数据迁移完成', results);
          alert(`迁移完成：成功 ${results.filter((r) => r.newBlockId).length} / 失败 ${results.filter((r) => r.error).length}，详情见控制台`);
        },
      },
    });
  }

  /** 对所有表达式进行求值（同时支持旧属性架构与新自定义块架构） */
  async evalAllExpr() {
    if (this.evalState) {
      /** 只有上一轮求值计算进行完毕后才会开始新一轮计算 */
      return;
    }
    const exprIDs = [...document.querySelectorAll<HTMLElement>('[custom-expr]'), ...document.querySelectorAll<HTMLElement>(exprCustomBlockSelector)]
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
      // 新架构：自定义块不在 attributes 表中（表达式存于 data-content），单独从 kramdown 提取
      const customBlocks = (
        (await Promise.all(
          exprIDs.map(async (id) => {
            const el = document.querySelector<HTMLElement>(
              `[data-node-id="${id}"]${exprCustomBlockSelector}`,
            );
            if (!el) return;
            const content = el.dataset.content;
            if (!content) return;
            return {
              id,
              type: 'NodeCustomBlock' as any,
              a_value: content,
              ial: '',
            } as unknown as MergedBlock;
          }),
        )) as MergedBlock[]
      ).filter(Boolean);

      const all = [...(exprBlock ?? []), ...customBlocks];
      if (all.length > 0) {
        await Promise.all(all.map(this.exprEval.bind(this)));
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
      /** 是否为思源自定义块架构（;;;expr 围栏块） */
      const isCustomBlock = (block.type as string) === 'NodeCustomBlock';
      //#region 解析并执行表达式
      /** 源码中不含 return 语句时按纯表达式求值（如 "1+2"、"new Date()"），
       * 否则按语句块求值（块内需显式 return） */
      const isExpression = !/\breturn\b/.test(block.a_value);
      const code = isExpression
        ? `async ()=>(\n${block.a_value}\n)`
        : `async ()=>{\n${block.a_value}\n}`;
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
      const evalValue_string = String(evalValue);
      newKramdownAttr['custom-expr-value'] = encodeHTML(evalValue_string);

      let updateBlockRes;
      if (isCustomBlock) {
        // 自定义块架构：块文本（data-content）就是表达式源码，不可被结果覆盖，
        // 求值结果仅写入属性，由渲染层（CSS/视图）读取 custom-expr-value 呈现
        newKramdownAttr['custom-expr'] = block.a_value;
        updateBlockRes = await api.setBlockAttrs(block.id, {
          'custom-expr-value': newKramdownAttr['custom-expr-value'],
          ...(block.Attr ?? {}),
        });
      } else if (evalValue !== expr.flag.noOutput) {
        newKramdownAttr['custom-expr'] = newKramdownAttr['expr'];
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
