import type { TimeOfDay, MoodLevel, GameConfig, CharacterConfig, DailyGoalTemplate, DailyGoal } from '../types/game'

export function getMoodLevel(mood: number): MoodLevel {
  if (mood >= 80) return 'happy'
  if (mood >= 60) return 'good'
  if (mood >= 40) return 'neutral'
  if (mood >= 20) return 'bad'
  return 'angry'
}

export function getMoodColor(mood: number): string {
  const level = getMoodLevel(mood)
  const colors: Record<MoodLevel, string> = {
    happy: '#22c55e',
    good: '#84cc16',
    neutral: '#eab308',
    bad: '#f97316',
    angry: '#ef4444'
  }
  return colors[level]
}

export function getMoodLabel(mood: number): string {
  const level = getMoodLevel(mood)
  const labels: Record<MoodLevel, string> = {
    happy: '开心',
    good: '不错',
    neutral: '一般',
    bad: '低落',
    angry: '生气'
  }
  return labels[level]
}

export function getTimeLabel(time: TimeOfDay): string {
  const labels: Record<TimeOfDay, string> = {
    morning: '早晨',
    afternoon: '下午',
    evening: '傍晚',
    night: '深夜'
  }
  return labels[time]
}

export function getTimeIcon(time: TimeOfDay): string {
  const icons: Record<TimeOfDay, string> = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌆',
    night: '🌙'
  }
  return icons[time]
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function getAffinityColor(affinity: number, maxAffinity: number): string {
  const ratio = affinity / maxAffinity
  if (ratio >= 0.8) return '#ec4899'
  if (ratio >= 0.6) return '#f472b6'
  if (ratio >= 0.4) return '#fb923c'
  if (ratio >= 0.2) return '#fbbf24'
  if (ratio >= 0) return '#94a3b8'
  return '#64748b'
}

export function getAffinityStage(affinity: number): string {
  if (affinity >= 80) return '恋人'
  if (affinity >= 60) return '亲密'
  if (affinity >= 40) return '好友'
  if (affinity >= 20) return '朋友'
  if (affinity >= 0) return '相识'
  return '陌生'
}

export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: '#94a3b8',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b'
  }
  return colors[rarity] || '#94a3b8'
}

export function getRarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
  }
  return labels[rarity] || '普通'
}

export function getNextTimeSlot(current: TimeOfDay, timeSlots: TimeOfDay[]): TimeOfDay {
  const index = timeSlots.indexOf(current)
  if (index < timeSlots.length - 1) {
    return timeSlots[index + 1]
  }
  return timeSlots[0]
}

export function isGiftLiked(giftId: string, character: CharacterConfig): boolean {
  return character.favoriteGifts.includes(giftId)
}

export function isGiftDisliked(giftId: string, character: CharacterConfig): boolean {
  return character.dislikedGifts.includes(giftId)
}

export function calculateChatAffinity(
  topic: string,
  character: CharacterConfig,
  mood: number,
  timeOfDay: TimeOfDay
): number {
  const topicConfig = character.chatTopics.find(t => t.topic === topic)
  let baseChange = topicConfig ? topicConfig.affinity : 0

  const moodMultiplier = 0.5 + (mood / 100)
  baseChange *= moodMultiplier

  if (timeOfDay === 'night' && character.baseMood < 50) {
    baseChange *= 0.7
  }
  if (timeOfDay === 'morning' && character.baseMood >= 60) {
    baseChange *= 1.2
  }

  return Math.round(baseChange * 10) / 10
}

export function calculateGiftAffinity(
  giftId: string,
  character: CharacterConfig,
  giftPrice: number,
  mood: number
): number {
  let baseChange = giftPrice / 10

  if (isGiftLiked(giftId, character)) {
    baseChange *= 2
  } else if (isGiftDisliked(giftId, character)) {
    baseChange *= -0.5
  }

  const moodMultiplier = 0.6 + (mood / 150)
  baseChange *= moodMultiplier

  return Math.round(baseChange * 10) / 10
}

export function generateDailyGoals(
  templates: DailyGoalTemplate[],
  count: number,
  day: number,
  unlockedCharacters: { id: string; name: string }[]
): DailyGoal[] {
  if (unlockedCharacters.length === 0) return []

  const shuffled = [...templates].sort(() => Math.random() - 0.5)
  const selected: DailyGoalTemplate[] = []
  const selectedTypes = new Set<string>()

  for (const template of shuffled) {
    if (selected.length >= count) break
    if (selectedTypes.has(template.type) && template.type !== 'chat') continue
    if (template.characterSpecific && unlockedCharacters.length < 1) continue
    selected.push(template)
    selectedTypes.add(template.type)
  }

  while (selected.length < count && shuffled.length > selected.length) {
    const remaining = shuffled.filter(t => !selected.includes(t))
    if (remaining.length === 0) break
    selected.push(remaining[0])
  }

  return selected.map((template, index) => {
    const goal: DailyGoal = {
      id: `goal_${day}_${index}_${template.id}`,
      templateId: template.id,
      type: template.type,
      title: template.title,
      description: template.description,
      icon: template.icon,
      targetCount: template.targetCount,
      currentCount: 0,
      reward: template.reward,
      completed: false,
      claimed: false,
      suggestion: ''
    }

    if (template.targetValue !== undefined) {
      goal.targetValue = template.targetValue
      goal.currentValue = 0
    }

    if (template.characterSpecific) {
      const randomChar = unlockedCharacters[Math.floor(Math.random() * unlockedCharacters.length)]
      goal.characterId = randomChar.id
      goal.characterName = randomChar.name
      goal.description = template.description.replace('指定角色', randomChar.name)
    }

    goal.suggestion = generateGoalSuggestion(goal)

    return goal
  })
}

export function generateGoalSuggestion(goal: DailyGoal): string {
  switch (goal.type) {
    case 'chat':
      if (goal.characterId) {
        return `💡 建议：去和${goal.characterName}聊聊天吧，聊聊ta感兴趣的话题效果更好哦~`
      }
      return '💡 建议：选择一个角色开始聊天，能增进感情哦~'
    case 'gift':
      if (goal.characterId) {
        return `💡 建议：送${goal.characterName}一份ta喜欢的礼物，好感度会翻倍！`
      }
      return '💡 建议：送礼物是快速提升好感的好方法~'
    case 'work':
      return '💡 建议：打工虽然会让角色们有点失落，但能赚取不少代币呢！'
    case 'affinity':
      if (goal.characterId) {
        return `💡 建议：多和${goal.characterName}互动，送ta喜欢的礼物能快速提升好感~`
      }
      return '💡 建议：和角色聊天、送礼物都能提升好感度哦~'
    case 'mood':
      return '💡 建议：聊天和送喜欢的礼物都能让角色心情变好~'
    case 'multi_chat':
      return '💡 建议：多和不同的角色互动，拓展你的社交圈吧~'
    default:
      return '💡 建议：完成目标获得奖励吧！'
  }
}

export function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  }
  return labels[difficulty] || '普通'
}

export function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    easy: '#22c55e',
    medium: '#f59e0b',
    hard: '#ef4444'
  }
  return colors[difficulty] || '#94a3b8'
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
