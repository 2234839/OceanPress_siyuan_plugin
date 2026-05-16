<template>
  <div class="ai-chat-container" :class="oceanpress_ui_flag"
    @mousedown.stop @mouseup.stop @click.stop @dblclick.stop>
    <ChatPanel ref="chatPanel" @update="onMessagesUpdate" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { getBlockAttrs, setBlockAttrs } from '~/libs/api';
import { oceanpress_ui_flag } from '~/oceanpress-siyuan-plugin/const';
import ChatPanel from './components/ChatPanel.vue';
import type { ChatMessage } from './components/ChatPanel.vue';

const chatPanel = useTemplateRef<InstanceType<typeof ChatPanel>>('chatPanel');

const props = defineProps({
  blockId: {
    type: String,
    required: true,
  },
  plugin: {
    type: Object,
    required: true,
  },
});

async function saveMessages(msgs: ChatMessage[]) {
  await setBlockAttrs(props.blockId, {
    'custom-ai-config': JSON.stringify(msgs),
  });
}

async function loadMessages() {
  const res = await getBlockAttrs(props.blockId);
  const raw = res['custom-ai-config'];
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      if (Array.isArray(saved)) {
        chatPanel.value?.loadMessages(saved);
        return;
      }
    } catch { /* ignore */ }
  }
}

function onMessagesUpdate(msgs: ChatMessage[]) {
  saveMessages(msgs);
}

onMounted(() => {
  loadMessages();
});
</script>

<style scoped>
.ai-chat-container {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

html[data-theme-mode="dark"] .ai-chat-container {
  border-color: var(--b3-border-color, #4a5568);
}
</style>
