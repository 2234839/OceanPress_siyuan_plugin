/** 表达式编辑器自动补全的内置上下文条目 */
export interface BuiltinEntry {
  /** 补全插入的文本 */
  label: string;
  /** 详细说明 */
  detail: string;
  /** 分类 */
  kind: '变量' | '属性' | '方法' | '关键字';
}

/** 表达式求值上下文中可用的内置变量/方法（求值时作为闭包环境注入） */
export const exprBuiltins: BuiltinEntry[] = [
  {
    label: 'block',
    detail: '当前表达式块的数据对象（含 id、type、markdown 等块属性）',
    kind: '变量',
  },
  {
    label: 'block.Attr',
    detail: '对象，设置其中的键值对会写入当前块的属性，如 block.Attr = { "my-attr": "值" }',
    kind: '属性',
  },
  {
    label: 'expr',
    detail: 'expr 插件实例（window.expr），可访问插件状态与工具',
    kind: '变量',
  },
  {
    label: 'expr.flag.noOutput',
    detail: '返回此 Symbol 时插件不会更新块的显示内容（用于纯副作用表达式）',
    kind: '属性',
  },
  {
    label: 'api',
    detail: '思源内核 API 封装，如 api.sql(stmt) 查询、api.getBlockKramdown(id) 等',
    kind: '变量',
  },
  {
    label: 'api.sql',
    detail: '执行 SQL 查询：api.sql(`SELECT * FROM blocks WHERE id = "..."`)',
    kind: '方法',
  },
  {
    label: 'fetch',
    detail: '原生 fetch，可 await 调用思源内核 HTTP API（同源，无需鉴权头）',
    kind: '方法',
  },
  {
    label: 'await',
    detail: '表达式支持 async，可直接 await Promise，如 await fetch("/api/...")',
    kind: '关键字',
  },
  {
    label: 'return',
    detail: '语句块中显式返回值；无 return 时整个源码按纯表达式求值',
    kind: '关键字',
  },
  {
    label: 'siyuan',
    detail: 'window.siyuan 全局对象（config.system、config.api.token 等）',
    kind: '变量',
  },
];

/** 根据已输入的标识符前缀过滤补全候选 */
export function filterBuiltins(prefix: string): BuiltinEntry[] {
  if (!prefix) return [];
  const p = prefix.toLowerCase();
  return exprBuiltins.filter((e) => e.label.toLowerCase().startsWith(p) || e.label.toLowerCase().includes('.' + p));
}
