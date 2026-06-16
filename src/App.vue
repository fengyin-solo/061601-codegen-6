<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useGameStore } from './stores/gameStore'
import { useSaveStore } from './stores/saveStore'
import TopBar from './components/TopBar.vue'
import CharacterPanel from './components/CharacterPanel.vue'
import ActionPanel from './components/ActionPanel.vue'
import LogPanel from './components/LogPanel.vue'
import EventModal from './components/EventModal.vue'
import SaveModal from './components/SaveModal.vue'
import CardCollection from './components/CardCollection.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import GiftModal from './components/GiftModal.vue'

const gameStore = useGameStore()
const saveStore = useSaveStore()

const showSaveModal = ref(false)
const showCards = ref(false)
const showHistory = ref(false)
const showGiftModal = ref(false)

const theme = computed(() => gameStore.darkMode ? 'dark' : 'light')

watch(() => gameStore.day, () => {
  saveStore.autoSave()
})

watch(theme, (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme)
})

onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  
  const hasSave = saveStore.hasAutoSave()
  if (hasSave) {
    if (confirm('检测到自动存档，是否继续游戏？')) {
      saveStore.loadAutoSave()
    } else {
      gameStore.resetGame()
    }
  } else {
    gameStore.resetGame()
  }
})
</script>

<template>
  <div class="game-container">
    <TopBar 
      @toggle-save="showSaveModal = true"
      @toggle-cards="showCards = true"
      @toggle-history="showHistory = true"
      @toggle-theme="gameStore.toggleDarkMode()"
      @reset="gameStore.resetGame()"
    />
    
    <div class="main-content">
      <div class="left-column">
        <CharacterPanel />
        <ActionPanel @open-gift="showGiftModal = true" />
      </div>
      
      <div class="right-column">
        <LogPanel />
      </div>
    </div>

    <EventModal />
    <SaveModal v-if="showSaveModal" @close="showSaveModal = false" />
    <CardCollection v-if="showCards" @close="showCards = false" />
    <HistoryPanel v-if="showHistory" @close="showHistory = false" />
    <GiftModal v-if="showGiftModal" @close="showGiftModal = false" />
  </div>
</template>

<style scoped>
.game-container {
  min-height: 100vh;
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 16px;
  margin-top: 16px;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}
</style>
