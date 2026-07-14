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
  learnStage: string
}

export interface DailyLearnRecordDB {
  id: string
  date: string
  wordId: string
  stagesPassed: string
  choiceCorrect: number
  contextResult: string
  bareResult: string
  completedAt: number | null
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
  dailyLearnRecords!: Table<DailyLearnRecordDB>

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

    this.version(3).stores({
      videos: 'id, createdAt',
      subtitleSegments: 'id, videoId, startTime',
      wordEntries: 'id, spelling, lemma, level',
      capturedWords: 'id, wordEntryId, spelling, status, notebookId',
      reviewSchedules: 'id, capturedWordId, nextReviewAt, status',
      userStats: 'id',
      clips: 'id, capturedWordId',
      notebooks: 'id, createdAt',
      dailyLearnRecords: 'id, date, wordId, completedAt',
    })
  }
}

export const db = new VocScreenDB()

/**
 * 安全清空本地数据：标记 → 刷新 → 下次启动时实际删除数据库
 * 避免 db.close() 后 React 组件读取已关闭 db 导致渲染循环
 */
const CLEAR_FLAG = 'vocscreen_pending_clear'

export function clearAllLocalData(): void {
  // 1. 设置待清理标记（保留在 localStorage 中，clear 后仍需读取）
  localStorage.setItem(CLEAR_FLAG, '1')
  // 2. 清除 localStorage 中其他数据
  const flag = localStorage.getItem(CLEAR_FLAG)
  localStorage.clear()
  if (flag) localStorage.setItem(CLEAR_FLAG, '1')
  // 3. 刷新页面到开始界面（全量导航，React 组件卸载）
  window.location.replace(window.location.origin)
}

/**
 * 应用启动时检查是否需要清理数据库
 * 在 React 挂载之前调用，避免组件读取已删除的 db
 */
export function checkPendingClear(): void {
  if (!localStorage.getItem(CLEAR_FLAG)) return
  localStorage.removeItem(CLEAR_FLAG)
  try {
    db.close()
    const req = indexedDB.deleteDatabase('VocScreenDB')
    // 同步等待：阻塞直到删除完成或超时
    // 使用原生 XHR 风格的同步等待不可行，这里用最简单的同步删除尝试
    req.onsuccess = () => window.location.reload()
    req.onerror = () => window.location.reload()
    req.onblocked = () => window.location.reload()
    // 兜底：2 秒后强制刷新
    setTimeout(() => window.location.reload(), 2000)
  } catch {
    window.location.reload()
  }
}