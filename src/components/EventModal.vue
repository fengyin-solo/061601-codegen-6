<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import gameConfig from '../config/gameConfig'

const gameStore = useGameStore()

const event = computed(() => gameStore.currentEvent)

const characterConfig = computed(() => {
  if (!event.value?.characterId) return null
  return gameConfig.characters.find(c => c.id === event.value!.characterId)
})

function handleChoice(choiceId: string) {
  const choice = event.value?.choices.find(c => c.id === choiceId)
  if (choice) {
    gameStore.handleEventChoice(choice)
  }
}

function formatEffect(effect: any): string {
  let result = ''
  if (effect.affinityChange !== undefined) {
    const char = gameConfig.characters.find(c => c.id === effect.characterId)
    const name = char?.name || effect.characterId
    const sign = effect.affinityChange > 0 ? '+' : ''
    result += `${name} 好感 ${sign}${effect.affinityChange}`
  }
  if (effect.moodChange !== undefined) {
    if (result) result += '，'
    const sign = effect.moodChange > 0 ? '+' : ''
    result += `心情 ${sign}${effect.moodChange}`
  }
  return result
}
</script>

<template>
  <Teleport to="body">
    <div v-if="gameStore.showEventModal && event" class="modal-overlay" @click.self="">
      <div class="modal-content event-modal">
        <div class="event-header">
          <div v-if="characterConfig" class="event-character">
            <span class="char-avatar">{{ characterConfig.avatar }}</span>
            <span class="char-name">{{ characterConfig.name }}</span>
          </div>
          <span class="event-tag">剧情事件</span>
        </div>

        <h2 class="event-title">{{ event.title }}</h2>
        
        <p class="event-description">{{ event.description }}</p>

        <div class="event-choices">
          <button
            v-for="choice in event.choices"
            :key="choice.id"
            class="choice-btn"
            @click="handleChoice(choice.id)"
          >
            <span class="choice-text">{{ choice.text }}</span>
            <div class="choice-effects">
              <span 
                v-for="(effect, idx) in choice.effects" 
                :key="idx"
                class="effect-tag"
                :class="{ positive: effect.affinityChange > 0 || effect.moodChange > 0, negative: effect.affinityChange < 0 || effect.moodChange < 0 }"
              >
                {{ formatEffect(effect) }}
              </span>
              <span v-if="choice.resourceChange" class="effect-tag" :class="{ positive: choice.resourceChange > 0, negative: choice.resourceChange < 0 }">
                代币 {{ choice.resourceChange > 0 ? '+' : '' }}{{ choice.resourceChange }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.event-modal {
  padding: 32px;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.event-character {
  display: flex;
  align-items: center;
  gap: 10px;
}

.char-avatar {
  width: 40px;
  height: 40px;
  background: var(--bg-tertiary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.char-name {
  font-weight: 600;
  font-size: 15px;
}

.event-tag {
  font-size: 12px;
  padding: 4px 12px;
  background: var(--accent-primary);
  color: white;
  border-radius: 9999px;
}

.event-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.event-description {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-secondary);
  margin-bottom: 28px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.event-choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.choice-btn {
  width: 100%;
  padding: 16px 20px;
  text-align: left;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.choice-btn:hover {
  border-color: var(--accent-primary);
  background: var(--accent-light);
  transform: translateX(4px);
}

.choice-text {
  display: block;
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.choice-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.effect-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.effect-tag.positive {
  background: #dcfce7;
  color: #166534;
}

[data-theme='dark'] .effect-tag.positive {
  background: #14532d;
  color: #86efac;
}

.effect-tag.negative {
  background: #fee2e2;
  color: #991b1b;
}

[data-theme='dark'] .effect-tag.negative {
  background: #7f1d1d;
  color: #fca5a5;
}
</style>
