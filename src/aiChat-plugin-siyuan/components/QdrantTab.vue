<template>
  <div class="qdrant-container" contenteditable="false">
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <div class="tab-content">
      <QdrantSearchTab v-if="activeTab === 'search'" :config="config" />
      <QdrantIndexTab v-if="activeTab === 'index'" :config="config" :indexing-state="indexingState" />
      <QdrantCollectionsTab v-if="activeTab === 'collections'" :qdrant-url="config.qdrantUrl" />
      <QdrantSettingsTab v-if="activeTab === 'settings'" :config="config" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import type { QdrantPluginConfig, IndexingState } from "../qdrant/types"
import QdrantSearchTab from "./QdrantSearchTab.vue"
import QdrantIndexTab from "./QdrantIndexTab.vue"
import QdrantCollectionsTab from "./QdrantCollectionsTab.vue"
import QdrantSettingsTab from "./QdrantSettingsTab.vue"

const props = defineProps<{
  config: QdrantPluginConfig
  indexingState: IndexingState
}>()

const activeTab = ref<"search" | "index" | "collections" | "settings">("search")

const tabs = [
  { key: "search" as const, label: "语义搜索" },
  { key: "index" as const, label: "索引管理" },
  { key: "collections" as const, label: "集合管理" },
  { key: "settings" as const, label: "设置" },
]
</script>

<style scoped>
.qdrant-container {
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  max-height: 70vh;
  overflow-y: auto;
}

.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--b3-border-color, #e4e7ed);
  padding-bottom: 8px;
}

.tab-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: var(--b3-theme-on-background-light, #6c757d);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px 6px 0 0;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--b3-theme-on-background, #2c3e50);
  background: var(--b3-theme-background-light, #f0f0f0);
}

.tab-btn.active {
  color: var(--b3-theme-primary, #4a90e2);
  border-bottom: 2px solid var(--b3-theme-primary, #4a90e2);
}

html[data-theme-mode="dark"] .tab-btn:hover {
  background: var(--b3-theme-background-light, #2a2a2a);
}

.tab-content {
  min-height: 200px;
}
</style>
