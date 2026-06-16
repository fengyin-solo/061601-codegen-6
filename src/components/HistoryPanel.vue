<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { getTimeLabel } from '../utils/gameUtils'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()

const history = computed(() => [...gameStore.history].reverse())

function rollback(index: number) {
  const realIndex = gameStore.history.length - 1 - index
  if (confirm(`确定要回退到第 ${gameStore.history[realIndex].day} 天吗？之后的进度将丢失。`)) {
    gameStore.rollbackToStep(realIndex)
    emit('close')
  }
}

function getStepSummary(snapshot: any): string {
  const lastLog = snapshot.logs[snapshot.logs.length - 1]
  if (lastLog) {
    return lastLog.message.length > 30 ? lastLog.message.substring(0, 30) + '...' : lastLog.message
  }
  return '历史步骤'
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content history-modal">
        <div class="modal-header">
          <h2>📜 历史记录</h2>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div class="history-hint">
          💡 点击任意历史步骤可回退到该状态
        </div>

        <div class="history-list">
          <div 
            v-for="(snapshot, index) in history" 
            :key="index"
            class="history-item"
            @click="rollback(index)"
          >
            <div class="step-badge">{{ history.length - index }}</div>
            <div class="step-info">
              <span class="step-time">
                第{{ snapshot.day }}天 {{ getTimeLabel(snapshot.timeSlot) }}
              </span>
              <span class="step-summary">{{ getStepSummary(snapshot) }}</span>
            </div>
            <div class="step-meta">
              <span class="step-resources">💰 {{ snapshot.resources }}</span>
              <span class="step-actions">⚡ {{ snapshot.actionsRemaining }}</span>
            </div>
          </div>

          <div v-if="history.length === 0" class="empty-history">
            暂无历史记录
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.history-modal {
  padding: 24px;
  max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--accent-light);
}

.history-hint {
  padding: 10px 14px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 16px;
}

[data-theme='dark'] .history-hint {
  background: #1e3a5f;
  color: #93c5fd;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: var(--accent-light);
  transform: translateX(4px);
}

.step-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.step-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-time {
  font-weight: 500;
  font-size: 14px;
}

.step-summary {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-size: 12px;
  color: var(--text-muted);
}

.empty-history {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  font-size: 14px;
}
</style>
