<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()

const completedCount = computed(() =>
  gameStore.dailyGoals.filter(g => g.completed).length
)

const totalCount = computed(() => gameStore.dailyGoals.length)

const hasUnclaimedRewards = computed(() =>
  gameStore.dailyGoals.some(g => g.completed && !g.claimed)
)

function getProgressText(goal: any): string {
  if (goal.type === 'affinity') {
    const current = goal.currentValue?.toFixed(1) || '0'
    const target = goal.targetValue || 0
    return `${current} / ${target}`
  }
  return `${goal.currentCount} / ${goal.targetCount}`
}

function getProgressPercent(goal: any): number {
  if (goal.type === 'affinity') {
    const current = goal.currentValue || 0
    const target = goal.targetValue || 1
    return Math.min(100, (current / target) * 100)
  }
  return Math.min(100, (goal.currentCount / goal.targetCount) * 100)
}

function getProgressColor(goal: any): string {
  if (goal.completed) return '#22c55e'
  const percent = getProgressPercent(goal)
  if (percent >= 70) return '#84cc16'
  if (percent >= 30) return '#eab308'
  return '#94a3b8'
}

function claimReward(goalId: string) {
  gameStore.claimGoalReward(goalId)
}

function claimAllRewards() {
  gameStore.claimAllDailyRewards()
}

function selectGoalCharacter(characterId: string | undefined) {
  if (characterId) {
    gameStore.selectCharacter(characterId)
  }
}
</script>

<template>
  <div class="daily-goals card">
    <div class="header">
      <h2 class="panel-title">
        <span class="title-icon">📋</span>
        每日目标
      </h2>
      <div class="progress-summary">
        <span class="progress-text">{{ completedCount }} / {{ totalCount }}</span>
        <button
          v-if="hasUnclaimedRewards"
          class="claim-all-btn"
          @click="claimAllRewards"
        >
          全部领取
        </button>
      </div>
    </div>

    <div class="goal-list">
      <div
        v-for="goal in gameStore.dailyGoals"
        :key="goal.id"
        class="goal-item"
        :class="{
          completed: goal.completed,
          claimed: goal.claimed
        }"
      >
        <div class="goal-header">
          <span class="goal-icon">{{ goal.icon }}</span>
          <div class="goal-info">
            <div class="goal-title">
              {{ goal.title }}
              <span
                v-if="goal.characterName"
                class="character-tag"
                @click="selectGoalCharacter(goal.characterId)"
              >
                {{ goal.characterName }}
              </span>
            </div>
            <div class="goal-desc">{{ goal.description }}</div>
          </div>
          <div class="goal-reward">
            <span class="reward-icon">💰</span>
            <span class="reward-value">{{ goal.reward }}</span>
          </div>
        </div>

        <div class="goal-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{
                width: `${getProgressPercent(goal)}%`,
                backgroundColor: getProgressColor(goal)
              }"
            ></div>
          </div>
          <span class="progress-text">{{ getProgressText(goal) }}</span>
        </div>

        <div class="goal-footer">
          <div class="suggestion">{{ goal.suggestion }}</div>
          <button
            v-if="goal.completed && !goal.claimed"
            class="claim-btn"
            @click="claimReward(goal.id)"
          >
            领取
          </button>
          <span v-else-if="goal.claimed" class="claimed-label">
            ✓ 已领取
          </span>
        </div>
      </div>
    </div>

    <div v-if="gameStore.dailyGoals.length === 0" class="empty-state">
      <span class="empty-icon">📋</span>
      <p>暂无每日目标</p>
    </div>
  </div>
</template>

<style scoped>
.daily-goals {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 22px;
}

.progress-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.claim-all-btn {
  padding: 6px 14px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: white;
  border: none;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.claim-all-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.goal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-item {
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  transition: all 0.3s;
}

.goal-item.completed {
  border-color: #22c55e;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
}

.goal-item.claimed {
  opacity: 0.6;
}

.goal-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.goal-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.goal-info {
  flex: 1;
  min-width: 0;
}

.goal-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.character-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--accent-primary);
  color: white;
  border-radius: 9999px;
  cursor: pointer;
  transition: transform 0.2s;
}

.character-tag:hover {
  transform: scale(1.1);
}

.goal-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.goal-reward {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fef3c7;
  padding: 4px 10px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.reward-icon {
  font-size: 14px;
}

.reward-value {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
}

.goal-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s, background-color 0.3s;
}

.goal-progress .progress-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 50px;
  text-align: right;
}

.goal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.suggestion {
  flex: 1;
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

.claim-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  border: none;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.claim-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.claimed-label {
  font-size: 12px;
  color: #22c55e;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

@media (max-width: 600px) {
  .goal-header {
    flex-wrap: wrap;
  }

  .goal-reward {
    order: 3;
    width: 100%;
    justify-content: center;
  }
}
</style>
