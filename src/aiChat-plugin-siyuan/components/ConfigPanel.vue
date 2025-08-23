<template>
  <div class="config-panel">
    <div class="config-section">
      <h3 class="config-title">API 配置</h3>
      <div class="config-options">
        <label 
          v-for="provider in apiProviders" 
          :key="provider.value" 
          class="radio-option"
        >
          <input 
            type="radio" 
            v-model="modelValue.apiProvider" 
            :value="provider.value"
            :disabled="provider.disabled"
            @change="handleProviderChange"
          />
          <span class="radio-label">{{ provider.label }}</span>
          <span v-if="provider.description" class="radio-description">
            {{ provider.description }}
          </span>
        </label>
      </div>
    </div>

    <div v-if="modelValue.apiProvider === 'openai'" class="config-section">
      <h3 class="config-title">自定义 API 设置</h3>
      <div class="config-fields">
        <div class="config-field">
          <label class="field-label">API Base URL</label>
          <input
            type="text"
            v-model="modelValue.apiBaseUrl"
            class="field-input"
            placeholder="https://api.openai.com/v1"
            @input="handleConfigChange"
          />
        </div>
        <div class="config-field">
          <label class="field-label">API Key</label>
          <input
            type="password"
            v-model="modelValue.apiKey"
            class="field-input"
            placeholder="sk-..."
            @input="handleConfigChange"
          />
        </div>
        <div class="config-field">
          <label class="field-label">Model</label>
          <input
            type="text"
            v-model="modelValue.model"
            class="field-input"
            placeholder="gpt-3.5-turbo"
            @input="handleConfigChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface ApiConfig {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  apiProvider: 'siyuan' | 'openai' | '崮生';
}

interface ApiProvider {
  value: 'siyuan' | 'openai' | '崮生';
  label: string;
  description: string;
  disabled?: boolean;
}

const props = defineProps<{
  modelValue: ApiConfig;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ApiConfig];
  'change': [value: ApiConfig];
}>();

const apiProviders: ApiProvider[] = [
  {
    value: 'siyuan',
    label: '思源内置 AI',
    description: '使用思源笔记设置中的 AI 配置'
  },
  {
    value: '崮生',
    label: '插件作者提供',
    description: '使用插件作者提供的 AI 服务'
  },
  {
    value: 'openai',
    label: '自定义 API',
    description: '使用自定义的 OpenAI 兼容 API'
  }
];

// 处理配置变更
const handleConfigChange = () => {
  emit('update:modelValue', props.modelValue);
  emit('change', props.modelValue);
};

// 处理提供商变更
const handleProviderChange = () => {
  handleConfigChange();
};
</script>

<style scoped>
.config-panel {
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.config-section {
  margin-bottom: 16px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #495057;
}

.config-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.radio-option:hover {
  background: #e8e8e8;
}

.radio-option input[type="radio"] {
  margin-top: 2px;
}

.radio-label {
  font-weight: 500;
  color: #2c3e50;
}

.radio-description {
  font-size: 12px;
  color: #6c757d;
  margin-top: 2px;
}

.config-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.field-input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.field-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}
</style>