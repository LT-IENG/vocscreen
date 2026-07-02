import { create } from 'zustand'
import type { EbbinghausSchedule, MasteryResult } from '../types'
import { db, type ReviewScheduleRecord } from '../db/database'

const INTERVALS = [1, 2, 4, 7, 15, 30]

interface ReviewState {
  schedules: Map<string, EbbinghausSchedule>
  reviewQueue: string[]
  currentReviewIndex: number
  dueCount: number

  initializeSchedule: (capturedWordId: string, firstResult: MasteryResult) => Promise<void>
  recordReview: (capturedWordId: string, result: MasteryResult) => Promise<void>
  getDueWords: () => Promise<void>
  setCurrentReviewIndex: (index: number) => void
  loadPersistedSchedules: () => Promise<void>
}

function calcNextReview(
  schedule: EbbinghausSchedule,
  result: MasteryResult
): Partial<EbbinghausSchedule> {
  const now = Date.now()
  const currentIdx = schedule.currentIntervalIndex

  if (result === 'known') {
    const nextIdx = Math.min(currentIdx + 1, INTERVALS.length - 1)
    const nextDay = new Date()
    nextDay.setDate(nextDay.getDate() + INTERVALS[nextIdx])
    nextDay.setHours(9, 0, 0, 0)
    const newConsecutive = schedule.consecutivePass + 1
    const mastered = newConsecutive >= 6
    return {
      currentIntervalIndex: nextIdx,
      lastReviewAt: now,
      nextReviewAt: nextDay.getTime(),
      reviewCount: schedule.reviewCount + 1,
      consecutivePass: newConsecutive,
      ease: Math.min(2.5, schedule.ease + 0.15),
      status: mastered ? 'mastered' : 'active',
    }
  } else if (result === 'fuzzy') {
    const nextIdx = Math.max(0, currentIdx - 1)
    const nextDay = new Date()
    nextDay.setDate(nextDay.getDate() + INTERVALS[nextIdx])
    nextDay.setHours(9, 0, 0, 0)
    return {
      currentIntervalIndex: nextIdx,
      lastReviewAt: now,
      nextReviewAt: nextDay.getTime(),
      reviewCount: schedule.reviewCount + 1,
      consecutivePass: 0,
      ease: Math.max(0.5, schedule.ease - 0.2),
      status: 'active',
    }
  } else {
    const nextDay = new Date()
    nextDay.setHours(nextDay.getHours() + 4)
    return {
      currentIntervalIndex: 0,
      lastReviewAt: now,
      nextReviewAt: nextDay.getTime(),
      reviewCount: schedule.reviewCount + 1,
      consecutivePass: 0,
      ease: Math.max(0.5, schedule.ease - 0.3),
      status: 'active',
    }
  }
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  schedules: new Map(),
  reviewQueue: [],
  currentReviewIndex: 0,
  dueCount: 0,

  initializeSchedule: async (capturedWordId, firstResult) => {
    const now = Date.now()
    const startIdx = firstResult === 'known' ? 1 : 0
    const nextDay = new Date()
    nextDay.setDate(nextDay.getDate() + INTERVALS[startIdx])
    nextDay.setHours(9, 0, 0, 0)

    const schedule: EbbinghausSchedule = {
      id: crypto.randomUUID(),
      capturedWordId,
      intervals: INTERVALS,
      currentIntervalIndex: startIdx,
      lastReviewAt: now,
      nextReviewAt: nextDay.getTime(),
      reviewCount: 1,
      consecutivePass: firstResult === 'known' ? 1 : 0,
      ease: 1.0,
      status: 'active',
    }

    set((s) => {
      const newSchedules = new Map(s.schedules)
      newSchedules.set(capturedWordId, schedule)
      return { schedules: newSchedules }
    })

    await db.reviewSchedules.put({
      id: schedule.id,
      capturedWordId,
      intervals: JSON.stringify(INTERVALS),
      currentIntervalIndex: schedule.currentIntervalIndex,
      lastReviewAt: schedule.lastReviewAt,
      nextReviewAt: schedule.nextReviewAt,
      reviewCount: schedule.reviewCount,
      consecutivePass: schedule.consecutivePass,
      ease: schedule.ease,
      status: schedule.status,
    })

    await get().getDueWords()
  },

  recordReview: async (capturedWordId, result) => {
    const schedule = get().schedules.get(capturedWordId)
    if (!schedule) return

    const updates = calcNextReview(schedule, result)

    set((s) => {
      const newSchedules = new Map(s.schedules)
      newSchedules.set(capturedWordId, { ...schedule, ...updates })
      // Remove this word from the review queue immediately
      const newQueue = s.reviewQueue.filter((id) => id !== capturedWordId)
      return {
        schedules: newSchedules,
        reviewQueue: newQueue,
        dueCount: newQueue.length,
      }
    })

    const { intervals: _omit, ...restUpdates } = updates
    const dbUpdates: Partial<ReviewScheduleRecord> = { ...restUpdates }
    if (updates.intervals) {
      dbUpdates.intervals = JSON.stringify(updates.intervals)
    }
    await db.reviewSchedules.update(schedule.id, dbUpdates)
  },

  getDueWords: async () => {
    const now = Date.now()
    const records = await db.reviewSchedules
      .where('status')
      .equals('active')
      .and((r) => r.nextReviewAt <= now)
      .toArray()

    set((s) => {
      const newSchedules = new Map(s.schedules)
      for (const r of records) {
        if (!newSchedules.has(r.capturedWordId)) {
          newSchedules.set(r.capturedWordId, {
            id: r.id,
            capturedWordId: r.capturedWordId,
            intervals: JSON.parse(r.intervals),
            currentIntervalIndex: r.currentIntervalIndex,
            lastReviewAt: r.lastReviewAt,
            nextReviewAt: r.nextReviewAt,
            reviewCount: r.reviewCount,
            consecutivePass: r.consecutivePass,
            ease: r.ease,
            status: r.status as EbbinghausSchedule['status'],
          })
        }
      }
      return {
        schedules: newSchedules,
        reviewQueue: records.map((r) => r.capturedWordId),
        dueCount: records.length,
      }
    })
  },

  setCurrentReviewIndex: (index) => set({ currentReviewIndex: index }),

  loadPersistedSchedules: async () => {
    await get().getDueWords()
    const allRecords = await db.reviewSchedules.toArray()
    const schedules = new Map<string, EbbinghausSchedule>()
    for (const r of allRecords) {
      schedules.set(r.capturedWordId, {
        id: r.id,
        capturedWordId: r.capturedWordId,
        intervals: JSON.parse(r.intervals),
        currentIntervalIndex: r.currentIntervalIndex,
        lastReviewAt: r.lastReviewAt,
        nextReviewAt: r.nextReviewAt,
        reviewCount: r.reviewCount,
        consecutivePass: r.consecutivePass,
        ease: r.ease,
        status: r.status as EbbinghausSchedule['status'],
      })
    }
    set({ schedules })
  },
}))