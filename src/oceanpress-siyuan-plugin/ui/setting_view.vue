<template>
  <div class="content">
    <div class="scroll-area">
      <div class="header">
        <div class="title">🔍 OCR 服务配置</div>
        <div class="subtitle">让文字识别变得更简单、更高效</div>
      </div>

      <div class="section">
      <div class="section-title">📡 选择 OCR 服务</div>
      <div class="server-options">
        <div
          class="server-option"
          :class="{ active: selectedServer === 'custom' }"
          @click="selectServer('custom')">
          <div class="server-icon">🏠</div>
          <div class="server-info">
            <div class="server-name">本地服务</div>
            <div class="server-desc">使用您自己的 Umi-OCR 服务</div>
          </div>
        </div>

        <div
          class="server-option"
          :class="{ active: selectedServer === 'public' }"
          @click="selectServer('public')">
          <div class="server-icon">❤️</div>
          <div class="server-info">
            <div class="server-name">崮生公益服务器</div>
            <div class="server-desc">免费的 Umi-OCR 服务</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section" v-if="selectedServer === 'custom'">
      <div class="section-title">🔧 自定义 API 地址</div>
      <input
        type="text"
        class="input"
        placeholder="请输入您的 Umi-OCR API 地址..."
        :value="umiApi"
        @input="handleUmiApiChange" />
    </div>

    <div class="section" v-if="selectedServer === 'public'">
      <div class="public-server-info">
        <div class="info-header">
          <span class="info-icon">🌟</span>
          <span class="info-title">公益服务说明</span>
        </div>
        <div class="info-content">
          <p>🔥 <strong>免费使用</strong>：无需任何费用，即开即用</p>
          <p>🛡️ <strong>隐私保护</strong>：识别完成后立即删除，绝不保留</p>
          <p>🎯 <strong>精准识别</strong>：支持多种语言和格式</p>
        </div>
      </div>
    </div>

    <div class="donation-section">
      <div class="donation-header">
        <span class="heart-icon">💖</span>
        <span class="donation-title">支持公益服务持续运营</span>
      </div>
      <div class="donation-content">
        <p>亲爱的用户，公益服务器的运营需要资金支持。服务器费用、维护成本、带宽费用都需要资金来维持。</p>
        <p>如果您觉得这个服务对您有帮助，欢迎在爱发电上支持我们，让这份爱心能够持续传递下去！</p>
        <div class="donation-actions">
          <a href="https://afdian.com/@llej0" target="_blank" class="donation-btn">
            <span class="btn-icon">❤️</span>
            <span class="btn-text">前往爱发电支持</span>
          </a>
        </div>
      </div>
    </div>

    </div>
    <div class="actions">
      <button class="save-btn" @click="onExit">
        <span class="btn-icon">✅</span>
        <span class="btn-text">保存配置</span>
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
    height: calc(100vh - 40px);
    max-height: 100vh;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 10px;
    width: min(92vw, 640px);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-sizing: border-box;
  }

  .scroll-area {
    overflow-y: auto;
    flex: 1 1 auto;
    padding-right: 6px;
  }

  /* 头部样式 */
  .header {
    text-align: center;
    margin-bottom: 32px;
  }

  .title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 8px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .subtitle {
    font-size: 14px;
    opacity: 0.9;
    font-weight: 300;
  }

  /* 区块样式 */
  .section {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* 服务器选项样式 */
  .server-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .server-option {
    display: flex;
    align-items: center;
    padding: 16px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .server-option:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .server-option.active {
    border-color: #fbbf24;
    background: rgba(251, 191, 36, 0.2);
  }

  .server-icon {
    font-size: 24px;
    margin-right: 16px;
  }

  .server-info {
    flex: 1;
  }

  .server-name {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 4px;
  }

  .server-desc {
    font-size: 12px;
    opacity: 0.8;
  }

  /* 输入框样式 */
  .input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 14px;
    transition: all 0.3s ease;
  }

  .input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .input:focus {
    outline: none;
    border-color: #fbbf24;
    background: rgba(255, 255, 255, 0.2);
  }

  /* 公益服务器信息样式 */
  .public-server-info {
    background: rgba(251, 191, 36, 0.1);
    border-radius: 8px;
    padding: 16px;
    border: 1px solid rgba(251, 191, 36, 0.3);
  }

  .info-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-weight: 600;
    color: #fbbf24;
  }

  .info-content {
    font-size: 14px;
    line-height: 1.6;
  }

  .info-content p {
    margin-bottom: 8px;
  }

  .server-url {
    margin-top: 12px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    font-size: 12px;
  }

  .server-url code {
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 2px;
    font-family: 'Courier New', monospace;
  }

  /* 打赏区域样式 */
  .donation-section {
    background: rgba(239, 68, 68, 0.1);
    border-radius: 8px;
    padding: 20px;
    border: 1px solid rgba(239, 68, 68, 0.3);
    margin-bottom: 20px;
  }

  .donation-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-weight: 600;
    color: #fca5a5;
  }

  .donation-content {
    font-size: 14px;
    line-height: 1.6;
  }

  .donation-content p {
    margin-bottom: 12px;
  }

  .donation-actions {
    margin-top: 16px;
    text-align: center;
  }

  .donation-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(45deg, #ef4444, #dc2626);
    color: white;
    text-decoration: none;
    border-radius: 25px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
  }

  .donation-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
  }

  /* 操作按钮样式 */
  .actions {
    display: flex;
    justify-content: center;
    margin-top: 24px;
  }

  .save-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 32px;
    background: linear-gradient(45deg, #10b981, #059669);
    color: white;
    border: none;
    border-radius: 25px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
  }

  .save-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  }

  .btn-icon {
    font-size: 16px;
  }

  .btn-text {
    font-size: 14px;
  }

  /* 响应式设计 */
  @media (max-width: 520px) {
    .content {
      height: calc(100vh - 20px);
      padding: 8px;
      width: min(96vw, 520px);
    }
    .title { font-size: 16px; }
    .section { padding: 10px; }
  }

  /* 滚动条样式 */
  .scroll-area::-webkit-scrollbar {
    width: 6px;
  }
  .scroll-area::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.2);
    border-radius: 3px;
  }
  .scroll-area::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.3);
  }
</style>
