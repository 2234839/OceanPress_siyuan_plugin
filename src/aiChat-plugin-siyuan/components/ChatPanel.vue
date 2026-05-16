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
import { consumeEach } from "micro-agent"
import type { ChatEvent } from "micro-agent"
import { getSiyuanAgent, destroySiyuanAgent } from "../agent"

/** 对话消息 */
export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  html?: string
  toolCalls?: (ToolCallRecord & { _expanded?: boolean })[]
}

/** 工具调用记录 */
export interface ToolCallRecord {
  name: string
  args: Record<string, unknown>
  result?: string
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

/** 恢复历史消息（外部持久化后加载） */
function loadMessages(saved: ChatMessage[]) {
  messages.value = saved
}

/** 清空对话 */
function clearMessages() {
  messages.value = []
  chatError.value = ""
  /** 清空 agent 上下文 */
  destroySiyuanAgent()
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
  let fullText = ""

  const agent = getSiyuanAgent()

  try {
    await consumeEach(agent.chat(input), (event: ChatEvent) => {
      switch (event.type) {
        case 'text':
          fullText += event.content
          streamingHtml.value = Md2BlockDOM(fullText)
          currentToolCalls.value = []
          scrollToBottom()
          break

        case 'tool_call': {
          let args: Record<string, unknown> = {}
          try { args = JSON.parse(event.args) } catch { /* ignore */ }
          const record: ToolCallRecord = { name: event.name, args }
          roundToolCalls.push(record)
          currentToolCalls.value = [...roundToolCalls]
          scrollToBottom()
          break
        }

        case 'tool_result': {
          /** 更新最后一个匹配工具的结果 */
          const matching = roundToolCalls.find(tc =>
            tc.name === event.name && !tc.result
          )
          if (matching) {
            matching.result = event.result.length > 200
              ? event.result.slice(0, 200) + '...'
              : event.result
          }
          currentToolCalls.value = [...roundToolCalls]
          scrollToBottom()
          break
        }
      }
    })

    /** 添加助手消息 */
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: fullText,
      html: Md2BlockDOM(fullText),
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
  max-height: calc(70vh - 140px);
  overflow-y: auto;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

/* 消息 — 不用气泡，用简单的区分 */
.msg {
  padding: 8px 0;
  border-bottom: 1px solid var(--b3-border-color, rgba(0,0,0,0.06));
}

.msg:last-child {
  border-bottom: none;
}

.msg-content {
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.msg-user .msg-content {
  color: var(--b3-theme-on-background, #333);
}

.msg-assistant .msg-content {
  color: var(--b3-theme-on-background, #333);
}

html[data-theme-mode="dark"] .msg-content {
  color: var(--b3-theme-on-background, #e0e0e0);
}

.assistant-bubble.thinking {
  color: var(--b3-theme-on-background-light, #999);
  font-size: 13px;
}

.thinking-dots {
  animation: dots 1.5s infinite;
}

@keyframes dots {
  0%, 20% { opacity: 0.2; }
  50% { opacity: 1; }
  80%, 100% { opacity: 0.2; }
}

/* 工具调用 — 简洁内联 */
.tool-calls {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--b3-theme-on-background-light, #999);
}

.tool-call-item {
  border-left: 2px solid var(--b3-theme-background-light, #ddd);
  padding: 2px 0 2px 8px;
}

html[data-theme-mode="dark"] .tool-call-item {
  border-left-color: var(--b3-theme-background-light, #444);
}

.tool-call-item.live {
  border-left-style: dashed;
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.tool-call-item:not(.live) .tool-call-header:hover {
  color: var(--b3-theme-on-background, #333);
}

.tool-name {
  font-weight: 500;
  color: var(--b3-theme-on-background-light, #666);
}

html[data-theme-mode="dark"] .tool-name {
  color: var(--b3-theme-on-background-light, #aaa);
}

.tool-args-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.expand-icon {
  flex-shrink: 0;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.tool-call-detail {
  padding: 4px 0 0 0;
  color: var(--b3-theme-on-background, #555);
}

html[data-theme-mode="dark"] .tool-call-detail {
  color: var(--b3-theme-on-background, #ccc);
}

.tool-detail-row {
  margin-bottom: 2px;
}

.tool-detail-row:last-child {
  margin-bottom: 0;
}

.tool-detail-label {
  font-size: 11px;
  color: var(--b3-theme-on-background-light, #888);
  margin-bottom: 1px;
}

.tool-call-detail code {
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}

.tool-spinner {
  width: 10px;
  height: 10px;
  border: 1px solid var(--b3-border-color, #ddd);
  border-top-color: var(--b3-theme-on-background-light, #999);
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
  gap: 6px;
  align-items: flex-end;
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid var(--b3-border-color, rgba(0,0,0,0.06));
}

.clear-btn {
  width: 28px;
  height: 28px;
  background: transparent;
  color: var(--b3-theme-on-background-light, #999);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.clear-btn:hover:not(:disabled) {
  opacity: 1;
  color: #dc2626;
}

.clear-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.chat-input {
  flex: 1;
  min-height: 28px;
  max-height: 100px;
  padding: 4px 6px;
  border: 1px solid var(--b3-border-color, #ddd);
  border-radius: 2px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  background: var(--b3-theme-background, #fff);
  color: var(--b3-theme-on-background, #333);
  transition: border-color 0.15s;
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
  width: 28px;
  height: 28px;
  background: transparent;
  color: var(--b3-theme-on-background-light, #999);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.15s;
}

.send-btn:hover:not(:disabled) {
  color: var(--b3-theme-primary, #3573f0);
}

.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.send-spinner {
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--b3-border-color, #ddd);
  border-top-color: var(--b3-theme-on-background-light, #999);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.chat-error {
  padding: 6px 8px;
  color: #dc2626;
  font-size: 13px;
}

html[data-theme-mode="dark"] .chat-error {
  color: #f87171;
}
</style>
