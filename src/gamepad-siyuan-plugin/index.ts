import { siyuan } from "@llej/js_util";
import { ref, reactive, computed, watchEffect } from "vue";
import { SiyuanPlugin } from "~/libs/siyuanPlugin";
// 引入这个变量后 vite 会自动注入 hot
import.meta.hot;

export default class VitePlugin extends SiyuanPlugin {
  /** 控制sql相关 TODO 添加选项配置 */
  callJS = siyuan.bindData({
    initValue: {} ,
    that: this,
    storageName: "callJS.json",
  });

  // 使用 Vue3 响应式系统
  private gamepads = reactive<{ [key: number]: Gamepad }>({});
  private axes = ref<number[]>([]);
  private buttons = ref<{ value: number; pressed: boolean; touched: boolean }[]>([]);

  /** 映射手柄按钮 */
  private useGamepadButtonMap() {
    const useButtonMap = (index: number) =>
      computed((): number | undefined => {
        return this.buttons.value[index]?.value;
      });
    const useAxesMap = (index: number) =>
      computed((): number | undefined => {
        return this.axes.value[index];
      });
    return {
      /** 摇杆四个轴，取值范围是-1 到 1 */
      rocker_left_x: useAxesMap(0),
      rocker_left_y: useAxesMap(1),
      rocker_right_x: useAxesMap(2),
      rocker_right_y: useAxesMap(3),
      /** 右侧a b x y */
      btn_a: useButtonMap(0),
      btn_b: useButtonMap(1),
      btn_x: useButtonMap(2),
      btn_y: useButtonMap(3),
      /** 肩键 */
      shoulder_left: useButtonMap(4),
      shoulder_right: useButtonMap(5),
      /** 线性扳机 */
      trigger_left: useButtonMap(6),
      trigger_right: useButtonMap(7),
      /** 功能键 */
      btn_select: useButtonMap(8),
      btn_start: useButtonMap(9),
      /** 摇杆下按，两个快捷键也是这个 */
      btn_rocker_left: useButtonMap(10),
      btn_rocker_right: useButtonMap(11),
      /** 左侧上下左右 */
      btn_top: useButtonMap(12),
      btn_bottom: useButtonMap(13),
      btn_left: useButtonMap(14),
      btn_right: useButtonMap(15),
    };
  }

  private gameBtn = this.useGamepadButtonMap();

  private checkGamepad() {
    const gamepad = Object.values(this.gamepads)[0];
    if (!gamepad) {
      requestAnimationFrame(() => this.checkGamepad());
      return;
    }
    this.axes.value = [...gamepad.axes];
    this.buttons.value = [...gamepad.buttons];
    requestAnimationFrame(() => this.checkGamepad());
  }

  onload(): void {
    requestAnimationFrame(() => this.checkGamepad());

    // 管理手柄链接
    const onGamepadConnected = (event: GamepadEvent) => {
      this.gamepads[event.gamepad.index] = event.gamepad;
    };
    const onGamepadDisconnected = (event: GamepadEvent) => {
      delete this.gamepads[event.gamepad.index];
    };
    const id = setInterval(() => {
      navigator.getGamepads().forEach((gamepad) => {
        if (!gamepad) return;
        this.gamepads[gamepad.index] = gamepad;
      });
    }, 1000);

    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);

    this.addUnloadFn(() => {
      clearInterval(id);
      window.removeEventListener("gamepadconnected", onGamepadConnected);
      window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
    });

    // 使用 watchEffect 替代 SolidJS 的 effect
    const stopEffect = watchEffect(() => {
      console.log("[gameBtn.btn_left()]", this.gameBtn.btn_left.value);
      const key = "ArrowUp";
      // 创建键盘事件对象
      const event1 = new KeyboardEvent("keypress", {
        key: key,
        code: `Key${key.toUpperCase()}`,
        keyCode: key.charCodeAt(0),
        charCode: key.charCodeAt(0),
        bubbles: true,
        cancelable: true,
      });

      // 获取当前光标位置
      const selection = window.getSelection();
      selection?.anchorNode?.parentElement?.addEventListener("keypress", (e) => {
        console.log("[e]", e);
      });
      console.log(
        "[selection?.focusNode?.parentElement?.dispatchEvent(event1);]",
        selection?.anchorNode?.dispatchEvent(event1),
      );

      // 触发事件在光标位置
    });

    this.addUnloadFn(stopEffect);
  }
}
