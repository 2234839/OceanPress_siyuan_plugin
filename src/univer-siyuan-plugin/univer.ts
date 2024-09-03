// 引入这个变量后 vite 会自动注入 hot
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/sheets-formula/lib/index.css";
import '@univerjs/sheets-numfmt/lib/index.css';

import { CommandType, LocaleType, Tools, Univer, UniverInstanceType } from "@univerjs/core";
import { defaultTheme } from "@univerjs/design";

import { UniverFormulaEnginePlugin } from "@univerjs/engine-formula";
import { DeviceInputEventType, UniverRenderEnginePlugin } from "@univerjs/engine-render";

import { UniverUIPlugin } from "@univerjs/ui";

import { UniverDocsPlugin } from "@univerjs/docs";
import { UniverDocsUIPlugin } from "@univerjs/docs-ui";

import { UniverSheetsPlugin } from "@univerjs/sheets";
import { UniverSheetsFormulaPlugin } from "@univerjs/sheets-formula";
import { UniverSheetsUIPlugin } from "@univerjs/sheets-ui";
import { UniverSheetsNumfmtPlugin } from "@univerjs/sheets-numfmt";

import DesignZhCN from "@univerjs/design/locale/zh-CN";
import UIZhCN from "@univerjs/ui/locale/zh-CN";
import DocsUIZhCN from "@univerjs/docs-ui/locale/zh-CN";
import SheetsZhCN from "@univerjs/sheets/locale/zh-CN";
import SheetsUIZhCN from "@univerjs/sheets-ui/locale/zh-CN";
import SheetsFormulaZhCN from "@univerjs/sheets-formula/locale/zh-CN";

const univer = new Univer({
  theme: defaultTheme,
  locale: LocaleType.ZH_CN,
  locales: {
    [LocaleType.ZH_CN]: Tools.deepMerge(
      SheetsZhCN,
      DocsUIZhCN,
      SheetsUIZhCN,
      SheetsFormulaZhCN,
      UIZhCN,
      DesignZhCN,
    ),
  },
});

univer.registerPlugin(UniverRenderEnginePlugin);
univer.registerPlugin(UniverFormulaEnginePlugin);

univer.registerPlugin(UniverUIPlugin, {
  container: "univer-siyuan-plugin--app",
});

univer.registerPlugin(UniverDocsPlugin, {
  hasScroll: false,
});
univer.registerPlugin(UniverDocsUIPlugin);

univer.registerPlugin(UniverSheetsPlugin);
univer.registerPlugin(UniverSheetsUIPlugin);
univer.registerPlugin(UniverSheetsNumfmtPlugin);
univer.registerPlugin(UniverSheetsFormulaPlugin);

import { FUniver } from "@univerjs/facade";
import { apiProxy, sendMsg } from "~/libs/apiProxy";
import pkg from "./plugin.json";
import type { checkId } from "./msg";
const univerAPI = FUniver.newAPI(univer);

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get("id")!;
const copy = urlParams.get("copy");
const api = apiProxy(id);

async function main() {
  const dataPath = `/data/storage/petal/${pkg.name}/univer-${id}.json`;
  const checkPar: checkId = {
    type: "llej-plugin-rpc-univer-check-id",
    blockId: id,
  };

  sendMsg(checkPar);
  const oldData = await api.getFile(dataPath);

  let data = {};
  console.log("[dataPath]", dataPath, oldData);
  if (oldData.sheets === undefined) {
    if (copy) data = await api.getFile(`/data/storage/petal/${pkg.name}/univer-${copy}.json`);
  } else {
    data = oldData;
  }

  const unit = univer.createUnit(UniverInstanceType.UNIVER_SHEET, data);
  const save = throttle(async () => {
    // univerAPI.executeCommand("sheet.operation.set-cell-edit-visible", {
    //   visible: true,
    //   _eventType: DeviceInputEventType.PointerUp,
    // });
    const snapshot = unit.getSnapshot();

    console.log("[snapshot]", JSON.stringify(snapshot));
    const res = await api.putFile(
      dataPath,
      false,
      new Blob([JSON.stringify(snapshot)], { type: "text/plain" }),
    );
  }, 500);

  window.addEventListener("beforeunload", () => {
    console.log("[beforeunload]", "beforeunload");
    univerAPI.executeCommand("sheet.operation.set-cell-edit-visible", {
      visible: false,
      _eventType: DeviceInputEventType.PointerUp,
    });
    save();
    univerAPI.executeCommand("sheet.operation.set-cell-edit-visible", {
      visible: true,
      _eventType: DeviceInputEventType.PointerUp,
    });
  });
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
