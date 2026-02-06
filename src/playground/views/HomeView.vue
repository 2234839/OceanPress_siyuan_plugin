<template>
  <div class="w-full max-w-3xl mx-auto px-4 pb-4">
    <div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
      <router-link
        v-for="test in tests"
        :key="test.path"
        :to="{ name: test.name }"
        class="test-card"
      >
        <div class="text-2xl mb-2">{{ test.meta?.icon }}</div>
        <h3 class="text-base mb-1.5 text-[#333]">{{ test.meta?.title }}</h3>
        <p class="text-[#666] mb-2 flex-1 text-sm">{{ test.meta?.description }}</p>
        <div class="test-status" :class="test.status">
          {{ statusText[test.status] }}
        </div>
      </router-link>

      <div class="test-card placeholder">
        <div class="text-2xl mb-2">➕</div>
        <h3 class="text-base mb-1.5 text-[#333]">更多测试</h3>
        <p class="text-[#666] mb-2 flex-1 text-sm">即将推出...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

/** 测试项目列表 */
const tests = router
  .getRoutes()
  .filter((route) => route.meta?.title)
  .map((route) => ({
    path: route.path,
    name: route.name as string,
    meta: route.meta,
    status: (route.meta?.status || 'stable') as 'stable' | 'beta' | 'experimental',
  }));

/** 状态文本 */
const statusText = {
  stable: '稳定',
  beta: '测试中',
  experimental: '实验性',
};
</script>

<style scoped>
.test-card {
  background: white;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  text-decoration: none;
  color: inherit;
}

.test-card:hover:not(.placeholder) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.test-card.placeholder {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}

.test-status {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
}

.test-status.stable {
  background: #d4edda;
  color: #155724;
}

.test-status.beta {
  background: #fff3cd;
  color: #856404;
}

.test-status.experimental {
  background: #f8d7da;
  color: #721c24;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }

  div[class*="max-w"] {
    padding: 0 12px 12px;
  }
}

@media (prefers-color-scheme: dark) {
  .test-card {
    background: #1e1e1e;
    border: 1px solid #333;
  }

  .test-card h3 {
    color: #e0e0e0;
  }

  .test-card p {
    color: #aaa;
  }
}
</style>
