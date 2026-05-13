<template>
  <div class="chat-panel" contenteditable="false">
    <div class="chat-messages" ref="messagesContainer">
      <template v-for="(msg, i) in messages" :key="i">
        <!-- 用户消息 -->
        <div v-if="msg.role === 'user'" class="msg msg-user">
          <div class="msg-content user-bubble">{{ msg.content }}</div>
        </div>
        <!-- 助手消息 -->
        <div v-else-if="msg.role === 'assistant'" class="msg msg-assistant">
          <!-- 工具调用展示 -->
          <div v-if="msg.toolCalls?.length" class="tool-calls">
            <div v-for="(tc, j) in msg.toolCalls" :key="j" class="tool-call-item">
              <div class="tool-call-header" @click="tc._expanded = !tc._expanded">
                <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <span class="tool-name">{{ tc.name }}</span>
                <span class="tool-args-preview">{{ formatArgs(tc.args) }}</span>
                <svg class="expand-icon" :class="{ expanded: tc._expanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <div v-if="tc._expanded" class="tool-call-detail">
                <div class="tool-detail-row">
                  <span class="tool-detail-label">参数</span>
                  <code>{{ JSON.stringify(tc.args, null, 2) }}</code>
                </div>
                <div v-if="tc.result" class="tool-detail-row">
                  <span class="tool-detail-label">结果</span>
                  <code>{{ tc.result }}</code>
                </div>
              </div>
            </div>
          </div>
          <!-- 助手文本 -->
          <div v-if="msg.html" class="msg-content assistant-bubble" v-html="msg.html"></div>
        </div>
      </template>
      <!-- 正在思考（无工具调用且无文本时） -->
      <div v-if="chatLoading && !currentToolCalls.length && !streamingHtml" class="msg msg-assistant">
        <div class="msg-content assistant-bubble thinking">
          <span>思考中<span class="thinking-dots">...</span></span>
        </div>
      </div>
      <!-- 正在进行的工具调用（尚未绑定到消息） -->
      <div v-if="currentToolCalls.length && chatLoading" class="msg msg-assistant">
        <div class="tool-calls">
          <div v-for="(tc, j) in currentToolCalls" :key="'live-'+j" class="tool-call-item live">
            <div class="tool-call-header">
              <div class="tool-spinner"></div>
              <span class="tool-name">{{ tc.name }}</span>
              <span class="tool-args-preview">{{ formatArgs(tc.args) }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 流式文本（尚未绑定到消息） -->
      <div v-if="streamingHtml && chatLoading" class="msg msg-assistant">
        <div class="msg-content assistant-bubble" v-html="streamingHtml"></div>
      </div>
      <!-- 错误 -->
      <div v-if="chatError" class="chat-error">{{ chatError }}</div>
    </div>
    <div class="chat-input-section">
      <button
        v-if="messages.length > 0"
        class="clear-btn"
        @click="clearMessages"
        :disabled="chatLoading"
        title="清空对话"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
      <textarea
        v-model="chatInput"
        class="chat-input"
        placeholder="输入问题... (Enter 发送, Shift+Enter 换行)"
        @keydown.enter.prevent="handleEnter"
        :disabled="chatLoading"
        rows="2"
      ></textarea>
      <button class="send-btn" @click="sendChat" :disabled="chatLoading || !chatInput.trim()">
        <svg v-if="!chatLoading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
        <div v-else class="send-spinner"></div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, useTemplateRef } from "vue"
import type { ToolCallRecord } from "../openai"
import { 执行优化版ai问答 } from "../openai"

/** 对话消息 */
export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  html?: string
  toolCalls?: (ToolCallRecord & { _expanded?: boolean })[]
}

const emit = defineEmits<{
  /** 消息列表变化时触发，用于外部持久化 */
  update: [messages: ChatMessage[]]
}>()

const messagesContainer = useTemplateRef<HTMLElement>("messagesContainer")

const messages = ref<ChatMessage[]>([])
const chatInput = ref("")
const chatLoading = ref(false)
const chatError = ref("")
/** 当前正在进行的工具调用 */
const currentToolCalls = ref<ToolCallRecord[]>([])
/** 流式输出 HTML */
const streamingHtml = ref("")

const Lute = (globalThis as any).Lute
const lute = Lute.New()
function Md2BlockDOM(md: string) {
  return lute.Md2BlockDOM(md) as string
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function formatArgs(args: Record<string, unknown>): string {
  return Object.values(args).map(v => String(v)).join(', ').slice(0, 60)
}

function handleEnter(e: KeyboardEvent) {
  if (e.shiftKey) return
  if (!chatLoading.value && chatInput.value.trim()) sendChat()
}

/** 构建历史对话 */
function buildHistory() {
  return messages.value
    .filter(m => m.content)
    .map(m => ({ role: m.role, content: m.content }))
}

/** 恢复历史消息（外部持久化后加载） */
function loadMessages(saved: ChatMessage[]) {
  messages.value = saved
}

/** 清空对话 */
function clearMessages() {
  messages.value = []
  chatError.value = ""
  emit('update', [])
}

async function sendChat() {
  const input = chatInput.value.trim()
  if (!input) return

  chatInput.value = ""
  chatError.value = ""
  chatLoading.value = true
  currentToolCalls.value = []
  streamingHtml.value = ""

  messages.value.push({ role: "user", content: input })
  emit('update', messages.value)
  scrollToBottom()

  /** 记录本轮工具调用 */
  const roundToolCalls: ToolCallRecord[] = []

  try {
    const result = await 执行优化版ai问答(input, undefined, (stream) => {
      if (stream.toolCalls.length) {
        currentToolCalls.value = [...stream.toolCalls]
        /** 更新 roundToolCalls */
        for (const tc of stream.toolCalls) {
          if (!roundToolCalls.find(r => r.name === tc.name && JSON.stringify(r.args) === JSON.stringify(tc.args))) {
            roundToolCalls.push({ ...tc })
          }
        }
      }
      if (stream.streamingText) {
        streamingHtml.value = Md2BlockDOM(stream.streamingText)
        currentToolCalls.value = []
      }
      scrollToBottom()
    }, buildHistory())

    /** 添加助手消息 */
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: result.finalAnswer,
      html: Md2BlockDOM(result.finalAnswer),
      toolCalls: roundToolCalls.length > 0
        ? roundToolCalls.map(tc => ({ ...tc, _expanded: false }))
        : undefined,
    }
    messages.value.push(assistantMsg)
    emit('update', messages.value)
  } catch (e: any) {
    chatError.value = e.message ?? String(e)
  } finally {
    chatLoading.value = false
    currentToolCalls.value = []
    streamingHtml.value = ""
    scrollToBottom()
  }
}

defineExpose({ messages, loadMessages, clearMessages })
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.chat-messages {
  flex: 1;
  min-height: 160px;
  max-height: calc(70vh - 180px);
  overflow-y: auto;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

/* 消息 */
.msg {
  display: flex;
  flex-direction: column;
}

.msg-user {
  align-items: flex-end;
}

.msg-assistant {
  align-items: flex-start;
}

.msg-content {
  max-width: 85%;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.user-bubble {
  padding: 8px 14px;
  background: var(--b3-theme-primary, #3573f0);
  color: #fff;
  border-radius: 12px 12px 2px 12px;
}

.assistant-bubble {
  padding: 8px 14px;
  background: var(--b3-theme-background-light, #f5f5f5);
  color: var(--b3-theme-on-background, #333);
  border-radius: 12px 12px 12px 2px;
}

html[data-theme-mode="dark"] .assistant-bubble {
  background: var(--b3-theme-background-light, #2a2a2a);
  color: var(--b3-theme-on-background, #e0e0e0);
}

.assistant-bubble.thinking {
  color: var(--b3-theme-on-background-light, #999);
  font-size: 13px;
  padding: 10px 16px;
}

.thinking-dots {
  animation: dots 1.5s infinite;
}

@keyframes dots {
  0%, 20% { opacity: 0.2; }
  50% { opacity: 1; }
  80%, 100% { opacity: 0.2; }
}

/* 工具调用 */
.tool-calls {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 4px;
  max-width: 85%;
}

.tool-call-item {
  border: 1px solid var(--b3-border-color, #e8e8e8);
  border-radius: 8px;
  overflow: hidden;
  font-size: 12px;
}

html[data-theme-mode="dark"] .tool-call-item {
  border-color: var(--b3-border-color, #444);
}

.tool-call-item.live {
  border-style: dashed;
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  background: var(--b3-theme-background, rgba(0,0,0,0.02));
}

.tool-call-item:not(.live) .tool-call-header:hover {
  background: var(--b3-theme-background-light, #f0f0f0);
}

.tool-icon {
  flex-shrink: 0;
  color: var(--b3-theme-on-background-light, #999);
}

.tool-name {
  font-weight: 600;
  color: var(--b3-theme-primary, #3573f0);
}

.tool-args-preview {
  color: var(--b3-theme-on-background-light, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.expand-icon {
  flex-shrink: 0;
  transition: transform 0.2s;
  color: var(--b3-theme-on-background-light, #999);
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.tool-call-detail {
  padding: 8px 10px;
  border-top: 1px solid var(--b3-border-color, #eee);
  background: var(--b3-theme-background, rgba(0,0,0,0.015));
}

.tool-detail-row {
  margin-bottom: 4px;
}

.tool-detail-row:last-child {
  margin-bottom: 0;
}

.tool-detail-label {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--b3-theme-on-background-light, #888);
  display: block;
  margin-bottom: 2px;
}

.tool-call-detail code {
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--b3-theme-on-background, #555);
}

.tool-spinner {
  width: 12px;
  height: 12px;
  border: 1.5px solid var(--b3-border-color, #ddd);
  border-top-color: var(--b3-theme-primary, #3573f0);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 输入区 */
.chat-input-section {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-shrink: 0;
}

.clear-btn {
  width: 44px;
  height: 44px;
  background: transparent;
  color: var(--b3-theme-on-background-light, #999);
  border: 1px solid var(--b3-border-color, #ddd);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.clear-btn:hover:not(:disabled) {
  color: #dc2626;
  border-color: #dc2626;
}

.clear-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.chat-input {
  flex: 1;
  min-height: 44px;
  max-height: 120px;
  padding: 10px 14px;
  border: 1px solid var(--b3-border-color, #ddd);
  border-radius: 10px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  background: var(--b3-theme-background, #fff);
  color: var(--b3-theme-on-background, #333);
  transition: border-color 0.2s;
}

html[data-theme-mode="dark"] .chat-input {
  background: var(--b3-theme-background, #1e1e1e);
  border-color: var(--b3-border-color, #444);
  color: var(--b3-theme-on-background, #e0e0e0);
}

.chat-input:focus {
  outline: none;
  border-color: var(--b3-theme-primary, #3573f0);
}

.chat-input::placeholder {
  color: var(--b3-theme-on-background-light, #aaa);
}

.send-btn {
  width: 44px;
  height: 44px;
  background: var(--b3-theme-primary, #3573f0);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.2s;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.send-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.chat-error {
  padding: 10px 14px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 13px;
  border: 1px solid #fecaca;
}

html[data-theme-mode="dark"] .chat-error {
  background: #2d1515;
  color: #f87171;
  border-color: #5a2020;
}
</style>
