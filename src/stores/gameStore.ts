import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TimeOfDay, ActionType, GameEventConfig, EventChoice } from '../types/game'
import gameConfig from '../config/gameConfig'
import {
  clamp,
  randomInt,
  calculateChatAffinity,
  calculateGiftAffinity,
  isGiftLiked,
  isGiftDisliked,
  getTimeLabel,
  getNextTimeSlot,
  getMoodLabel
} from '../utils/gameUtils'

export interface CharacterState {
  id: string
  affinity: number
  mood: number
  unlocked: boolean
}

export interface LogEntry {
  id: number
  day: number
  time: TimeOfDay
  type: 'action' | 'event' | 'system' | 'story'
  message: string
  characterId?: string
  timestamp: number
}

export interface HistorySnapshot {
  day: number
  timeSlot: TimeOfDay
  actionsRemaining: number
  resources: number
  characters: CharacterState[]
  flags: string[]
  triggeredEvents: string[]
  collectedCards: string[]
  logs: LogEntry[]
}

export const useGameStore = defineStore('game', () => {
  const day = ref(1)
  const timeSlot = ref<TimeOfDay>('morning')
  const actionsRemaining = ref(gameConfig.maxActionsPerDay)
  const resources = ref(gameConfig.initialResources)
  const selectedCharacterId = ref<string | null>(null)
  const currentEvent = ref<GameEventConfig | null>(null)
  const showEventModal = ref(false)
  const darkMode = ref(false)

  const characters = ref<CharacterState[]>(
    gameConfig.characters.map(c => ({
      id: c.id,
      affinity: c.baseAffinity,
      mood: c.baseMood,
      unlocked: c.unlocked && !c.hidden
    }))
  )

  const flags = ref<string[]>([])
  const triggeredEvents = ref<string[]>([])
  const collectedCards = ref<string[]>([])
  const logs = ref<LogEntry[]>([])
  const history = ref<HistorySnapshot[]>([])
  let logIdCounter = 0

  const unlockedCharacters = computed(() =>
    characters.value.filter(c => c.unlocked)
  )

  const currentCharacter = computed(() =>
    characters.value.find(c => c.id === selectedCharacterId.value) || null
  )

  const currentCharacterConfig = computed(() =>
    gameConfig.characters.find(c => c.id === selectedCharacterId.value) || null
  )

  function addLog(type: LogEntry['type'], message: string, characterId?: string) {
    logs.value.push({
      id: ++logIdCounter,
      day: day.value,
      time: timeSlot.value,
      type,
      message,
      characterId,
      timestamp: Date.now()
    })
  }

  function saveHistory() {
    history.value.push({
      day: day.value,
      timeSlot: timeSlot.value,
      actionsRemaining: actionsRemaining.value,
      resources: resources.value,
      characters: JSON.parse(JSON.stringify(characters.value)),
      flags: [...flags.value],
      triggeredEvents: [...triggeredEvents.value],
      collectedCards: [...collectedCards.value],
      logs: JSON.parse(JSON.stringify(logs.value))
    })
    if (history.value.length > 100) {
      history.value.shift()
    }
  }

  function rollbackToStep(stepIndex: number) {
    if (stepIndex < 0 || stepIndex >= history.value.length) return
    const snapshot = history.value[stepIndex]
    day.value = snapshot.day
    timeSlot.value = snapshot.timeSlot
    actionsRemaining.value = snapshot.actionsRemaining
    resources.value = snapshot.resources
    characters.value = JSON.parse(JSON.stringify(snapshot.characters))
    flags.value = [...snapshot.flags]
    triggeredEvents.value = [...snapshot.triggeredEvents]
    collectedCards.value = [...snapshot.collectedCards]
    logs.value = JSON.parse(JSON.stringify(snapshot.logs))
    history.value = history.value.slice(0, stepIndex)
    addLog('system', `回退到第 ${snapshot.day} 天 ${getTimeLabel(snapshot.timeSlot)}`)
  }

  function getCharacterState(id: string): CharacterState | undefined {
    return characters.value.find(c => c.id === id)
  }

  function updateCharacterAffinity(characterId: string, change: number) {
    const char = getCharacterState(characterId)
    if (!char || !char.unlocked) return
    const oldAffinity = char.affinity
    char.affinity = clamp(
      char.affinity + change,
      gameConfig.minAffinity,
      gameConfig.maxAffinity
    )
    if (char.affinity >= 40 && oldAffinity < 40) {
      checkCardUnlock(characterId, 40)
    }
    if (char.affinity >= 70 && oldAffinity < 70) {
      checkCardUnlock(characterId, 70)
    }
    if (char.affinity >= 100 && oldAffinity < 100) {
      checkCardUnlock(characterId, 100)
    }
  }

  function checkCardUnlock(characterId: string, threshold: number) {
    const character = gameConfig.characters.find(c => c.id === characterId)
    if (!character) return
    const cardKey = `${characterId}_affinity_${threshold}`
    const card = gameConfig.cards.find(c => c.unlockCondition === cardKey)
    if (card && !collectedCards.value.includes(card.id)) {
      collectedCards.value.push(card.id)
      addLog('system', `🎉 获得新卡牌：${card.name}`, characterId)
    }
  }

  function updateCharacterMood(characterId: string, change: number) {
    const char = getCharacterState(characterId)
    if (!char || !char.unlocked) return
    char.mood = clamp(char.mood + change, gameConfig.minMood, gameConfig.maxMood)
  }

  function advanceTime() {
    const nextSlot = getNextTimeSlot(timeSlot.value, gameConfig.timeSlots)
    if (nextSlot === gameConfig.timeSlots[0]) {
      nextDay()
    } else {
      timeSlot.value = nextSlot
    }
    checkAndTriggerEvent()
  }

  function nextDay() {
    day.value++
    timeSlot.value = gameConfig.timeSlots[0]
    actionsRemaining.value = gameConfig.maxActionsPerDay

    characters.value.forEach(char => {
      if (char.unlocked) {
        char.mood = clamp(
          char.mood - gameConfig.moodDecayPerDay,
          gameConfig.minMood,
          gameConfig.maxMood
        )
        char.affinity = clamp(
          char.affinity - gameConfig.affinityDecayPerDay,
          gameConfig.minAffinity,
          gameConfig.maxAffinity
        )
      }
    })

    addLog('system', `🌅 第 ${day.value} 天开始了`)
  }

  function performAction(actionType: ActionType, targetId?: string, giftId?: string) {
    if (actionsRemaining.value <= 0) {
      addLog('system', '⚠️ 今天的行动次数已用完')
      return false
    }

    const actionConfig = gameConfig.actions.find(a => a.type === actionType)
    if (!actionConfig) return false

    if (actionsRemaining.value < actionConfig.energyCost) {
      addLog('system', '⚠️ 行动点数不足')
      return false
    }

    saveHistory()
    actionsRemaining.value -= actionConfig.energyCost

    switch (actionType) {
      case 'chat':
        return performChat(targetId!)
      case 'gift':
        return performGift(targetId!, giftId!)
      case 'work':
        return performWork()
      default:
        return false
    }
  }

  function performChat(characterId: string): boolean {
    const charState = getCharacterState(characterId)
    const charConfig = gameConfig.characters.find(c => c.id === characterId)
    if (!charState || !charConfig || !charState.unlocked) return false

    const topic = charConfig.chatTopics[
      randomInt(0, charConfig.chatTopics.length - 1)
    ]
    const affinityChange = calculateChatAffinity(
      topic.topic,
      charConfig,
      charState.mood,
      timeSlot.value
    )

    updateCharacterAffinity(characterId, affinityChange)
    updateCharacterMood(characterId, affinityChange > 0 ? 5 : -3)

    const moodBefore = charState.mood
    const characterName = charConfig.name

    let message = `和 ${characterName} 聊起了「${topic.topic}」`
    if (affinityChange > 0) {
      message += `，ta似乎很开心！（好感 +${affinityChange}）`
    } else if (affinityChange < 0) {
      message += `，ta好像不太感兴趣...（好感 ${affinityChange}）`
    } else {
      message += '，气氛平平。'
    }

    addLog('action', message, characterId)
    advanceTime()
    return true
  }

  function performGift(characterId: string, giftId: string): boolean {
    const charState = getCharacterState(characterId)
    const charConfig = gameConfig.characters.find(c => c.id === characterId)
    const giftConfig = gameConfig.gifts.find(g => g.id === giftId)
    if (!charState || !charConfig || !giftConfig || !charState.unlocked) return false
    if (resources.value < giftConfig.price) {
      addLog('system', '💰 代币不足！')
      return false
    }

    resources.value -= giftConfig.price

    const affinityChange = calculateGiftAffinity(
      giftId,
      charConfig,
      giftConfig.price,
      charState.mood
    )

    updateCharacterAffinity(characterId, affinityChange)
    updateCharacterMood(
      characterId,
      isGiftLiked(giftId, charConfig) ? 15 : isGiftDisliked(giftId, charConfig) ? -10 : 5
    )

    const characterName = charConfig.name
    let message = `送给 ${characterName} 一份「${giftConfig.name}」`

    if (isGiftLiked(giftId, charConfig)) {
      message += `，ta非常喜欢！（好感 +${affinityChange}）`
    } else if (isGiftDisliked(giftId, charConfig)) {
      message += `，ta好像不太喜欢...（好感 ${affinityChange}）`
    } else {
      message += `，ta收下了。（好感 +${affinityChange}）`
    }

    addLog('action', message, characterId)
    advanceTime()
    return true
  }

  function performWork(): boolean {
    const { min, max } = gameConfig.workRewards
    const earned = randomInt(min, max)
    resources.value += earned

    characters.value.forEach(char => {
      if (char.unlocked) {
        updateCharacterMood(char.id, -2)
      }
    })

    addLog('action', `💼 打工赚了 ${earned} 代币（角色们的心情略有下降）`)
    advanceTime()
    return true
  }

  function checkAndTriggerEvent() {
    if (currentEvent.value) return

    const availableEvents = gameConfig.events.filter(event => {
      if (event.once && triggeredEvents.value.includes(event.id)) return false

      const cond = event.triggerCondition

      if (cond.minDay !== undefined && day.value < cond.minDay) return false
      if (cond.maxDay !== undefined && day.value > cond.maxDay) return false
      if (cond.timeOfDay !== undefined && timeSlot.value !== cond.timeOfDay) return false

      if (cond.characterId) {
        const charState = getCharacterState(cond.characterId)
        if (!charState || !charState.unlocked) return false
        if (cond.minAffinity !== undefined && charState.affinity < cond.minAffinity) return false
        if (cond.maxAffinity !== undefined && charState.affinity > cond.maxAffinity) return false
      }

      if (cond.requiredFlags) {
        if (!cond.requiredFlags.every(f => flags.value.includes(f))) return false
      }

      return true
    })

    if (availableEvents.length > 0) {
      availableEvents.sort((a, b) => b.priority - a.priority)
      const topEvent = availableEvents[0]
      triggerEvent(topEvent)
    }
  }

  function triggerEvent(event: GameEventConfig) {
    currentEvent.value = event
    showEventModal.value = true
    triggeredEvents.value.push(event.id)
    addLog('event', `📖 触发事件：${event.title}`, event.characterId)
  }

  function handleEventChoice(choice: EventChoice) {
    saveHistory()

    choice.effects.forEach(effect => {
      if (effect.affinityChange !== undefined) {
        updateCharacterAffinity(effect.characterId, effect.affinityChange)
      }
      if (effect.moodChange !== undefined) {
        updateCharacterMood(effect.characterId, effect.moodChange)
      }
    })

    if (choice.resourceChange !== undefined) {
      resources.value = Math.max(0, resources.value + choice.resourceChange)
    }

    if (choice.unlockCharacterId) {
      const char = characters.value.find(c => c.id === choice.unlockCharacterId)
      if (char) {
        char.unlocked = true
        const charConfig = gameConfig.characters.find(c => c.id === choice.unlockCharacterId)
        addLog('system', `✨ 解锁新角色：${charConfig?.name || choice.unlockCharacterId}`)
      }
    }

    if (choice.addCardId) {
      if (!collectedCards.value.includes(choice.addCardId)) {
        collectedCards.value.push(choice.addCardId)
        const card = gameConfig.cards.find(c => c.id === choice.addCardId)
        addLog('system', `🎴 获得卡牌：${card?.name || choice.addCardId}`)
      }
    }

    addLog('story', `选择了：${choice.text}`)

    currentEvent.value = null
    showEventModal.value = false

    if (choice.nextEventId) {
      const nextEvent = gameConfig.events.find(e => e.id === choice.nextEventId)
      if (nextEvent) {
        setTimeout(() => triggerEvent(nextEvent), 300)
      }
    }
  }

  function selectCharacter(id: string) {
    const char = characters.value.find(c => c.id === id)
    if (char && char.unlocked) {
      selectedCharacterId.value = id
    }
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
  }

  function resetGame() {
    day.value = 1
    timeSlot.value = 'morning'
    actionsRemaining.value = gameConfig.maxActionsPerDay
    resources.value = gameConfig.initialResources
    selectedCharacterId.value = null
    currentEvent.value = null
    showEventModal.value = false

    characters.value = gameConfig.characters.map(c => ({
      id: c.id,
      affinity: c.baseAffinity,
      mood: c.baseMood,
      unlocked: c.unlocked && !c.hidden
    }))

    flags.value = []
    triggeredEvents.value = []
    collectedCards.value = []
    logs.value = []
    history.value = []
    logIdCounter = 0

    addLog('system', '🎮 游戏开始！欢迎来到恋爱物语')
    checkAndTriggerEvent()
  }

  function initGame() {
    if (logs.value.length === 0) {
      addLog('system', '🎮 游戏开始！欢迎来到恋爱物语')
    }
    checkAndTriggerEvent()
  }

  return {
    day,
    timeSlot,
    actionsRemaining,
    resources,
    characters,
    selectedCharacterId,
    currentCharacter,
    currentCharacterConfig,
    unlockedCharacters,
    flags,
    triggeredEvents,
    collectedCards,
    logs,
    history,
    currentEvent,
    showEventModal,
    darkMode,
    addLog,
    saveHistory,
    rollbackToStep,
    getCharacterState,
    updateCharacterAffinity,
    updateCharacterMood,
    performAction,
    selectCharacter,
    handleEventChoice,
    toggleDarkMode,
    resetGame,
    initGame,
    checkAndTriggerEvent
  }
})
