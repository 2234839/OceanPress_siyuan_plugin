<template>
  <div class="error-message">
    <div class="error-icon">⚠️</div>
    <div class="error-text">{{ message }}</div>
    <button class="error-close" @click="$emit('close')" title="关闭">
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
}>();

defineEmits<{
  'close': [];
}>();
</script>

<style scoped>
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  margin: 16px 0;
}

.error-icon {
  font-size: 16px;
}

.error-text {
  flex: 1;
  font-size: 14px;
  color: var(--b3-theme-error, #c53030);
}

.error-close {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  color: var(--b3-theme-error, #c53030);
  cursor: pointer;
  font-size: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.error-close:hover {
  background: rgba(239, 68, 68, 0.1);
}
</style>