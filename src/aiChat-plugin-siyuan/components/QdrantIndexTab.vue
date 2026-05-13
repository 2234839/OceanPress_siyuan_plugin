<template>
  <div class="index-tab">
    <div class="index-section">
      <h3 class="section-title">笔记本选择</h3>
      <p class="section-desc">选择要索引的笔记本（不选则索引全部）</p>
      <div v-if="notebooks.length === 0" class="loading-text">加载中...</div>
      <div class="notebook-list">
        <label v-for="nb in notebooks" :key="nb.id" class="notebook-item">
          <input
            type="checkbox"
            :value="nb.id"
            :checked="config.indexNotebooks.includes(nb.id)"
            @change="toggleNotebook(nb.id)"
          />
          <span>{{ nb.name }}</span>
        </label>
      </div>
    </div>

    <div class="index-section">
      <h3 class="section-title">排除规则</h3>
      <p class="section-desc">按文档路径排除，每行一条，支持 * 通配符。如：/每日笔记/* 或 */模板/*</p>
      <textarea
        class="exclude-input"
        :value="config.excludePatterns.join('\n')"
        @input="updateExcludePatterns($event)"
        placeholder="*/模板/*&#10;/每日笔记/*&#10;*/归档/*"
        :disabled="state.isIndexing"
        rows="3"
      ></textarea>
    </div>

    <div class="index-actions">
      <button class="index-btn" @click="startIndex" :disabled="state.isIndexing">
        {{ state.isIndexing ? "索引中..." : "开始索引" }}
      </button>
      <button
        v-if="config.lastIndexedTime"
        class="clear-btn"
        @click="config.lastIndexedTime = ''"
        :disabled="state.isIndexing"
        title="清除后下次将全量索引"
      >
        重置为全量索引
      </button>
      <span v-if="config.lastIndexedTime" class="mode-hint">
        增量模式（仅索引变更文档）
      </span>
      <span v-else class="mode-hint">
        全量模式
      </span>
    </div>

    <div class="auto-index-section">
      <label class="auto-index-toggle">
        <input type="checkbox" v-model="config.autoIndex" :disabled="state.isIndexing" />
        <span class="auto-index-label">自动增量索引</span>
        <span class="auto-index-desc">后台自动定期索引变更文档</span>
      </label>
      <div v-if="config.autoIndex" class="auto-index-interval">
        <label class="interval-label">间隔（分钟）</label>
        <input
          type="number"
          class="interval-input"
          v-model.number="config.autoIndexInterval"
          min="5"
          step="5"
          :disabled="state.isIndexing"
        />
      </div>
    </div>

    <div v-if="state.isIndexing || state.indexed > 0" class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="progress-text">
        {{ state.indexed }} / {{ state.total }} 文档
        <span v-if="state.currentDoc" class="current-doc">正在处理: {{ state.currentDoc }}</span>
      </div>
    </div>

    <div v-if="state.errors.length > 0" class="errors-section">
      <h4 class="errors-title">错误 ({{ state.errors.length }})</h4>
      <div v-for="(err, i) in state.errors" :key="i" class="error-item">{{ err }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { lsNotebooks } from "~/libs/api"
import { indexNotes } from "../qdrant/indexer"
import type { QdrantPluginConfig, IndexingState } from "../qdrant/types"

const props = defineProps<{
  config: QdrantPluginConfig
  indexingState: IndexingState
}>()

/** reactive 引用，可直接修改属性（因为是引用传递） */
const config = props.config
/** 使用插件级别的 state，切换选项卡/关闭弹窗不丢失 */
const state = props.indexingState

const notebooks = ref<Array<{ id: string; name: string }>>([])

const progressPercent = computed(() => {
  if (state.total === 0) return 0
  return Math.round((state.indexed / state.total) * 100)
})

onMounted(async () => {
  const res = await lsNotebooks()
  notebooks.value = res.notebooks
    .filter((nb: any) => !nb.closed)
    .map((nb: any) => ({ id: nb.id, name: nb.name }))
})

function toggleNotebook(id: string) {
  const idx = config.indexNotebooks.indexOf(id)
  if (idx >= 0) {
    config.indexNotebooks.splice(idx, 1)
  } else {
    config.indexNotebooks.push(id)
  }
}

function updateExcludePatterns(event: Event) {
  const textarea = event.target as HTMLTextAreaElement
  config.excludePatterns = textarea.value.split("\n").filter((l) => l.trim().length > 0)
}

async function startIndex() {
  state.isIndexing = true
  state.currentDoc = ""
  state.indexed = 0
  state.total = 0
  state.errors = []
  try {
    await indexNotes(config, state)
  } catch (e: any) {
    state.errors.push(e.message ?? String(e))
  } finally {
    state.isIndexing = false
  }
}
</script>

<style scoped>
.index-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.index-section {
  padding: 16px;
  background: var(--b3-theme-background-light, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
}

html[data-theme-mode="dark"] .index-section {
  background: var(--b3-theme-background-light, #2a2a2a);
  border-color: var(--b3-border-color, #4a5568);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--b3-theme-on-background, #495057);
}

.section-desc {
  font-size: 12px;
  color: var(--b3-theme-on-background-light, #6c757d);
  margin: 0 0 12px 0;
}

.notebook-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.notebook-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--b3-theme-on-background, #2c3e50);
}

.notebook-item:hover {
  background: var(--b3-theme-background-hover, #e8e8e8);
}

.exclude-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--b3-border-color, #ced4da);
  border-radius: 6px;
  font-size: 13px;
  font-family: monospace;
  resize: vertical;
  background: var(--b3-theme-background, white);
  color: var(--b3-theme-on-background, #2c3e50);
  box-sizing: border-box;
}

html[data-theme-mode="dark"] .exclude-input {
  background: var(--b3-theme-background, #1a1a1a);
  border-color: var(--b3-border-color, #4a5568);
  color: var(--b3-theme-on-background, #e2e8f0);
}

.exclude-input:focus {
  outline: none;
  border-color: var(--b3-theme-primary, #4a90e2);
}

.loading-text {
  color: var(--b3-theme-on-background-light, #6c757d);
  font-size: 13px;
}

.index-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.index-btn {
  padding: 8px 20px;
  background: var(--b3-theme-primary, #4a90e2);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.index-btn:hover:not(:disabled) {
  background: var(--b3-theme-primary-dark, #357abd);
}

.index-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--b3-border-color, #ced4da);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--b3-theme-on-background, #6c757d);
}

.clear-btn:hover:not(:disabled) {
  background: var(--b3-theme-background-light, #f0f0f0);
}

.mode-hint {
  font-size: 12px;
  color: var(--b3-theme-on-background-light, #6c757d);
}

.auto-index-section {
  padding: 12px 16px;
  background: var(--b3-theme-background-light, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
}

html[data-theme-mode="dark"] .auto-index-section {
  background: var(--b3-theme-background-light, #2a2a2a);
  border-color: var(--b3-border-color, #4a5568);
}

.auto-index-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--b3-theme-on-background, #2c3e50);
}

.auto-index-label {
  font-weight: 500;
}

.auto-index-desc {
  font-size: 12px;
  color: var(--b3-theme-on-background-light, #6c757d);
}

.auto-index-interval {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-left: 24px;
}

.interval-label {
  font-size: 13px;
  color: var(--b3-theme-on-background, #495057);
}

.interval-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid var(--b3-border-color, #ced4da);
  border-radius: 4px;
  font-size: 13px;
  background: var(--b3-theme-background, white);
  color: var(--b3-theme-on-background, #2c3e50);
}

.interval-input:focus {
  outline: none;
  border-color: var(--b3-theme-primary, #4a90e2);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-bar {
  height: 8px;
  background: var(--b3-theme-background-light, #e9ecef);
  border-radius: 4px;
  overflow: hidden;
}

html[data-theme-mode="dark"] .progress-bar {
  background: #3a3a3a;
}

.progress-fill {
  height: 100%;
  background: var(--b3-theme-primary, #4a90e2);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--b3-theme-on-background-light, #6c757d);
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-doc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.errors-section {
  padding: 12px;
  background: #fff5f5;
  border-radius: 6px;
  border: 1px solid #ffcdd2;
}

html[data-theme-mode="dark"] .errors-section {
  background: #3a1a1a;
  border-color: #5a2a2a;
}

.errors-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #c62828;
}

html[data-theme-mode="dark"] .errors-title {
  color: #e57373;
}

.error-item {
  font-size: 12px;
  color: #c62828;
  padding: 4px 0;
  border-top: 1px solid rgba(198, 40, 40, 0.1);
}

html[data-theme-mode="dark"] .error-item {
  color: #ef9a9a;
  border-top-color: rgba(239, 154, 154, 0.1);
}
</style>
