// 参考 https://docs.univer.ai/zh-CN/guides/sheets/getting-started/installation#usage 配置
import '@univerjs/design/lib/index.css';
import '@univerjs/docs-ui/lib/index.css';
import '@univerjs/sheets-filter-ui/lib/index.css';
import '@univerjs/sheets-ui/lib/index.css';
import '@univerjs/ui/lib/index.css';

import { CommandType, LocaleType, merge, Univer, UniverInstanceType } from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';

import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';

import { UniverUIPlugin } from '@univerjs/ui';

import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';

import { UniverSheetsFilterPlugin } from '@univerjs/sheets-filter';
import { UniverSheetsFilterUIPlugin } from '@univerjs/sheets-filter-ui';

import { UniverSheetsPlugin } from '@univerjs/sheets';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
//#region 数学公式
import { UniverSheetsFormulaPlugin, CalculationMode } from '@univerjs/sheets-formula';
import { UniverSheetsFormulaUIPlugin } from '@univerjs/sheets-formula-ui'; // 新增
import SheetsFormulaUIZhCN from '@univerjs/sheets-formula-ui/locale/zh-CN';
//#endregion 数学公式
//#region 数字格式
import { UniverSheetsNumfmtPlugin } from '@univerjs/sheets-numfmt';
import { UniverSheetsNumfmtUIPlugin } from '@univerjs/sheets-numfmt-ui';
import SheetsNumfmtUIZhCN from '@univerjs/sheets-numfmt-ui/locale/zh-CN';
//#endregion 数字格式

//#region 排序功能
import { UniverSheetsSortPlugin } from '@univerjs/sheets-sort';
import { UniverSheetsSortUIPlugin } from '@univerjs/sheets-sort-ui';
import '@univerjs/sheets-sort-ui/lib/index.css';
import SheetsSortUIZhCN from '@univerjs/sheets-sort-ui/locale/zh-CN';
import '@univerjs/sheets-sort/facade';
//#endregion 排序功能

//#region hyperlink
// https://docs.univer.ai/zh-CN/guides/sheets/features/hyperlink#%E6%89%8B%E5%8A%A8%E7%BB%84%E5%90%88%E5%AE%89%E8%A3%85
import { UniverSheetsHyperLinkPlugin } from '@univerjs/sheets-hyper-link';
import { UniverSheetsHyperLinkUIPlugin } from '@univerjs/sheets-hyper-link-ui';
import SheetsHyperLinkUIZhCN from '@univerjs/sheets-hyper-link-ui/locale/zh-CN';
import '@univerjs/sheets-hyper-link-ui/lib/index.css';
import '@univerjs/sheets-hyper-link/facade';
import '@univerjs/sheets-hyper-link-ui/facade';
//#endregion hyperlink

//crosshair
// https://docs.univer.ai/zh-CN/guides/sheets/features/crosshair#%E6%89%8B%E5%8A%A8%E7%BB%84%E5%90%88%E5%AE%89%E8%A3%85
// import { UniverSheetsCrosshairHighlightPlugin } from '@univerjs/sheets-crosshair-highlight'
// import SheetsCrosshairHighlightZhCN from '@univerjs/sheets-crosshair-highlight/locale/zh-CN'
// import '@univerjs/sheets-crosshair-highlight/lib/index.css'
// import '@univerjs/sheets-crosshair-highlight/facade'

// find-replace
// https://docs.univer.ai/zh-CN/guides/sheets/features/find-replace#%E6%89%8B%E5%8A%A8%E7%BB%84%E5%90%88%E5%AE%89%E8%A3%85
import { UniverFindReplacePlugin } from '@univerjs/find-replace';
import { UniverSheetsFindReplacePlugin } from '@univerjs/sheets-find-replace';
import FindReplaceZhCN from '@univerjs/find-replace/locale/zh-CN';
import SheetsFindReplaceZhCN from '@univerjs/sheets-find-replace/locale/zh-CN';
import '@univerjs/find-replace/lib/index.css';
import '@univerjs/sheets-find-replace/facade';

// notes
// https://docs.univer.ai/zh-CN/guides/sheets/features/note#%E6%89%8B%E5%8A%A8%E7%BB%84%E5%90%88%E5%AE%89%E8%A3%85
import { UniverSheetsNotePlugin } from '@univerjs/sheets-note';
import { UniverSheetsNoteUIPlugin } from '@univerjs/sheets-note-ui';
import SheetsNoteUIZhCN from '@univerjs/sheets-note-ui/locale/zh-CN';
import '@univerjs/sheets-note-ui/lib/index.css';
import '@univerjs/sheets-note/facade';

// thread-comment
// https://docs.univer.ai/zh-CN/guides/sheets/features/thread-comment#%E6%89%8B%E5%8A%A8%E7%BB%84%E5%90%88%E5%AE%89%E8%A3%85
import { UniverThreadCommentPlugin } from '@univerjs/thread-comment';
import { UniverThreadCommentUIPlugin } from '@univerjs/thread-comment-ui';
import { UniverSheetsThreadCommentPlugin } from '@univerjs/sheets-thread-comment';
import { UniverSheetsThreadCommentUIPlugin } from '@univerjs/sheets-thread-comment-ui';
import ThreadCommentUIZhCN from '@univerjs/thread-comment-ui/locale/zh-CN';
import SheetsThreadCommentUIZhCN from '@univerjs/sheets-thread-comment-ui/locale/zh-CN';
import '@univerjs/thread-comment-ui/lib/index.css';
import '@univerjs/sheets-thread-comment/facade';


import DesignZhCN from '@univerjs/design/locale/zh-CN';
import DocsUIZhCN from '@univerjs/docs-ui/locale/zh-CN';
import SheetsFilterUIZhCN from '@univerjs/sheets-filter-ui/locale/zh-CN';
import SheetsFormulaZhCN from '@univerjs/sheets-formula/locale/zh-CN';

import SheetsUIZhCN from '@univerjs/sheets-ui/locale/zh-CN';
import SheetsZhCN from '@univerjs/sheets/locale/zh-CN';
import UIZhCN from '@univerjs/ui/locale/zh-CN';
import { apiProxy, sendMsg } from '~/libs/apiProxy';
import { FUNCTION_LIST_USER, functionUser, functionZhCN } from './custom-function';
import type { checkId } from './msg';
import pkg from './plugin.json';
import { FUniver } from '@univerjs/core/facade';
const univer = new Univer({
  theme: defaultTheme,
  locale: LocaleType.ZH_CN,
  locales: {
    [LocaleType.ZH_CN]: merge(
      SheetsZhCN,
      DocsUIZhCN,
      SheetsUIZhCN,
      SheetsFormulaZhCN,
      SheetsNumfmtUIZhCN,
      DesignZhCN,
      UIZhCN,
      functionZhCN,
      SheetsFilterUIZhCN,
      SheetsSortUIZhCN,
      SheetsFormulaUIZhCN,

      SheetsHyperLinkUIZhCN,

      // SheetsCrosshairHighlightZhCN,

      FindReplaceZhCN,
      SheetsFindReplaceZhCN,

      SheetsNoteUIZhCN,

      ThreadCommentUIZhCN,
      SheetsThreadCommentUIZhCN,
    ),
  },
});

univer.registerPlugin(UniverRenderEnginePlugin);
univer.registerPlugin(UniverFormulaEnginePlugin, {
  // function: functionUser,
});

univer.registerPlugin(UniverUIPlugin, {
  container: 'univer-siyuan-plugin--app',
});

univer.registerPlugin(UniverDocsPlugin, {
  hasScroll: false,
});
univer.registerPlugin(UniverDocsUIPlugin);

univer.registerPlugin(UniverSheetsPlugin);
univer.registerPlugin(UniverSheetsUIPlugin);
univer.registerPlugin(UniverSheetsNumfmtPlugin);
univer.registerPlugin(UniverSheetsNumfmtUIPlugin);
univer.registerPlugin(UniverSheetsFormulaPlugin, {
  notExecuteFormula: false,
  description: [],
  function: [],
  initialFormulaComputing: CalculationMode.WHEN_EMPTY,
});
univer.registerPlugin(UniverSheetsFormulaUIPlugin);
univer.registerPlugin(UniverSheetsFilterPlugin);
univer.registerPlugin(UniverSheetsFilterUIPlugin);
univer.registerPlugin(UniverSheetsSortPlugin);
univer.registerPlugin(UniverSheetsSortUIPlugin);

univer.registerPlugin(UniverSheetsHyperLinkPlugin);
univer.registerPlugin(UniverSheetsHyperLinkUIPlugin);

// univer.registerPlugin(UniverSheetsCrosshairHighlightPlugin);

const univerAPI = FUniver.newAPI(univer);

// univerAPI.setCrosshairHighlightEnabled(true);

univer.registerPlugin(UniverFindReplacePlugin);
univer.registerPlugin(UniverSheetsFindReplacePlugin);

univer.registerPlugin(UniverSheetsNotePlugin);
univer.registerPlugin(UniverSheetsNoteUIPlugin);

univer.registerPlugin(UniverThreadCommentPlugin);
univer.registerPlugin(UniverThreadCommentUIPlugin);
univer.registerPlugin(UniverSheetsThreadCommentPlugin);
univer.registerPlugin(UniverSheetsThreadCommentUIPlugin);

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id')!;
const copy = urlParams.get('copy');
const api = apiProxy(id);

async function main() {
  const dataPath = `/data/storage/petal/${pkg.name}/univer-${id}.json`;
  const checkPar: checkId = {
    type: 'llej-plugin-rpc-univer-check-id',
    blockId: id,
  };

  sendMsg(checkPar);
  const oldData = await api.getFile(dataPath);

  let data = {};
  if (oldData.sheets === undefined) {
    if (copy) data = await api.getFile(`/data/storage/petal/${pkg.name}/univer-${copy}.json`);
  } else {
    data = oldData;
  }

  const unit = univer.createUnit(UniverInstanceType.UNIVER_SHEET, data);
  console.log(
    '[document.querySelector(".univer-toolbar-container")?.children]',
    document.querySelector('.univer-toolbar-container')?.children,
  );

  const save = throttle(async () => {
    // const snapshot = unit.getSnapshot();
    
    const fWorkbook = univerAPI.getActiveWorkbook();
    const snapshot = fWorkbook.save();

    const res = await api.putFile(
      dataPath,
      false,
      new Blob([JSON.stringify(snapshot)], { type: 'text/plain' }),
    );
  }, 500);

  univerAPI.onCommandExecuted((command) => {
    if (command.type !== CommandType.MUTATION) return;
    save();
  });
}
main();

function throttle(func: () => void, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: any) {
    // 如果之前有一个未执行的定时器，则清除它
    if (timeout) {
      clearTimeout(timeout);
    }

    // 设置一个新的定时器，在等待时间后执行函数
    timeout = setTimeout(() => {
      timeout = null;
      // @ts-expect-error
      func.apply(this, args);
    }, wait);
  };
}
