import { defineComponent, ref } from 'vue';
import { ICON, oceanpress_ui_flag, oceanpress_widget_ui } from '~/oceanpress-siyuan-plugin/const';
import { saveWidgetImg } from '~/libs/saveWidgetImg';

export default defineComponent({
  props: {
    widget: {
      type: Object as () => HTMLElement,
      required: true,
    },
  },
  setup(props) {
    const icon = ref(ICON);

    function onClick() {
      icon.value = '🔄️';
      saveWidgetImg(props.widget).then(() => {
        icon.value = ICON;
      });
    }

    return () => (
      <div
        class={`${oceanpress_ui_flag} ${oceanpress_widget_ui}`}
        onClick={onClick}
        title="点击保存当前挂件为图片供OceanPress使用,图标为灰色表示尚未保存过此挂件">
        {icon.value}
      </div>
    );
  },
});
