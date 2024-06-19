import { createMemo, type Signal } from "solid-js";
import styles from "./setting_view.module.css";
import type { Dialog } from "siyuan";
export function setting_view(props: {
  dialog: Dialog;
  dataSignal: Signal<{ type: "oceanpress" | "umi-ocr"; sk: string; umiApi: string }>;
  save: () => void;
}) {
  const [data, set_data] = props.dataSignal;
  const selectedValue = createMemo(() => data().type);
  const sk = createMemo(() => data().sk);
  const umiApi = createMemo(() => data().umiApi);
  function onExit() {
    props.save();
    props.dialog.destroy();
  }
  return (
    <div class={styles.content}>
      选择 ocr api 提供程序：
      <select
        value={selectedValue()}
        onChange={(e) => set_data((prev) => ({ ...prev, type: e.target.value as "oceanpress" }))}
        name="ocr type">
        <option value="oceanpress">oceanpress</option>
        <option value="umi-ocr">umi-ocr</option>
      </select>
      {selectedValue() === "oceanpress" ? (
        <div>
          sk
          <input
            type="text"
            class={styles.input}
            placeholder="Enter sk..."
            value={sk()}
            onInput={(e) => set_data((prev) => ({ ...prev, sk: e.target.value }))}
          />
        </div>
      ) : null}
      {selectedValue() === "umi-ocr" ? (
        <div>
          http api
          <input
            type="text"
            class={styles.input}
            placeholder="Enter http api ..."
            value={umiApi()}
            onInput={(e) => set_data((prev) => ({ ...prev, umiApi: e.target.value }))}
          />
        </div>
      ) : null}
      <button class={styles.button} onClick={onExit}>
        ok
      </button>
    </div>
  );
}
