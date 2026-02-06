<template>
  <div class="test-platform">
    <header class="platform-header">
      <div class="header-content">
        <router-link to="/" class="logo">
          <h1>🧪 OceanPress 测试平台</h1>
        </router-link>
        <p class="subtitle">插件功能测试与验证</p>
      </div>
    </header>

    <main class="platform-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="platform-footer">
      <p>OceanPress Plugin Testing Platform</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
// 不需要额外的逻辑，路由已经配置好了
</script>

<style scoped>
.test-platform {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.platform-header {
  text-align: center;
  padding: 12px 20px;
  color: white;
}

.logo {
  text-decoration: none;
  color: inherit;
}

.platform-header h1 {
  font-size: 1.5rem;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 0.85rem;
  opacity: 0.9;
}

.platform-main {
  flex: 1;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 0 16px 16px;
}

.platform-footer {
  text-align: center;
  padding: 8px;
  color: white;
  opacity: 0.8;
  font-size: 0.75rem;
}

/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .platform-header h1 {
    font-size: 1.3rem;
  }

  .platform-main {
    padding: 0 12px 12px;
  }
}

@media (prefers-color-scheme: dark) {
  .platform-footer {
    color: #ccc;
  }
}
</style>
