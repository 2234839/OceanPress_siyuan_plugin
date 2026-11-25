<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Dialog } from 'siyuan';
import { updateBlock } from '~/libs/api';

/** 当前编辑的表达式块在 DOM 中的元素 */
const blockEl = ref<HTMLElement>();
/** 块 id（由挂载容器 data-node-id 提供或注入） */
const props = defineProps<{
  blockId: string;
  /** 保存后回调（触发插件重算） */
  onSaved?: (blockId: string) => void;
}>();

/** 当前表达式源码 */
const exprSource = ref('');
/** 对话框中编辑中的源码 */
const editing = ref('');

onMounted(() => {
  const el = document.querySelector<HTMLElement>(
    `[data-node-id="${props.blockId}"][data-type="NodeCustomBlock"]`,
  );
  blockEl.value = el ?? undefined;
  exprSource.value = el?.dataset.content ?? '';
});

/** 打开编辑对话框 */
function openEditor() {
  editing.value = exprSource.value;
  const dialog = new Dialog({
    title: '编辑表达式',
    content: `
      <div class="b3-dialog__content" style="display:flex;flex-direction:column;gap:8px;padding:16px;">
        <textarea class="b3-text-field fn__flex-1" style="width:100%;min-height:200px;font-family:monospace;resize:vertical;"></textarea>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button class="b3-button b3-button--cancel">取消</button>
          <button class="b3-button b3-button--text">保存</button>
        </div>
      </div>`,
    width: '520px',
    height: '320px',
  });
  const textarea = dialog.element.querySelector<HTMLTextAreaElement>('textarea')!;
  textarea.value = editing.value;
  textarea.focus();
  const cancelBtn = dialog.element.querySelector<HTMLButtonElement>('.b3-button--cancel')!;
  const saveBtn = dialog.element.querySelector<HTMLButtonElement>('.b3-button--text')!;

  cancelBtn.addEventListener('click', () => dialog.destroy());
  /** Ctrl/Cmd+Enter 快捷保存 */
  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') save();
  });
  saveBtn.addEventListener('click', save);

  async function save() {
    const source = textarea.value;
    if (!source.trim()) return;
    /** 用 kramdown 协议更新：保留 IAL（id 等），重写围栏内容 */
    const kramdown = `;;;expr\n${source}\n;;;`;
    await updateBlock('kramdown', kramdown, props.blockId);
    /** 同步本地状态与 DOM（内核事务后 protyle 会自行重渲染） */
    exprSource.value = source;
    dialog.destroy();
    props.onSaved?.(props.blockId);
  }
}
</script>

<template>
  <Teleport :to="blockEl" v-if="blockEl">
    <div
      class="expr-edit-btn"
      title="编辑表达式"
      @mousedown.stop
      @click.stop="openEditor"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    </div>
  </Teleport>
</template>

<style scoped>
.expr-edit-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  color: var(--b3-theme-on-surface);
  background: var(--b3-list-hover);
  transition: opacity 0.15s;
  z-index: 10;
}
.expr-edit-btn:hover {
  background: var(--b3-theme-surface);
  color: var(--b3-theme-primary);
}
</style>
