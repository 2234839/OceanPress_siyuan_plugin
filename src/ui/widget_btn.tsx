import { useState } from "preact/hooks";
import { ICON, oceanpress_widget_ui } from "~/const";
import { saveWidgetImg } from "~/libs/saveWidgetImg";

export function widget_bth(props: { widget: HTMLElement }) {
  const [icon, setICON] = useState(ICON);
  function onClick() {
    setICON("🔄️");
    saveWidgetImg(props.widget).then(() => {
      setICON(ICON);
    });
  }
  return (
    <div
      className={oceanpress_widget_ui}
      onClick={onClick}
      title="点击保存当前挂件为图片供OceanPress使用,图标为灰色表示尚未保存过此挂件">
      {icon}
    </div>
  );
}
