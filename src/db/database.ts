import Dexie, { type Table } from 'dexie'

export interface VideoRecord {
  id: string
  title: string
  filePath?: string
  duration: number
  createdAt: number
}

export interface SubtitleRecord {
  id: string
  videoId: string
  startTime: number
  endTime: number
  textEn: string
  textZh: string
  alignment: string
  highlightedWords: string
}

export interface WordEntryRecord {
  id: string
  spelling: string
  lemma: string
  phonetics: string
  definition: string
  level: string
  frequency: number
  tags: string
}

export interface CapturedWordRecord {
  id: string
  wordEntryId: string
  spelling: string
  lemma: string
  source: string
  status: string
  capturedAt: number
  learnedAt?: number
  notebookId?: string
}

export interface NotebookRecord {
  id: string
  name: string
  createdAt: number
  isDefault?: boolean
}

export interface ReviewScheduleRecord {
  id: string
  capturedWordId: string
  intervals: string
  currentIntervalIndex: number
  lastReviewAt: number | null
  nextReviewAt: number
  reviewCount: number
  consecutivePass: number
  ease: number
  status: string
}

export interface UserStatsRecord {
  id: string
  totalVideosWatched: number
  totalWordsCaptured: number
  totalReviews: number
  streak: number
  lastActiveDate: string
}

export interface ClipRecord {
  id: string
  capturedWordId: string
  blob: Blob
  createdAt: number
}

class VocScreenDB extends Dexie {
  videos!: Table<VideoRecord>
  subtitleSegments!: Table<SubtitleRecord>
  wordEntries!: Table<WordEntryRecord>
  capturedWords!: Table<CapturedWordRecord>
  reviewSchedules!: Table<ReviewScheduleRecord>
  userStats!: Table<UserStatsRecord>
  clips!: Table<ClipRecord>
  notebooks!: Table<NotebookRecord>

  constructor() {
    super('VocScreenDB')

    this.version(1).stores({
      videos: 'id, createdAt',
      subtitleSegments: 'id, videoId, startTime',
      wordEntries: 'id, spelling, lemma, level',
      capturedWords: 'id, wordEntryId, spelling, status',
      reviewSchedules: 'id, capturedWordId, nextReviewAt, status',
      userStats: 'id',
      clips: 'id, capturedWordId',
    })

    this.version(2).stores({
      videos: 'id, createdAt',
      subtitleSegments: 'id, videoId, startTime',
      wordEntries: 'id, spelling, lemma, level',
      capturedWords: 'id, wordEntryId, spelling, status, notebookId',
      reviewSchedules: 'id, capturedWordId, nextReviewAt, status',
      userStats: 'id',
      clips: 'id, capturedWordId',
      notebooks: 'id, createdAt',
    })
  }
}

export const db = new VocScreenDB()