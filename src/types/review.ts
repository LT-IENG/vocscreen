export type MasteryResult = 'known' | 'fuzzy' | 'unknown'

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
}