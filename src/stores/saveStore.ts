import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './gameStore'

export interface SaveSlot {
  id: number
  name: string
  day: number
  time: string
  timestamp: number
  data: string
}

const STORAGE_KEY = 'love_story_game_saves'
const SETTINGS_KEY = 'love_story_game_settings'
const AUTOSAVE_KEY = 'love_story_game_autosave'

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key)
    if (data) {
      return JSON.parse(data) as T
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e)
  }
  return defaultValue
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

export const useSaveStore = defineStore('save', () => {
  const saveSlots = ref<SaveSlot[]>(loadFromStorage(STORAGE_KEY, []))
  const autoSaveEnabled = ref(loadFromStorage(SETTINGS_KEY, { autoSave: true }).autoSave)

  const gameStore = useGameStore()

  const sortedSaves = computed(() =>
    [...saveSlots.value].sort((a, b) => b.timestamp - a.timestamp)
  )

  function serializeGameState(): string {
    const state = {
      day: gameStore.day,
      timeSlot: gameStore.timeSlot,
      actionsRemaining: gameStore.actionsRemaining,
      resources: gameStore.resources,
      characters: gameStore.characters,
      selectedCharacterId: gameStore.selectedCharacterId,
      flags: gameStore.flags,
      triggeredEvents: gameStore.triggeredEvents,
      collectedCards: gameStore.collectedCards,
      logs: gameStore.logs,
      history: gameStore.history,
      darkMode: gameStore.darkMode
    }
    return JSON.stringify(state)
  }

  function deserializeGameState(data: string): boolean {
    try {
      const state = JSON.parse(data)
      gameStore.day = state.day
      gameStore.timeSlot = state.timeSlot
      gameStore.actionsRemaining = state.actionsRemaining
      gameStore.resources = state.resources
      gameStore.characters = state.characters
      gameStore.selectedCharacterId = state.selectedCharacterId
      gameStore.flags = state.flags
      gameStore.triggeredEvents = state.triggeredEvents
      gameStore.collectedCards = state.collectedCards
      gameStore.logs = state.logs
      gameStore.history = state.history
      gameStore.darkMode = state.darkMode
      return true
    } catch (e) {
      console.error('Failed to deserialize game state:', e)
      return false
    }
  }

  function saveToSlot(slotId: number, slotName?: string) {
    const existingIndex = saveSlots.value.findIndex(s => s.id === slotId)
    const data = serializeGameState()
    const charCount = gameStore.unlockedCharacters.length

    const slot: SaveSlot = {
      id: slotId,
      name: slotName || `存档 ${slotId}`,
      day: gameStore.day,
      time: `第${gameStore.day}天 - ${gameStore.timeSlot}`,
      timestamp: Date.now(),
      data
    }

    if (existingIndex >= 0) {
      saveSlots.value[existingIndex] = slot
    } else {
      saveSlots.value.push(slot)
    }

    saveToStorage(STORAGE_KEY, saveSlots.value)
    gameStore.addLog('system', `💾 已保存到存档 ${slotId}`)
  }

  function loadFromSlot(slotId: number): boolean {
    const slot = saveSlots.value.find(s => s.id === slotId)
    if (!slot) return false

    const success = deserializeGameState(slot.data)
    if (success) {
      gameStore.addLog('system', `📂 已加载存档 ${slotId}`)
      gameStore.checkAndTriggerEvent()
    }
    return success
  }

  function deleteSlot(slotId: number) {
    const index = saveSlots.value.findIndex(s => s.id === slotId)
    if (index >= 0) {
      saveSlots.value.splice(index, 1)
      saveToStorage(STORAGE_KEY, saveSlots.value)
    }
  }

  function autoSave() {
    if (!autoSaveEnabled.value) return
    const data = serializeGameState()
    saveToStorage(AUTOSAVE_KEY, {
      data,
      timestamp: Date.now(),
      day: gameStore.day,
      time: gameStore.timeSlot
    })
  }

  function loadAutoSave(): boolean {
    try {
      const data = localStorage.getItem(AUTOSAVE_KEY)
      if (!data) return false
      const save = JSON.parse(data)
      return deserializeGameState(save.data)
    } catch (e) {
      console.error('Failed to load autosave:', e)
      return false
    }
  }

  function hasAutoSave(): boolean {
    return localStorage.getItem(AUTOSAVE_KEY) !== null
  }

  function toggleAutoSave(enabled: boolean) {
    autoSaveEnabled.value = enabled
    saveToStorage(SETTINGS_KEY, { autoSave: enabled })
  }

  function getAvailableSlotId(): number {
    const usedIds = saveSlots.value.map(s => s.id)
    let id = 1
    while (usedIds.includes(id)) {
      id++
    }
    return id
  }

  return {
    saveSlots,
    sortedSaves,
    autoSaveEnabled,
    saveToSlot,
    loadFromSlot,
    deleteSlot,
    autoSave,
    loadAutoSave,
    hasAutoSave,
    toggleAutoSave,
    getAvailableSlotId
  }
})
