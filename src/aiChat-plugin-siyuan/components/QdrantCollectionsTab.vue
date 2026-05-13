<template>
  <div class="collections-tab">
    <div class="collections-header">
      <h3 class="section-title">集合列表</h3>
      <button class="refresh-btn" @click="loadCollections" :disabled="loading">刷新</button>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <div v-else-if="collections.length === 0" class="empty-text">暂无集合</div>

    <div v-else class="collection-list">
      <div v-for="col in collections" :key="col.name" class="collection-item">
        <div class="collection-info">
          <span class="collection-name">{{ col.name }}</span>
          <span v-if="col.info" class="collection-stats">
            {{ col.info.points_count }} 点 / {{ col.info.config.params.vectors.size }} 维 / {{ col.info.config.params.vectors.distance }}
          </span>
          <span v-else-if="col.error" class="collection-error">加载失败</span>
        </div>
        <div class="collection-actions">
          <button class="browse-btn" @click="browseCollection(col.name)" title="浏览点">浏览</button>
          <button class="delete-btn" @click="deleteCollection(col.name)" title="删除集合">删除</button>
        </div>
      </div>
    </div>

    <div class="create-section">
      <h3 class="section-title">创建集合</h3>
      <div class="create-row">
        <input type="text" v-model="newCollection.name" class="field-input" placeholder="集合名称" />
        <input type="number" v-model.number="newCollection.vectorSize" class="field-input small" placeholder="维度" />
        <select v-model="newCollection.distance" class="field-input small">
          <option value="Cosine">Cosine</option>
          <option value="Euclid">Euclid</option>
          <option value="Dot">Dot</option>
        </select>
        <button class="create-btn" @click="createNewCollection" :disabled="!newCollection.name.trim()">创建</button>
      </div>
    </div>

    <div v-if="browsingPoints" class="browse-section">
      <div class="browse-header">
        <h3 class="section-title">浏览: {{ browsingCollection }}</h3>
        <button class="close-btn" @click="browsingPoints = null">关闭</button>
      </div>
      <div class="points-list">
        <div v-for="pt in browsingPoints" :key="String(pt.id)" class="point-item">
          <div class="point-id">{{ String(pt.id) }}</div>
          <div class="point-payload">{{ formatPayload(pt.payload) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import {
  listCollections,
  getCollectionInfo,
  createCollection,
  deleteCollection as deleteCol,
  scrollPoints,
} from "../qdrant/qdrant-client"
import type { QdrantCollectionInfo, QdrantPoint } from "../qdrant/types"

const props = defineProps<{
  qdrantUrl: string
}>()

interface CollectionEntry {
  name: string
  info: QdrantCollectionInfo | null
  error: boolean
}

const loading = ref(false)
const collections = ref<CollectionEntry[]>([])
const newCollection = reactive({
  name: "",
  vectorSize: 768,
  distance: "Cosine" as "Cosine" | "Euclid" | "Dot",
})
const browsingPoints = ref<QdrantPoint[] | null>(null)
const browsingCollection = ref("")

onMounted(() => {
  loadCollections()
})

async function loadCollections() {
  loading.value = true
  try {
    const names = await listCollections(props.qdrantUrl)
    const entries: CollectionEntry[] = []
    for (const name of names) {
      try {
        const info = await getCollectionInfo(props.qdrantUrl, name)
        entries.push({ name, info, error: false })
      } catch {
        entries.push({ name, info: null, error: true })
      }
    }
    collections.value = entries
  } catch (e) {
    console.error("加载集合失败:", e)
  } finally {
    loading.value = false
  }
}

async function createNewCollection() {
  if (!newCollection.name.trim()) return
  await createCollection(
    props.qdrantUrl,
    newCollection.name.trim(),
    newCollection.vectorSize,
    newCollection.distance,
  )
  newCollection.name = ""
  await loadCollections()
}

async function deleteCollection(name: string) {
  await deleteCol(props.qdrantUrl, name)
  await loadCollections()
}

async function browseCollection(name: string) {
  browsingCollection.value = name
  const result = await scrollPoints(props.qdrantUrl, name, 20)
  browsingPoints.value = result.points
}

function formatPayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) return ""
  const entries = Object.entries(payload)
    .filter(([k]) => k !== "vector")
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v.slice(0, 80) : JSON.stringify(v)}`)
  return entries.join(" | ")
}
</script>

<style scoped>
.collections-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.collections-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--b3-theme-on-background, #495057);
}

.refresh-btn {
  padding: 4px 12px;
  border: 1px solid var(--b3-border-color, #ced4da);
  background: transparent;
  color: var(--b3-theme-on-background, #6c757d);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--b3-theme-background-light, #f0f0f0);
}

.loading-text, .empty-text {
  text-align: center;
  padding: 16px;
  color: var(--b3-theme-on-background-light, #6c757d);
  font-size: 13px;
}

.collection-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.collection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
  border-radius: 6px;
  background: var(--b3-theme-background, white);
}

html[data-theme-mode="dark"] .collection-item {
  background: var(--b3-theme-background, #1e1e1e);
  border-color: var(--b3-border-color, #4a5568);
}

.collection-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.collection-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--b3-theme-on-background, #2c3e50);
}

.collection-stats {
  font-size: 12px;
  color: var(--b3-theme-on-background-light, #6c757d);
}

.collection-error {
  font-size: 12px;
  color: #e57373;
}

.collection-actions {
  display: flex;
  gap: 6px;
}

.browse-btn, .delete-btn {
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.browse-btn {
  border: 1px solid var(--b3-theme-primary, #4a90e2);
  background: transparent;
  color: var(--b3-theme-primary, #4a90e2);
}

.browse-btn:hover {
  background: var(--b3-theme-primary, #4a90e2);
  color: white;
}

.delete-btn {
  border: 1px solid #e57373;
  background: transparent;
  color: #e57373;
}

.delete-btn:hover {
  background: #e57373;
  color: white;
}

.create-section {
  padding: 12px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
  border-radius: 6px;
}

html[data-theme-mode="dark"] .create-section {
  border-color: var(--b3-border-color, #4a5568);
}

.create-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.field-input {
  padding: 6px 10px;
  border: 1px solid var(--b3-border-color, #ced4da);
  border-radius: 4px;
  font-size: 13px;
  background: var(--b3-theme-background, white);
  color: var(--b3-theme-on-background, #2c3e50);
}

html[data-theme-mode="dark"] .field-input {
  background: var(--b3-theme-background, #1a1a1a);
  border-color: var(--b3-border-color, #4a5568);
  color: var(--b3-theme-on-background, #e2e8f0);
}

.field-input.small {
  width: 80px;
}

.create-btn {
  padding: 6px 14px;
  background: var(--b3-theme-primary, #4a90e2);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.create-btn:hover:not(:disabled) {
  background: var(--b3-theme-primary-dark, #357abd);
}

.create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.browse-section {
  padding: 12px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
  border-radius: 6px;
}

html[data-theme-mode="dark"] .browse-section {
  border-color: var(--b3-border-color, #4a5568);
}

.browse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.close-btn {
  padding: 4px 10px;
  border: 1px solid var(--b3-border-color, #ced4da);
  background: transparent;
  color: var(--b3-theme-on-background, #6c757d);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.point-item {
  padding: 8px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
  border-radius: 4px;
  font-size: 12px;
}

html[data-theme-mode="dark"] .point-item {
  border-color: var(--b3-border-color, #4a5568);
}

.point-id {
  font-weight: 600;
  color: var(--b3-theme-primary, #4a90e2);
  margin-bottom: 4px;
  word-break: break-all;
}

.point-payload {
  color: var(--b3-theme-on-background-light, #6c757d);
  word-break: break-all;
}
</style>
