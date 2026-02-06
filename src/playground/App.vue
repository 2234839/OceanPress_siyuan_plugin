<template>
  <TooltipProvider>
    <div class="min-h-screen flex flex-col app-gradient">
    <header class="flex justify-between items-center px-5 py-3 text-white">
      <div class="flex-1 text-center">
        <router-link to="/" class="no-underline text-inherit">
          <h1 class="text-2xl mb-1">🧪 OceanPress 测试平台</h1>
        </router-link>
        <p class="text-sm opacity-90">插件功能测试与验证</p>
      </div>
      <TooltipRoot>
        <TooltipTrigger as-child>
          <a
            href="https://github.com/2234839/OceanPress_siyuan_plugin"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center w-10 h-10 rounded-lg text-white bg-white/20 hover:bg-white/30 hover:scale-105 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            title="查看源码">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          class="bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 px-3 py-1.5 rounded-md shadow-lg text-sm data-[state=delayed-open]:animate-slideUpAndFade">
          查看源码
          <TooltipArrow class="fill-white/90 dark:fill-gray-800/90" />
        </TooltipContent>
      </TooltipRoot>
    </header>

    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="text-center p-2 text-white opacity-80 text-xs">
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
  </TooltipProvider>
</template>

<script setup lang="ts">
import { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent, TooltipArrow } from 'reka-ui';

// 不需要额外的逻辑，路由已经配置好了
</script>

<style scoped>
/* Tooltip 动画 */
@keyframes slideUpAndFade {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slideUpAndFade {
  animation: slideUpAndFade 0.2s ease-out;
}

.app-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

/* 响应式调整 */
@media (max-width: 768px) {
  header {
    padding: 12px 16px;
  }

  h1 {
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
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  footer {
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
