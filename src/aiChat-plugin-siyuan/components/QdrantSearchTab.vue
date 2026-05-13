<template>
  <div class="search-tab">
    <div class="search-input-row">
      <input
        type="text"
        v-model="query"
        class="search-input"
        placeholder="输入搜索内容..."
        @keydown.enter="doSearch"
        :disabled="loading"
      />
      <button class="search-btn" @click="doSearch" :disabled="loading || !query.trim()">
        {{ loading ? "搜索中..." : "搜索" }}
      </button>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div v-if="results.length > 0" class="results-info">找到 {{ results.length }} 条结果</div>

    <div class="results-list">
      <div v-for="r in results" :key="r.blockId + r.content" class="result-item">
        <div class="result-header">
          <span class="result-score">{{ (r.score * 100).toFixed(1) }}%</span>
          <span class="result-path">{{ r.hpath }}</span>
          <button class="open-btn" @click="openBlock(r.blockId)" title="在思源中打开">打开</button>
        </div>
        <div class="result-content">{{ r.content }}</div>
      </div>
    </div>

    <div v-if="!loading && searched && results.length === 0" class="no-results">
      未找到相关内容
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { semanticSearch } from "../qdrant/search"
import type { QdrantPluginConfig, EnrichedSearchResult } from "../qdrant/types"

const props = defineProps<{
  config: QdrantPluginConfig
}>()

const query = ref("")
const loading = ref(false)
const searched = ref(false)
const error = ref("")
const results = ref<EnrichedSearchResult[]>([])

async function doSearch() {
  if (!query.value.trim()) return
  loading.value = true
  error.value = ""
  results.value = []
  searched.value = false

  try {
    results.value = await semanticSearch(props.config, query.value, 10)
    searched.value = true
  } catch (e: any) {
    error.value = e.message ?? String(e)
  } finally {
    loading.value = false
  }
}

/** 在思源笔记中打开指定块 */
function openBlock(blockId: string) {
  const event = new CustomEvent("click", { bubbles: true })
  const link = document.createElement("a")
  link.href = `siyuan://blocks/${blockId}`
  link.dispatchEvent(event)
}
</script>

<style scoped>
.search-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-input-row {
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--b3-border-color, #ced4da);
  border-radius: 8px;
  font-size: 14px;
  background: var(--b3-theme-background, white);
  color: var(--b3-theme-on-background, #2c3e50);
}

html[data-theme-mode="dark"] .search-input {
  background: var(--b3-theme-background, #1a1a1a);
  border-color: var(--b3-border-color, #4a5568);
  color: var(--b3-theme-on-background, #e2e8f0);
}

.search-input:focus {
  outline: none;
  border-color: var(--b3-theme-primary, #4a90e2);
}

.search-btn {
  padding: 10px 20px;
  background: var(--b3-theme-primary, #4a90e2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
  white-space: nowrap;
}

.search-btn:hover:not(:disabled) {
  background: var(--b3-theme-primary-dark, #357abd);
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  padding: 10px 14px;
  background: #f8d7da;
  color: #721c24;
  border-radius: 6px;
  font-size: 13px;
}

html[data-theme-mode="dark"] .error-msg {
  background: #3a1a1a;
  color: #e57373;
}

.results-info {
  font-size: 13px;
  color: var(--b3-theme-on-background-light, #6c757d);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item {
  padding: 12px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
  border-radius: 8px;
  background: var(--b3-theme-background, white);
}

html[data-theme-mode="dark"] .result-item {
  background: var(--b3-theme-background, #1e1e1e);
  border-color: var(--b3-border-color, #4a5568);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.result-score {
  padding: 2px 8px;
  background: var(--b3-theme-primary-lighter, #e3f2fd);
  color: var(--b3-theme-primary, #1976d2);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

html[data-theme-mode="dark"] .result-score {
  background: #1a2a4a;
  color: #64b5f6;
}

.result-path {
  font-size: 12px;
  color: var(--b3-theme-on-background-light, #6c757d);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.open-btn {
  padding: 4px 10px;
  border: 1px solid var(--b3-theme-primary, #4a90e2);
  background: transparent;
  color: var(--b3-theme-primary, #4a90e2);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.open-btn:hover {
  background: var(--b3-theme-primary, #4a90e2);
  color: white;
}

.result-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--b3-theme-on-background, #2c3e50);
  max-height: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
}

.no-results {
  text-align: center;
  padding: 24px;
  color: var(--b3-theme-on-background-light, #6c757d);
  font-size: 14px;
}
</style>
