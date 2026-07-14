export type MasteryResult = 'known' | 'unknown'

export type LearnStage = 'choice' | 'context' | 'bare' | 'completed'

export interface EbbinghausSchedule {
  id: string
  capturedWordId: string
  intervals: number[]
  currentIntervalIndex: number
  lastReviewAt: number | null
  nextReviewAt: number
  reviewCount: number
  consecutivePass: number
  ease: number
  status: 'active' | 'mastered' | 'paused'
  learnStage: LearnStage
}

export interface DailyLearnRecord {
  id: string
  date: string
  wordId: string
  stagesPassed: LearnStage[]
  choiceCorrect: boolean
  contextResult: 'known' | 'unknown'
  bareResult: 'known' | 'unknown'
  completedAt: number | null
}
