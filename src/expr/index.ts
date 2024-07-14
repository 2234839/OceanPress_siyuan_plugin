import { Plugin } from "siyuan";
import "./index.css";
import { siyuan } from "@llej/js_util";
import { sql, updateBlock } from "~/libs/api";

/** 用于控制插件属性显示 */
const pluginClassName = "expr-plugin";
const exprName = "custom-expr";
const exprValueName = "custom-expr-value";

type aliasAttribute = { [K in keyof attribute as `a_${K}`]: attribute[K] };
/** 合并了block和attribute，其中attribute的属性key前面添加了`a_` */
type MergedBlock = aliasAttribute & Block;

const dev = console.log;
declare global {
  var expr: Expr;
}

export default class Expr extends Plugin {
  IntervalId = 0;
  /** 主循环的间隔毫秒数 */
  intervalMs = 1_000;
  /** 控制sql相关 TODO 添加选项配置 */
  intervalUpdateSql = siyuan.bindData({
    initValue: true,
    that: this,
    storageName: "intervalUpdateSql.json",
  });
  /** 只更新这个时间戳以后的表达式 */
  updated = siyuan.bindData({
    initValue: 0,
    that: this,
    storageName: "updated.json",
  });
  /** 为 true 代表正在进行求值运算中 */
  evalState = false;

  async onload() {
    console.log("[expr]", this);

    /** 注册Expr实例到全局变量 */
    globalThis.expr = this;
    this.onunloadFn.push(
      () =>
        //@ts-ignore
        delete globalThis.expr,
    );

    // 切换页签时清空已计算的id数组来实现每次打开自动计算
    this.eventBus.on("switch-protyle", () => {
      this.evalExprIDs = [];
    });

    /** 注册求值循环 */
    this.IntervalId = setInterval(this.evalAllExpr.bind(this), this.intervalMs);
    this.onunloadFn.push(() => clearInterval(this.IntervalId));

    /** 在 body 上注册插件类名，用于控制样式的开关 */
    document.body.classList.add(pluginClassName);
    this.onunloadFn.push(() => document.body.classList.remove(pluginClassName));
  }

  /** 插件卸载时会执行此数组中的函数 */
  onunloadFn = [] as (() => void)[];
  async onunload() {
    this.onunloadFn.forEach((fn) => fn());
  }

  /** 对所有表达式进行求值 */
  async evalAllExpr() {
    if (this.evalState) {
      /** 只有上一轮求值计算进行完毕后才会开始新一轮计算 */
      return;
    }
    const exprIDs = (
      [...document.querySelectorAll("[custom-expr]")].filter((el) => {
        if (!(el instanceof HTMLElement)) {
          return false;
        }
        if (el.dataset.nodeId && this.evalExprIDs.includes(el.dataset.nodeId)) {
          // 已经求值过了的不在参加计算
          return false;
        }
        return true;
      }) as HTMLElement[]
    ).map((el) => {
      const id = el.dataset.nodeId as string;
      return id;
    });

    // 当配置不根据update字段更新的时候，不进行求值
    if (!this.intervalUpdateSql.value() && exprIDs.length === 0) {
      return;
    }

    const exprIDsStr = exprIDs.map((id) => `"${id}"`).join(",");

    try {
      this.evalState = true;
      const exprBlock = (await sql(
        `SELECT b.*,a.id AS a_id,a."name" AS a_name,a."value" as a_value,a."type" AS a_type,a.block_id AS a_block_id,a.root_id AS a_root_id,a.box AS a_box,a."path" AS a_path
      FROM blocks AS  b
      INNER JOIN attributes AS a
      ON b.id = a.block_id
      WHERE
          a.name = "${exprName}"
        AND
          (
            ( b.id IN (${exprIDsStr}) )
              OR
            (CAST(b.updated AS INTEGER)  > ${this.updated.value()})
          )
      ORDER BY b.updated DESC;`,
      )) as MergedBlock[] | null;

      if (exprBlock && exprBlock.length > 0) {
        await Promise.all(exprBlock.map(this.exprEval.bind(this)));
      }
    } catch (error) {
      dev("求值错误", error);
    } finally {
      this.evalState = false;
    }
  }
  /** 记录计算完成的 id ，不再计算 */
  evalExprIDs: string[] = [];
  async exprEval(block: MergedBlock) {
    const evalValue = await eval(block.a_value);

    const updated = generateTimestamp();
    if (Number(updated) > this.updated.value()) {
      this.updated.set(Number(updated));
    }
    /** TODO,这里应该要考虑ial中不存在相关字段的情况，需要进行添加而非替换 更新块的update时间戳
     * ial = `{: updated="20240604233920" custom-expr="10-11+Math.random()+&quot;2&quot;" custom-expr-value="-0.95897021536132312" id="20240514180539-3zvaoab" style="background-color: var(--b3-font-background4);"} `
     */
    let newKramdownAttr = block.ial!;
    if (/updated="\d+"/.test(newKramdownAttr)) {
      newKramdownAttr = newKramdownAttr.replace(/updated="\d+"/, `updated="${updated}"`);
    } else {
      newKramdownAttr = newKramdownAttr.replace(/}$/, ` updated="${updated}"`);
    }
    const evalValue_string = String(evalValue);
    if (/custom-expr-value=".*?"/.test(newKramdownAttr)) {
      newKramdownAttr = newKramdownAttr.replace(
        /custom-expr-value=".*?"/,
        `custom-expr-value="${encodeHTML(evalValue_string)}"`,
      );
    } else {
      newKramdownAttr = newKramdownAttr.replace(
        /}$/,
        ` custom-expr-value="${encodeHTML(evalValue_string)}"` + "}",
      );
    }
    // custom-expr-value="-0.56273369360008952"
    /** 将求值结果更新到块文本 */
    await updateBlock("markdown", String(evalValue_string + "\n" + newKramdownAttr), block.id);
    dev("expr:", block.id, block.a_value, evalValue);

    this.evalExprIDs.push(block.id);
  }
}

function generateTimestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ]
    .map((part) => part.toString().padStart(2, "0"))
    .join("");
}
function encodeHTML(str: string) {
  return str.replace(/[&<>"'\n]/g, function (match) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "\n": "_esc_newline_",
    }[match]!;
  });
}
