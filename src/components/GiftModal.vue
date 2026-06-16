<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import gameConfig from '../config/gameConfig'
import { isGiftLiked, isGiftDisliked } from '../utils/gameUtils'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const selectedGiftId = ref<string | null>(null)

const currentCharacterConfig = computed(() => gameStore.currentCharacterConfig)

const canAfford = computed(() => {
  if (!selectedGiftId.value) return false
  const gift = gameConfig.gifts.find(g => g.id === selectedGiftId.value)
  return gift ? gameStore.resources >= gift.price : false
})

function getGiftStatus(giftId: string): string {
  if (!currentCharacterConfig.value) return ''
  if (isGiftLiked(giftId, currentCharacterConfig.value)) return '喜欢'
  if (isGiftDisliked(giftId, currentCharacterConfig.value)) return '讨厌'
  return '普通'
}

function getGiftStatusClass(giftId: string): string {
  if (!currentCharacterConfig.value) return ''
  if (isGiftLiked(giftId, currentCharacterConfig.value)) return 'status-liked'
  if (isGiftDisliked(giftId, currentCharacterConfig.value)) return 'status-disliked'
  return 'status-normal'
}

function sendGift() {
  if (!selectedGiftId.value || !gameStore.selectedCharacterId) return
  gameStore.performAction('gift', gameStore.selectedCharacterId, selectedGiftId.value)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content gift-modal">
        <div class="modal-header">
          <h2>🎁 选择礼物</h2>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div v-if="!currentCharacterConfig" class="no-character">
          请先选择一个角色
        </div>

        <div v-else class="gift-target">
          <span class="target-avatar">{{ currentCharacterConfig.avatar }}</span>
          <span class="target-name">送给 {{ currentCharacterConfig.name }}</span>
        </div>

        <div class="gift-grid">
          <div
            v-for="gift in gameConfig.gifts"
            :key="gift.id"
            class="gift-item"
            :class="{ selected: selectedGiftId === gift.id, disabled: gameStore.resources < gift.price }"
            @click="gameStore.resources >= gift.price && (selectedGiftId = gift.id)"
          >
            <div class="gift-icon">{{ gift.icon }}</div>
            <div class="gift-info">
              <span class="gift-name">{{ gift.name }}</span>
              <span class="gift-desc">{{ gift.description }}</span>
            </div>
            <div class="gift-meta">
              <span class="gift-price">💰 {{ gift.price }}</span>
              <span class="gift-status" :class="getGiftStatusClass(gift.id)">
                {{ getGiftStatus(gift.id) }}
              </span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <span class="current-resources">
            当前代币：{{ gameStore.resources }}
          </span>
          <div class="footer-buttons">
            <button class="btn btn-secondary" @click="emit('close')">取消</button>
            <button 
              class="btn btn-primary" 
              :disabled="!selectedGiftId || !canAfford || gameStore.actionsRemaining <= 0"
              @click="sendGift"
            >
              送出
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gift-modal {
  padding: 24px;
  max-width: 600px;
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

.no-character {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.gift-target {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--accent-light);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.target-avatar {
  font-size: 24px;
}

.target-name {
  font-weight: 500;
}

.gift-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.gift-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.gift-item:hover:not(.disabled) {
  background: var(--accent-light);
}

.gift-item.selected {
  border-color: var(--accent-primary);
  background: var(--accent-light);
}

.gift-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gift-icon {
  font-size: 36px;
  width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.gift-info {
  flex: 1;
  min-width: 0;
}

.gift-name {
  display: block;
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.gift-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.gift-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.gift-price {
  font-weight: 600;
  color: var(--accent-primary);
  font-size: 14px;
}

.gift-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-muted);
}

.gift-status.status-liked {
  background: #dcfce7;
  color: #166534;
}

[data-theme='dark'] .gift-status.status-liked {
  background: #14532d;
  color: #86efac;
}

.gift-status.status-disliked {
  background: #fee2e2;
  color: #991b1b;
}

[data-theme='dark'] .gift-status.status-disliked {
  background: #7f1d1d;
  color: #fca5a5;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.current-resources {
  font-size: 14px;
  color: var(--text-secondary);
}

.footer-buttons {
  display: flex;
  gap: 10px;
}
</style>
