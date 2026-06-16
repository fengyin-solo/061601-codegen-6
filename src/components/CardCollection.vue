<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import gameConfig from '../config/gameConfig'
import { getRarityColor, getRarityLabel } from '../utils/gameUtils'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const selectedCharacterId = ref<string | null>(null)

const characters = computed(() => 
  gameConfig.characters.filter(c => !c.hidden || gameStore.collectedCards.some(cardId => {
    const card = gameConfig.cards.find(cc => cc.id === cardId)
    return card?.characterId === c.id
  }))
)

const filteredCards = computed(() => {
  if (selectedCharacterId.value) {
    return gameConfig.cards.filter(c => c.characterId === selectedCharacterId.value)
  }
  return gameConfig.cards
})

const totalCards = computed(() => filteredCards.value.length)
const collectedCount = computed(() => 
  filteredCards.value.filter(c => gameStore.collectedCards.includes(c.id)).length
)

function isCollected(cardId: string): boolean {
  return gameStore.collectedCards.includes(cardId)
}

function getCharacterName(characterId: string): string {
  const char = gameConfig.characters.find(c => c.id === characterId)
  return char?.name || characterId
}

function getCharacterAvatar(characterId: string): string {
  const char = gameConfig.characters.find(c => c.id === characterId)
  return char?.avatar || '❓'
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content cards-modal">
        <div class="modal-header">
          <h2>🎴 卡牌收藏</h2>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div class="collection-stats">
          <span class="stats-text">
            已收集 <strong>{{ collectedCount }}</strong> / {{ totalCards }} 张
          </span>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${(collectedCount / totalCards) * 100}%`, background: 'var(--accent-primary)' }"
            ></div>
          </div>
        </div>

        <div class="character-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: selectedCharacterId === null }"
            @click="selectedCharacterId = null"
          >
            全部
          </button>
          <button 
            v-for="char in characters" 
            :key="char.id"
            class="tab-btn"
            :class="{ active: selectedCharacterId === char.id }"
            @click="selectedCharacterId = char.id"
          >
            {{ char.avatar }} {{ char.name }}
          </button>
        </div>

        <div class="cards-grid">
          <div
            v-for="card in filteredCards"
            :key="card.id"
            class="card-item"
            :class="{ collected: isCollected(card.id), locked: !isCollected(card.id) }"
          >
            <div 
              class="card-image"
              :style="{ borderColor: getRarityColor(card.rarity) }"
            >
              <span v-if="isCollected(card.id)" class="card-icon">{{ card.image }}</span>
              <span v-else class="card-locked">🔒</span>
            </div>
            <div class="card-info">
              <span class="card-name">{{ isCollected(card.id) ? card.name : '???' }}</span>
              <span 
                class="card-rarity badge" 
                :class="`badge-${card.rarity}`"
              >
                {{ getRarityLabel(card.rarity) }}
              </span>
            </div>
            <p v-if="isCollected(card.id)" class="card-desc">{{ card.description }}</p>
            <p v-else class="card-desc locked">未解锁</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cards-modal {
  padding: 24px;
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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

.collection-stats {
  margin-bottom: 16px;
}

.stats-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: block;
}

.stats-text strong {
  color: var(--accent-primary);
  font-size: 18px;
}

.character-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.tab-btn {
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--accent-light);
}

.tab-btn.active {
  background: var(--accent-primary);
  color: white;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 14px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.card-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  text-align: center;
  transition: all 0.2s;
}

.card-item.collected {
  background: var(--accent-light);
}

.card-item.locked {
  opacity: 0.6;
}

.card-image {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--border-color);
  font-size: 36px;
}

.card-locked {
  font-size: 28px;
  opacity: 0.5;
}

.card-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.card-name {
  font-weight: 600;
  font-size: 13px;
}

.card-rarity {
  font-size: 10px;
}

.card-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.card-desc.locked {
  color: var(--text-muted);
  font-style: italic;
}
</style>
