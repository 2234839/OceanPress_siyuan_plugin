// 引入这个变量后 vite 会自动注入 hot
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
import { UniverSheetsFormulaPlugin, CalculationMode } from '@univerjs/sheets-formula';
import { UniverSheetsNumfmtPlugin } from '@univerjs/sheets-numfmt';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';

//#region 排序功能
import { UniverSheetsSortPlugin } from '@univerjs/sheets-sort';
import { UniverSheetsSortUIPlugin } from '@univerjs/sheets-sort-ui';
import '@univerjs/sheets-sort-ui/lib/index.css';
import SheetsSortUIZhCN from '@univerjs/sheets-sort-ui/locale/zh-CN';
import '@univerjs/sheets-sort/facade';
//#endregion 排序功能

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
      // SheetsNumfmtZhCN,
      DesignZhCN,
      UIZhCN,
      DesignZhCN,
      functionZhCN,
      SheetsFilterUIZhCN,
      SheetsSortUIZhCN,
    ),
  },
});

univer.registerPlugin(UniverRenderEnginePlugin);
univer.registerPlugin(UniverFormulaEnginePlugin, {
  function: functionUser,
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
univer.registerPlugin(UniverSheetsFormulaPlugin, {
  notExecuteFormula: false,
  description: [],
  function: [],
  initialFormulaComputing: CalculationMode.WHEN_EMPTY,
});
univer.registerPlugin(UniverSheetsFilterPlugin);
univer.registerPlugin(UniverSheetsFilterUIPlugin);
univer.registerPlugin(UniverSheetsSortPlugin);
univer.registerPlugin(UniverSheetsSortUIPlugin);
const univerAPI = FUniver.newAPI(univer);

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
    const snapshot = unit.getSnapshot();
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
