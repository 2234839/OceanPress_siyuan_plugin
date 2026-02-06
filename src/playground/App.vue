<template>
  <div class="test-platform">
    <header class="platform-header">
      <div class="header-content">
        <router-link to="/" class="logo">
          <h1>🧪 OceanPress 测试平台</h1>
        </router-link>
        <p class="subtitle">插件功能测试与验证</p>
      </div>
      <a
        href="https://github.com/2234839/OceanPress_siyuan_plugin"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link"
        title="查看源码"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>
    </header>

    <main class="platform-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="platform-footer">
      <p>
        <a
          href="https://github.com/2234839/OceanPress_siyuan_plugin"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
        >
          OceanPress
        </a>
        Plugin Testing Platform
      </p>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  color: white;
}

.header-content {
  flex: 1;
  text-align: center;
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

.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
}

.github-link:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.github-link svg {
  width: 24px;
  height: 24px;
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

.footer-link {
  color: white;
  text-decoration: none;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.5);
  transition: border-color 0.2s ease;
}

.footer-link:hover {
  border-bottom-style: solid;
  border-bottom-color: white;
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
  .platform-header {
    padding: 12px 16px;
  }

  .platform-header h1 {
    font-size: 1.3rem;
  }

  .github-link {
    width: 36px;
    height: 36px;
  }

  .github-link svg {
    width: 20px;
    height: 20px;
  }

  .platform-main {
    padding: 0 12px 12px;
  }
}

@media (prefers-color-scheme: dark) {
  .platform-footer {
    color: #ccc;
  }

  .footer-link {
    color: #ccc;
    border-bottom-color: rgba(204, 204, 204, 0.5);
  }

  .footer-link:hover {
    border-bottom-color: #ccc;
  }
}
</style>
