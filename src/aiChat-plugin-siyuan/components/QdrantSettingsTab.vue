<template>
  <div class="settings-tab">
    <div class="settings-section">
      <h3 class="section-title">Qdrant 连接</h3>
      <div class="field">
        <label class="field-label">服务地址</label>
        <input type="text" v-model="config.qdrantUrl" class="field-input" placeholder="http://127.0.0.1:6333" />
      </div>
      <button class="test-btn" @click="testQdrant" :disabled="testing.qdrant">
        {{ testing.qdrant ? "测试中..." : "测试连接" }}
      </button>
      <div v-if="testResults.qdrant" class="test-result" :class="testResults.qdrant.ok ? 'success' : 'error'">
        {{ testResults.qdrant.ok
          ? `连接成功 - ${testResults.qdrant.title} v${testResults.qdrant.version}`
          : `连接失败 - ${testResults.qdrant.error}`
        }}
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">LM Studio Embedding</h3>
      <div class="field">
        <label class="field-label">服务地址</label>
        <input type="text" v-model="config.lmStudioUrl" class="field-input" placeholder="http://127.0.0.1:1234" />
      </div>
      <div class="field">
        <label class="field-label">Embedding 模型名称</label>
        <input type="text" v-model="config.embeddingModel" class="field-input" placeholder="text-embedding-model" />
      </div>
      <button class="test-btn" @click="testEmbedding" :disabled="testing.embedding">
        {{ testing.embedding ? "测试中..." : "测试连接" }}
      </button>
      <div v-if="testResults.embedding" class="test-result" :class="testResults.embedding.ok ? 'success' : 'error'">
        {{ testResults.embedding.ok
          ? `连接成功 - 向量维度: ${testResults.embedding.dimensions}`
          : `连接失败 - ${testResults.embedding.error}`
        }}
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">集合配置</h3>
      <div class="field">
        <label class="field-label">默认集合名称</label>
        <input type="text" v-model="config.defaultCollection" class="field-input" placeholder="siyuan-notes" />
      </div>
      <div class="field">
        <label class="field-label">向量维度（测试 Embedding 连接后自动填入）</label>
        <input type="number" v-model.number="config.vectorSize" class="field-input" placeholder="点击上方测试连接自动检测" readonly />
      </div>
      <div class="field">
        <label class="field-label">距离度量</label>
        <select v-model="config.distanceMetric" class="field-input">
          <option value="Cosine">Cosine（余弦相似度）</option>
          <option value="Euclid">Euclid（欧几里得距离）</option>
          <option value="Dot">Dot（点积）</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">分块大小（字符数）</label>
        <input type="number" v-model.number="config.chunkSize" class="field-input" placeholder="500" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue"
import { testConnection } from "../qdrant/qdrant-client"
import { testEmbeddingConnection } from "../qdrant/embedding"
import type { QdrantPluginConfig } from "../qdrant/types"

const props = defineProps<{
  config: QdrantPluginConfig
}>()

const config = props.config

const testing = reactive({
  qdrant: false,
  embedding: false,
})

const testResults = reactive<{
  qdrant: { ok: boolean; title?: string; version?: string; error?: string } | null
  embedding: { ok: boolean; error?: string; dimensions?: number } | null
}>({
  qdrant: null,
  embedding: null,
})

async function testQdrant() {
  testing.qdrant = true
  testResults.qdrant = null
  try {
    testResults.qdrant = await testConnection(config.qdrantUrl)
  } catch (e: any) {
    testResults.qdrant = { ok: false, error: e.message ?? String(e) }
  } finally {
    testing.qdrant = false
  }
}

async function testEmbedding() {
  testing.embedding = true
  testResults.embedding = null
  try {
    testResults.embedding = await testEmbeddingConnection(config)
    /** 测试成功后自动同步实际维度到配置 */
    if (testResults.embedding.ok && testResults.embedding.dimensions) {
      config.vectorSize = testResults.embedding.dimensions
    }
  } catch (e: any) {
    testResults.embedding = { ok: false, error: e.message ?? String(e) }
  } finally {
    testing.embedding = false
  }
}
</script>

<style scoped>
.settings-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-section {
  padding: 16px;
  background: var(--b3-theme-background-light, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
}

html[data-theme-mode="dark"] .settings-section {
  background: var(--b3-theme-background-light, #2a2a2a);
  border-color: var(--b3-border-color, #4a5568);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--b3-theme-on-background, #495057);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--b3-theme-on-background, #495057);
}

.field-input {
  padding: 8px 12px;
  border: 1px solid var(--b3-border-color, #ced4da);
  border-radius: 6px;
  font-size: 14px;
  background: var(--b3-theme-background, white);
  color: var(--b3-theme-on-background, #2c3e50);
}

html[data-theme-mode="dark"] .field-input {
  background: var(--b3-theme-background, #1a1a1a);
  border-color: var(--b3-border-color, #4a5568);
  color: var(--b3-theme-on-background, #e2e8f0);
}

.field-input:focus {
  outline: none;
  border-color: var(--b3-theme-primary, #4a90e2);
}

.test-btn {
  padding: 6px 16px;
  border: 1px solid var(--b3-theme-primary, #4a90e2);
  background: transparent;
  color: var(--b3-theme-primary, #4a90e2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.test-btn:hover:not(:disabled) {
  background: var(--b3-theme-primary, #4a90e2);
  color: white;
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-result {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.test-result.success {
  background: #d4edda;
  color: #155724;
}

html[data-theme-mode="dark"] .test-result.success {
  background: #1a3a2a;
  color: #7dcea0;
}

.test-result.error {
  background: #f8d7da;
  color: #721c24;
}

html[data-theme-mode="dark"] .test-result.error {
  background: #3a1a1a;
  color: #e57373;
}
</style>
