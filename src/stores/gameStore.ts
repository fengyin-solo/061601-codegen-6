import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TimeOfDay, ActionType, GameEventConfig, EventChoice, DailyGoal } from '../types/game'
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
  getMoodLabel,
  generateDailyGoals
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

export interface CharacterBaseline {
  id: string
  affinity: number
  mood: number
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
  dailyGoals: DailyGoal[]
  dailyCharacterBaseline: CharacterBaseline[]
  chattedCharacters: string[]
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
  const dailyGoals = ref<DailyGoal[]>([])
  const dailyCharacterBaseline = ref<CharacterBaseline[]>([])
  const chattedCharacters = ref<string[]>([])
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

  const completedGoals = computed(() =>
    dailyGoals.value.filter(g => g.completed && !g.claimed)
  )

  const totalDailyReward = computed(() =>
    dailyGoals.value.reduce((sum, g) => g.completed && !g.claimed ? sum + g.reward : sum, 0)
  )

  const unclaimedGoalsCount = computed(() =>
    dailyGoals.value.filter(g => g.completed && !g.claimed).length
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
      logs: JSON.parse(JSON.stringify(logs.value)),
      dailyGoals: JSON.parse(JSON.stringify(dailyGoals.value)),
      dailyCharacterBaseline: JSON.parse(JSON.stringify(dailyCharacterBaseline.value)),
      chattedCharacters: [...chattedCharacters.value]
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
    dailyGoals.value = JSON.parse(JSON.stringify(snapshot.dailyGoals || []))
    dailyCharacterBaseline.value = JSON.parse(JSON.stringify(snapshot.dailyCharacterBaseline || []))
    chattedCharacters.value = [...(snapshot.chattedCharacters || [])]
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

  function initDailyGoals() {
    const unlockedChars = characters.value
      .filter(c => c.unlocked)
      .map(c => {
        const config = gameConfig.characters.find(cc => cc.id === c.id)
        return { id: c.id, name: config?.name || c.id }
      })

    dailyGoals.value = generateDailyGoals(
      gameConfig.dailyGoals,
      gameConfig.dailyGoalCount,
      day.value,
      unlockedChars
    )

    dailyCharacterBaseline.value = characters.value
      .filter(c => c.unlocked)
      .map(c => ({
        id: c.id,
        affinity: c.affinity,
        mood: c.mood
      }))

    chattedCharacters.value = []
  }

  function getCharacterBaseline(characterId: string): CharacterBaseline | undefined {
    return dailyCharacterBaseline.value.find(b => b.id === characterId)
  }

  function updateDailyGoalProgress(action: string, characterId?: string, affinityChange?: number) {
    dailyGoals.value.forEach(goal => {
      if (goal.completed) return

      switch (goal.type) {
        case 'chat':
          if (action === 'chat') {
            if (goal.characterId) {
              if (characterId === goal.characterId) {
                goal.currentCount++
              }
            } else {
              goal.currentCount++
            }
          }
          break

        case 'gift':
          if (action === 'gift') {
            if (goal.characterId) {
              if (characterId === goal.characterId) {
                goal.currentCount++
              }
            } else {
              goal.currentCount++
            }
          }
          break

        case 'work':
          if (action === 'work') {
            goal.currentCount++
          }
          break

        case 'affinity':
          if (action === 'chat' || action === 'gift') {
            if (goal.characterId && characterId === goal.characterId) {
              const baseline = getCharacterBaseline(characterId)
              const charState = getCharacterState(characterId)
              if (baseline && charState) {
                goal.currentValue = Math.max(0, charState.affinity - baseline.affinity)
              }
            } else if (!goal.characterId && characterId) {
              const baseline = getCharacterBaseline(characterId)
              const charState = getCharacterState(characterId)
              if (baseline && charState) {
                const gain = charState.affinity - baseline.affinity
                if (gain > (goal.currentValue || 0)) {
                  goal.currentValue = gain
                }
              }
            }
          }
          break

        case 'mood':
          if (action === 'chat' || action === 'gift') {
            if (characterId) {
              const charState = getCharacterState(characterId)
              if (charState && charState.mood >= (goal.targetValue || 60)) {
                goal.currentCount = 1
              }
            }
          }
          break

        case 'multi_chat':
          if (action === 'chat' && characterId) {
            if (!chattedCharacters.value.includes(characterId)) {
              chattedCharacters.value.push(characterId)
            }
            goal.currentCount = chattedCharacters.value.length
          }
          break
      }

      checkGoalCompletion(goal)
    })
  }

  function checkGoalCompletion(goal: DailyGoal) {
    if (goal.completed) return

    let isCompleted = false

    if (goal.type === 'affinity') {
      isCompleted = (goal.currentValue || 0) >= (goal.targetValue || 0)
    } else if (goal.type === 'mood') {
      isCompleted = goal.currentCount >= goal.targetCount
    } else {
      isCompleted = goal.currentCount >= goal.targetCount
    }

    if (isCompleted && !goal.completed) {
      goal.completed = true
      addLog('system', `🎯 完成目标：${goal.title}（可领取 ${goal.reward} 代币）`)
    }
  }

  function claimGoalReward(goalId: string): boolean {
    const goal = dailyGoals.value.find(g => g.id === goalId)
    if (!goal || !goal.completed || goal.claimed) return false

    goal.claimed = true
    resources.value += goal.reward
    addLog('system', `🎁 领取目标奖励：${goal.reward} 代币`)
    return true
  }

  function claimAllDailyRewards(): number {
    let total = 0
    dailyGoals.value.forEach(goal => {
      if (goal.completed && !goal.claimed) {
        goal.claimed = true
        total += goal.reward
      }
    })
    if (total > 0) {
      resources.value += total
      addLog('system', `🎁 领取全部每日奖励：${total} 代币`)
    }
    return total
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

    initDailyGoals()

    addLog('system', `🌅 第 ${day.value} 天开始了`)
    addLog('system', '📋 今日目标已刷新')
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
    updateDailyGoalProgress('chat', characterId, affinityChange)
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
    updateDailyGoalProgress('gift', characterId, affinityChange)
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
    updateDailyGoalProgress('work')
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
    dailyGoals.value = []
    dailyCharacterBaseline.value = []
    chattedCharacters.value = []
    logs.value = []
    history.value = []
    logIdCounter = 0

    addLog('system', '🎮 游戏开始！欢迎来到恋爱物语')
    initDailyGoals()
    checkAndTriggerEvent()
  }

  interface RestoreStateData {
    day: number
    timeSlot: TimeOfDay
    actionsRemaining: number
    resources: number
    characters: CharacterState[]
    selectedCharacterId: string | null
    flags: string[]
    triggeredEvents: string[]
    collectedCards: string[]
    dailyGoals?: DailyGoal[]
    dailyCharacterBaseline?: CharacterBaseline[]
    chattedCharacters?: string[]
    logs: LogEntry[]
    history: HistorySnapshot[]
    darkMode: boolean
  }

  function restoreState(data: RestoreStateData): boolean {
    try {
      day.value = data.day
      timeSlot.value = data.timeSlot
      actionsRemaining.value = data.actionsRemaining
      resources.value = data.resources
      characters.value = Array.isArray(data.characters)
        ? data.characters.map(c => ({ ...c }))
        : []
      selectedCharacterId.value = data.selectedCharacterId
      flags.value = Array.isArray(data.flags) ? [...data.flags] : []
      triggeredEvents.value = Array.isArray(data.triggeredEvents) ? [...data.triggeredEvents] : []
      collectedCards.value = Array.isArray(data.collectedCards) ? [...data.collectedCards] : []
      dailyGoals.value = Array.isArray(data.dailyGoals)
        ? data.dailyGoals.map(g => ({ ...g }))
        : []
      dailyCharacterBaseline.value = Array.isArray(data.dailyCharacterBaseline)
        ? data.dailyCharacterBaseline.map(b => ({ ...b }))
        : []
      chattedCharacters.value = Array.isArray(data.chattedCharacters)
        ? [...data.chattedCharacters]
        : []
      logs.value = Array.isArray(data.logs)
        ? data.logs.map(l => ({ ...l }))
        : []
      history.value = Array.isArray(data.history)
        ? JSON.parse(JSON.stringify(data.history))
        : []
      darkMode.value = data.darkMode
      return true
    } catch (e) {
      console.error('Failed to restore game state:', e)
      return false
    }
  }

  function initGame() {
    if (logs.value.length === 0) {
      addLog('system', '🎮 游戏开始！欢迎来到恋爱物语')
    }
    if (dailyGoals.value.length === 0) {
      initDailyGoals()
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
    dailyGoals,
    completedGoals,
    totalDailyReward,
    unclaimedGoalsCount,
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
    checkAndTriggerEvent,
    claimGoalReward,
    claimAllDailyRewards,
    initDailyGoals,
    restoreState
  }
})
