import { createSignal } from "solid-js";
import styles from "./setting_view.module.css";
import type { Dialog } from "siyuan";
export function setting_view(props: {
  dialog: Dialog;
  setData: (data: { type: "oceanpress" | "umi-ocr"; sk: string; umiApi: string }) => void;
}) {
  const [selectedValue, set_selectedValue] = createSignal("oceanpress");
  const [sk, set_sk] = createSignal("");
  const [umiApi, set_umiApi] = createSignal("");
  function onExit() {
    props.dialog.destroy();
  }
  return (
    <div class={styles.content}>
      选择 ocr api 提供程序：
      <select
        value={selectedValue()}
        onChange={(e) => {
          set_selectedValue(e.target.value);
        }}
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
            onInput={(e) => set_sk(e.target.value)}
          />
        </div>
      ) : null}
      {selectedValue() === "umi-ocr" ? (
        <div>
          http api
          <input type="text" class={styles.input} placeholder="Enter http api ..." />
        </div>
      ) : null}
      <button class={styles.button} onClick={onExit}>
        ok
      </button>
    </div>
  );
}
