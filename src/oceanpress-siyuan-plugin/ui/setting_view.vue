<template>
  <div class="content">
    <div class="scroll-area">
      <div class="header">
        <div class="title">🔍 OCR 服务配置</div>
        <div class="subtitle">选择文字识别服务</div>
      </div>

      <div class="section">
        <div class="section-title">服务类型</div>
        <div class="server-options">
          <div
            class="server-option"
            :class="{ active: selectedServer === 'custom' }"
            @click="selectServer('custom')">
            <div class="server-icon">🏠</div>
            <div class="server-info">
              <div class="server-name">本地服务</div>
              <div class="server-desc">使用自己的 Umi-OCR 服务</div>
            </div>
          </div>

          <div
            class="server-option"
            :class="{ active: selectedServer === 'public' }"
            @click="selectServer('public')">
            <div class="server-icon">❤️</div>
            <div class="server-info">
              <div class="server-name">公益服务器</div>
              <div class="server-desc">免费的 Umi-OCR 服务</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section" v-if="selectedServer === 'custom'">
        <div class="section-title">API 地址</div>
        <input
          type="text"
          class="input"
          placeholder="输入 Umi-OCR API 地址"
          :value="umiApi"
          @input="handleUmiApiChange" />
      </div>

      <div class="section" v-if="selectedServer === 'public'">
        <div class="public-server-info">
          <div class="info-item">
            <span class="info-emoji">🔒</span>
            <span>识别完成后图片立即删除</span>
          </div>
          <div class="info-item">
            <span class="info-emoji">🌐</span>
            <span>支持多种语言和格式识别</span>
          </div>
        </div>
      </div>

      <div class="donation-section" v-if="selectedServer === 'public'">
        <div class="donation-header">💖 支持公益服务</div>
        <div class="donation-content">
          <p>如果这个服务对您有帮助，欢迎在爱发电上支持我们，让这份爱心持续传递。</p>
          <a href="https://afdian.com/@llej0" target="_blank" class="donation-btn">
            前往爱发电支持
          </a>
        </div>
      </div>

    </div>
    <div class="actions">
      <button class="save-btn" @click="onExit">
        完成
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';

  const props = defineProps({
    dialog: {
      type: Object,
      required: true,
    },
    dataSignal: {
      type: Object,
      required: true,
    },
    save: {
      type: Function,
      required: true,
    },
  });

  const data = ref(props.dataSignal);
  const selectedServer = ref<'custom' | 'public'>('custom');
  const umiApi = computed(() => data.value.umiApi);

  // 公益服务器地址
  const PUBLIC_SERVER_URL = 'https://ocr.heartstack.space/api/ocr';

  // 初始化服务器选择
  onMounted(() => {
    if (data.value.umiApi === PUBLIC_SERVER_URL) {
      selectedServer.value = 'public';
    } else {
      selectedServer.value = 'custom';
    }
  });

  const onExit = () => {
    props.save();
    props.dialog.destroy();
  };

  const setData = (updater: (prev: any) => any) => {
    data.value = updater(data.value);
  };

  const handleUmiApiChange = (e: Event) => {
    setData((prev) => ({
      ...prev,
      umiApi: (e.target as HTMLInputElement).value,
    }));
  };

  const selectServer = (server: 'custom' | 'public') => {
    selectedServer.value = server;
    if (server === 'public') {
      setData((prev) => ({
        ...prev,
        umiApi: PUBLIC_SERVER_URL,
      }));
    }
  };
</script>

<style scoped>
  /* 内容容器样式 */
  .content {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    width: min(92vw, 500px);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    box-sizing: border-box;
    background: var(--b3-theme-background, #f5f5f5);
    padding: 16px;
    border-radius: 12px;
  }

  .scroll-area {
    overflow-y: auto;
    flex: 1 1 auto;
    padding-right: 4px;
  }

  /* 头部样式 */
  .header {
    text-align: center;
    margin-bottom: 24px;
  }

  .title {
    font-size: 22px;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--b3-theme-on-background, #1a1a1a);
  }

  .subtitle {
    font-size: 14px;
    color: var(--b3-theme-on-surface, #666666);
  }

  /* 区块样式 */
  .section {
    background: var(--b3-theme-surface, #ffffff);
    border-radius: 10px;
    padding: 18px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .section-title {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 14px;
    color: var(--b3-theme-on-surface, #888888);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  /* 服务器选项样式 */
  .server-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .server-option {
    display: flex;
    align-items: center;
    padding: 14px;
    border-radius: 8px;
    background: transparent;
    border: 1.5px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .server-option:hover {
    background: var(--b3-theme-background, #f9f9f9);
  }

  .server-option.active {
    border-color: var(--b3-theme-primary, #4a9eff);
    background: var(--b3-theme-background, #f0f7ff);
  }

  .server-icon {
    font-size: 24px;
    margin-right: 14px;
  }

  .server-info {
    flex: 1;
  }

  .server-name {
    font-weight: 500;
    font-size: 15px;
    margin-bottom: 3px;
    color: var(--b3-theme-on-background, #1a1a1a);
  }

  .server-desc {
    font-size: 12px;
    color: var(--b3-theme-on-surface, #888888);
  }

  /* 输入框样式 */
  .input {
    width: 100%;
    padding: 11px 13px;
    border: 1.5px solid var(--b3-theme-border, #e0e0e0);
    border-radius: 8px;
    background: var(--b3-theme-background, #fafafa);
    color: var(--b3-theme-on-background, #1a1a1a);
    font-size: 14px;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .input::placeholder {
    color: var(--b3-theme-on-surface, #999999);
  }

  .input:focus {
    outline: none;
    border-color: var(--b3-theme-primary, #4a9eff);
    background: var(--b3-theme-surface, #ffffff);
  }

  /* 公益服务器信息样式 */
  .public-server-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: var(--b3-theme-on-background, #333333);
  }

  .info-emoji {
    font-size: 18px;
  }

  /* 打赏区域样式 */
  .donation-section {
    background: linear-gradient(135deg, rgba(255, 107, 107, 0.08) 0%, rgba(255, 142, 83, 0.08) 100%);
    border-radius: 10px;
    padding: 18px;
    margin-bottom: 16px;
    border: 1px solid rgba(255, 107, 107, 0.15);
  }

  .donation-header {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 12px;
    color: var(--b3-theme-on-background, #1a1a1a);
  }

  .donation-content {
    font-size: 14px;
    line-height: 1.6;
    color: var(--b3-theme-on-background, #333333);
  }

  .donation-content p {
    margin-bottom: 12px;
  }

  .donation-btn {
    display: inline-block;
    padding: 9px 18px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ff8f53 100%);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(255, 107, 107, 0.25);
  }

  .donation-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.35);
  }

  /* 操作按钮样式 */
  .actions {
    display: flex;
    justify-content: center;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--b3-theme-border, #e8e8e8);
  }

  .save-btn {
    padding: 11px 40px;
    background: var(--b3-theme-primary, #4a9eff);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(74, 158, 255, 0.3);
    font-family: inherit;
  }

  .save-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(74, 158, 255, 0.4);
  }

  /* 滚动条样式 */
  .scroll-area::-webkit-scrollbar {
    width: 5px;
  }
  .scroll-area::-webkit-scrollbar-thumb {
    background: var(--b3-theme-border, #d0d0d0);
    border-radius: 3px;
  }
  .scroll-area::-webkit-scrollbar-thumb:hover {
    background: var(--b3-theme-on-surface, #b0b0b0);
  }

  /* 深色模式适配 */
  [data-theme-mode="dark"] .donation-section {
    background: linear-gradient(135deg, rgba(255, 107, 107, 0.12) 0%, rgba(255, 142, 83, 0.12) 100%);
    border-color: rgba(255, 107, 107, 0.25);
  }

  [data-theme-mode="dark"] .server-option.active {
    background: rgba(74, 158, 255, 0.15);
  }
</style>
