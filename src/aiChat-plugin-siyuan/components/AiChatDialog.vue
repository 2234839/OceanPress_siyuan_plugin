<template>
  <div class="dialog-container" contenteditable="false">
    <div class="main-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="main-tab-btn"
        :class="{ active: activeMainTab === tab.key }"
        @click="activeMainTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <div class="main-tab-content">
      <ChatPanel v-if="activeMainTab === 'chat'" />

      <QdrantTab
        v-if="activeMainTab === 'qdrant'"
        :config="qdrantConfig"
        :indexing-state="indexingState"
      />

      <div v-if="activeMainTab === 'settings'" class="settings-panel">
        <ConfigPanel v-model="aiChatConfig" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import type { QdrantPluginConfig, IndexingState } from "../qdrant/types"
import ChatPanel from "./ChatPanel.vue"
import QdrantTab from "./QdrantTab.vue"
import ConfigPanel from "./ConfigPanel.vue"
import { aiChatConfig } from "../openai"

const props = defineProps<{
  plugin: any
  qdrantConfig: QdrantPluginConfig
  indexingState: IndexingState
}>()

const activeMainTab = ref<"chat" | "qdrant" | "settings">("chat")

const qdrantEnabled = computed(() => !!props.qdrantConfig.qdrantUrl.trim())

const tabs = computed(() => {
  const list: Array<{ key: "chat" | "qdrant" | "settings"; label: string }> = [
    { key: "chat", label: "AI 对话" },
  ]
  if (qdrantEnabled.value) {
    list.push({ key: "qdrant", label: "Qdrant" })
  }
  list.push({ key: "settings", label: "设置" })
  return list
})
</script>

<style scoped>
.dialog-container {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.main-tabs {
  display: flex;
  gap: 2px;
  padding: 0 12px;
  border-bottom: 1px solid var(--b3-border-color, #e4e7ed);
  flex-shrink: 0;
}

.main-tab-btn {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: var(--b3-theme-on-background-light, #999);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}

.main-tab-btn:hover {
  color: var(--b3-theme-on-background, #333);
}

.main-tab-btn.active {
  color: var(--b3-theme-primary, #3573f0);
  border-bottom-color: var(--b3-theme-primary, #3573f0);
}

.main-tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.settings-panel {
  overflow-y: auto;
}
</style>
