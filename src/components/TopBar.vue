<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { getTimeLabel, getTimeIcon } from '../utils/gameUtils'

const emit = defineEmits<{
  (e: 'toggle-save'): void
  (e: 'toggle-cards'): void
  (e: 'toggle-history'): void
  (e: 'toggle-theme'): void
  (e: 'reset'): void
}>()

const gameStore = useGameStore()
</script>

<template>
  <header class="top-bar card">
    <div class="game-title">
      <span class="title-icon">💝</span>
      <h1>恋爱物语</h1>
    </div>

    <div class="status-info">
      <div class="status-item day">
        <span class="status-icon">📅</span>
        <span>第 {{ gameStore.day }} 天</span>
      </div>
      <div class="status-item time">
        <span class="status-icon">{{ getTimeIcon(gameStore.timeSlot) }}</span>
        <span>{{ getTimeLabel(gameStore.timeSlot) }}</span>
      </div>
      <div class="status-item actions">
        <span class="status-icon">⚡</span>
        <span>行动力 {{ gameStore.actionsRemaining }}</span>
      </div>
      <div class="status-item resources">
        <span class="status-icon">💰</span>
        <span>{{ gameStore.resources }} 代币</span>
      </div>
    </div>

    <div class="toolbar">
      <button class="toolbar-btn" @click="emit('toggle-cards')" title="卡牌收藏">
        🎴
      </button>
      <button class="toolbar-btn" @click="emit('toggle-history')" title="历史记录">
        📜
      </button>
      <button class="toolbar-btn" @click="emit('toggle-save')" title="存档/读档">
        💾
      </button>
      <button class="toolbar-btn" @click="emit('toggle-theme')" title="切换主题">
        {{ gameStore.darkMode ? '☀️' : '🌙' }}
      </button>
      <button class="toolbar-btn reset" @click="emit('reset')" title="重新开始">
        🔄
      </button>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  gap: 20px;
}

.game-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 28px;
}

.game-title h1 {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.status-info {
  display: flex;
  gap: 20px;
  flex: 1;
  justify-content: center;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
}

.status-icon {
  font-size: 18px;
}

.toolbar {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn:hover {
  background: var(--accent-light);
  transform: scale(1.05);
}

.toolbar-btn.reset:hover {
  background: #fee2e2;
}

@media (max-width: 768px) {
  .top-bar {
    flex-wrap: wrap;
  }
  
  .status-info {
    order: 3;
    width: 100%;
    justify-content: space-around;
    gap: 8px;
  }
  
  .status-item {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .game-title h1 {
    font-size: 18px;
  }
}
</style>
