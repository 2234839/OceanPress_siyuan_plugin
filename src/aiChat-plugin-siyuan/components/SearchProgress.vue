<template>
  <div class="search-progress">
    <div class="progress-header">
      <div class="progress-title-section">
        <div class="progress-icon">🔍</div>
        <span class="progress-title">智能搜索进行中...</span>
      </div>
      <span class="progress-step">{{ currentStep }}</span>
    </div>
    
    <div v-if="round > 0" class="progress-content">
      <div class="progress-info-grid">
        <div class="info-item">
          <div class="info-label">搜索轮次</div>
          <div class="info-value">第 {{ round + 1 }} 轮</div>
        </div>
        <div class="info-item">
          <div class="info-label">找到结果</div>
          <div class="info-value">{{ searchResults.length }} 条</div>
        </div>
      </div>
      
      <div v-if="keywords.length > 0" class="keywords-section">
        <div class="section-title">搜索关键词</div>
        <div class="keywords-container">
          <span v-for="(keyword, index) in keywords" :key="index" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </div>
      
      <div v-if="thinkingProcess.length > 0" class="thinking-section">
        <div class="section-title">思考过程</div>
        <div class="thinking-list">
          <div v-for="(thought, index) in thinkingProcess" :key="index" class="thinking-item">
            <div class="thinking-bullet">•</div>
            <div class="thinking-text">{{ thought }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="progress-loader">
      <div class="loader-container">
        <div class="loader-bar"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface SearchState {
  isSearching: boolean;
  currentStep: string;
  round: number;
  keywords: string[];
  searchResults: any[];
  thinkingProcess: string[];
}

const props = defineProps<{
  searchState: SearchState;
}>();

const currentStep = computed(() => props.searchState.currentStep);
const round = computed(() => props.searchState.round);
const keywords = computed(() => props.searchState.keywords);
const searchResults = computed(() => props.searchState.searchResults);
const thinkingProcess = computed(() => props.searchState.thinkingProcess);
</script>

<style scoped>
.search-progress {
  margin: 16px 0;
  padding: 16px;
  background: var(--b3-theme-background-light, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-icon {
  font-size: 16px;
}

.progress-title {
  font-weight: 600;
  color: var(--b3-theme-on-background, #2c3e50);
}

.progress-step {
  color: var(--b3-theme-on-background-light, #6c757d);
  font-size: 13px;
  background: var(--b3-theme-background-light, #e9ecef);
  padding: 2px 8px;
  border-radius: 12px;
}

.progress-content {
  margin-bottom: 12px;
}

.progress-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.info-item {
  text-align: center;
  padding: 8px;
  background: var(--b3-theme-background, white);
  border-radius: 6px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
}

.info-label {
  font-size: 12px;
  color: var(--b3-theme-on-background-light, #6c757d);
  margin-bottom: 4px;
}

.info-value {
  font-weight: 600;
  color: var(--b3-theme-on-background, #2c3e50);
}

.keywords-section {
  margin-bottom: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--b3-theme-on-background, #495057);
  margin-bottom: 8px;
}

.keywords-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.keyword-tag {
  display: inline-block;
  background: var(--b3-theme-primary-lighter, #e3f2fd);
  color: var(--b3-theme-primary, #1976d2);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.thinking-section {
  margin-bottom: 12px;
}

.thinking-list {
  background: var(--b3-theme-background, white);
  border-radius: 6px;
  border: 1px solid var(--b3-border-color, #e4e7ed);
  padding: 8px;
}

.thinking-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.thinking-item:last-child {
  margin-bottom: 0;
}

.thinking-bullet {
  color: var(--b3-theme-on-background-light, #6c757d);
  font-size: 14px;
  margin-top: 2px;
}

.thinking-text {
  flex: 1;
  font-size: 13px;
  color: var(--b3-theme-on-background, #495057);
  line-height: 1.4;
}

.progress-loader {
  margin-top: 12px;
}

.loader-container {
  height: 4px;
  background: var(--b3-theme-background-light, #e9ecef);
  border-radius: 2px;
  overflow: hidden;
}

.loader-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--b3-theme-primary, #4a90e2), var(--b3-theme-primary-dark, #357abd));
  border-radius: 2px;
  animation: loading 1.5s ease-in-out infinite;
}

@keyframes loading {
  0%, 100% { width: 30%; }
  50% { width: 70%; }
}
</style>