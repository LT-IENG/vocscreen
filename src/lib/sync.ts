import { supabase } from './supabase'
import { db } from '../db/database'
import type { NotebookRecord, CapturedWordRecord, ReviewScheduleRecord } from '../db/database'

// 安全的 JSON.parse：损坏数据返回 null 而非抛出
function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// ============================================
// 迁移标记：游客数据登录后首次全量上传，之后跳过避免重复
// ============================================
export async function migrateLocalToCloud(userId: string) {
  const key = 'vocscreen_migrated_' + userId
  if (localStorage.getItem(key)) return
  await pushLocalToCloud(userId)
  localStorage.setItem(key, '1')
}

// ============================================
// 上传本地数据到 Supabase（登录后调用）
// ============================================
export async function pushLocalToCloud(userId: string) {
  const [notebooks, capturedWords, schedules] = await Promise.all([
    db.notebooks.toArray(),
    db.capturedWords.toArray(),
    db.reviewSchedules.toArray(),
  ])

  // Notebooks
  if (notebooks.length > 0) {
    const rows = notebooks.map(n => ({
      id: n.id,
      user_id: userId,
      name: n.name,
      is_default: n.isDefault ?? false,
      created_at: new Date(n.createdAt).toISOString(),
    }))
    const { error } = await supabase.from('notebooks').upsert(rows, { onConflict: 'id' })
    if (error) console.warn('[sync] notebooks upsert failed:', error.message)
  }

  // Captured words
  if (capturedWords.length > 0) {
    const rows = capturedWords.map(w => ({
      id: w.id,
      user_id: userId,
      notebook_id: w.notebookId ?? null,
      word_entry_id: w.wordEntryId,
      spelling: w.spelling,
      lemma: w.lemma,
      source: safeJsonParse<unknown>(w.source, null),
      status: w.status,
      captured_at: new Date(w.capturedAt).toISOString(),
      learned_at: w.learnedAt ? new Date(w.learnedAt).toISOString() : null,
    }))
    const { error } = await supabase.from('captured_words').upsert(rows, { onConflict: 'id' })
    if (error) console.warn('[sync] captured_words upsert failed:', error.message)
  }

  // Review schedules
  if (schedules.length > 0) {
    const rows = schedules.map(s => ({
      id: s.id,
      user_id: userId,
      captured_word_id: s.capturedWordId,
      intervals: safeJsonParse<number[]>(s.intervals, [1, 2, 4, 7, 15, 30]),
      current_interval_index: s.currentIntervalIndex,
      last_review_at: s.lastReviewAt ? new Date(s.lastReviewAt).toISOString() : null,
      next_review_at: new Date(s.nextReviewAt).toISOString(),
      review_count: s.reviewCount,
      consecutive_pass: s.consecutivePass,
      ease: s.ease,
      status: s.status,
      learn_stage: s.learnStage ?? 'completed',
    }))
    const { error } = await supabase.from('review_schedules').upsert(rows, { onConflict: 'id' })
    if (error) console.warn('[sync] review_schedules upsert failed:', error.message)
  }
}

// ============================================
// 从 Supabase 拉取数据到本地（登录后调用）
// ============================================
export async function pullCloudToLocal(userId: string) {
  // Notebooks
  const { data: remoteNotebooks, error: nbErr } = await supabase
    .from('notebooks')
    .select('*')
    .eq('user_id', userId)

  if (nbErr) {
    console.warn('[sync] notebooks pull failed:', nbErr.message)
  } else if (remoteNotebooks && remoteNotebooks.length > 0) {
    const rows: NotebookRecord[] = remoteNotebooks.map(n => ({
      id: n.id,
      name: n.name,
      createdAt: new Date(n.created_at).getTime(),
      isDefault: n.is_default ?? false,
    }))
    await db.notebooks.bulkPut(rows)
  }

  // Captured words
  const { data: remoteWords, error: cwErr } = await supabase
    .from('captured_words')
    .select('*')
    .eq('user_id', userId)

  if (cwErr) {
    console.warn('[sync] captured_words pull failed:', cwErr.message)
  } else if (remoteWords && remoteWords.length > 0) {
    const rows: CapturedWordRecord[] = remoteWords.map(w => ({
      id: w.id,
      wordEntryId: w.word_entry_id ?? '',
      spelling: w.spelling,
      lemma: w.lemma,
      source: w.source ? JSON.stringify(w.source) : '{}',
      status: w.status ?? 'new',
      capturedAt: w.captured_at ? new Date(w.captured_at).getTime() : Date.now(),
      learnedAt: w.learned_at ? new Date(w.learned_at).getTime() : undefined,
      notebookId: w.notebook_id ?? undefined,
    }))
    await db.capturedWords.bulkPut(rows)
  }

  // Review schedules
  const { data: remoteSchedules, error: rsErr } = await supabase
    .from('review_schedules')
    .select('*')
    .eq('user_id', userId)

  if (rsErr) {
    console.warn('[sync] review_schedules pull failed:', rsErr.message)
  } else if (remoteSchedules && remoteSchedules.length > 0) {
    const rows: ReviewScheduleRecord[] = remoteSchedules.map(s => ({
      id: s.id,
      capturedWordId: s.captured_word_id,
      intervals: JSON.stringify(s.intervals ?? [1, 2, 4, 7, 15, 30]),
      currentIntervalIndex: s.current_interval_index ?? 0,
      lastReviewAt: s.last_review_at ? new Date(s.last_review_at).getTime() : null,
      nextReviewAt: new Date(s.next_review_at).getTime(),
      reviewCount: s.review_count ?? 0,
      consecutivePass: s.consecutive_pass ?? 0,
      ease: s.ease ?? 2.5,
      status: s.status ?? 'new',
      learnStage: s.learn_stage ?? 'completed',
    }))
    await db.reviewSchedules.bulkPut(rows)
  }
}

// ============================================
// 单条记录增量同步（操作后调用）
// ============================================
export async function syncNotebook(action: 'upsert' | 'delete', notebook: NotebookRecord | { id: string }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (action === 'delete') {
    const { error } = await supabase.from('notebooks').delete().eq('id', (notebook as { id: string }).id)
    if (error) console.warn('[sync] notebook delete failed:', error.message)
    return
  }

  const n = notebook as NotebookRecord
  const { error } = await supabase.from('notebooks').upsert({
    id: n.id,
    user_id: user.id,
    name: n.name,
    is_default: n.isDefault ?? false,
    created_at: new Date(n.createdAt).toISOString(),
  }, { onConflict: 'id' })
  if (error) console.warn('[sync] notebook upsert failed:', error.message)
}

export async function syncCapturedWord(action: 'upsert' | 'delete', word: CapturedWordRecord | { id: string }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (action === 'delete') {
    const { error } = await supabase.from('captured_words').delete().eq('id', (word as { id: string }).id)
    if (error) console.warn('[sync] captured_word delete failed:', error.message)
    return
  }

  const w = word as CapturedWordRecord
  const { error } = await supabase.from('captured_words').upsert({
    id: w.id,
    user_id: user.id,
    notebook_id: w.notebookId ?? null,
    word_entry_id: w.wordEntryId,
    spelling: w.spelling,
    lemma: w.lemma,
    source: safeJsonParse<unknown>(w.source, null),
    status: w.status,
    captured_at: new Date(w.capturedAt).toISOString(),
    learned_at: w.learnedAt ? new Date(w.learnedAt).toISOString() : null,
  }, { onConflict: 'id' })
  if (error) console.warn('[sync] captured_word upsert failed:', error.message)
}

export async function syncReviewSchedule(action: 'upsert' | 'delete', schedule: ReviewScheduleRecord | { id: string }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (action === 'delete') {
    const { error } = await supabase.from('review_schedules').delete().eq('id', (schedule as { id: string }).id)
    if (error) console.warn('[sync] review_schedule delete failed:', error.message)
    return
  }

  const s = schedule as ReviewScheduleRecord
  const { error } = await supabase.from('review_schedules').upsert({
    id: s.id,
    user_id: user.id,
    captured_word_id: s.capturedWordId,
    intervals: safeJsonParse<number[]>(s.intervals, [1, 2, 4, 7, 15, 30]),
    current_interval_index: s.currentIntervalIndex,
    last_review_at: s.lastReviewAt ? new Date(s.lastReviewAt).toISOString() : null,
    next_review_at: new Date(s.nextReviewAt).toISOString(),
    review_count: s.reviewCount,
    consecutive_pass: s.consecutivePass,
    ease: s.ease,
    status: s.status,
    learn_stage: s.learnStage ?? 'completed',
  }, { onConflict: 'id' })
  if (error) console.warn('[sync] review_schedule upsert failed:', error.message)
}

// ============================================
// 按 ID 从 IndexedDB 读取后同步（store 层调用）
// ============================================
export async function syncCapturedWordById(wordId: string) {
  const record = await db.capturedWords.get(wordId)
  if (!record) return
  await syncCapturedWord('upsert', record)
}

export async function syncReviewScheduleById(scheduleId: string) {
  const record = await db.reviewSchedules.get(scheduleId)
  if (!record) return
  await syncReviewSchedule('upsert', record)
}

export async function syncNotebookById(notebookId: string) {
  const record = await db.notebooks.get(notebookId)
  if (!record) return
  await syncNotebook('upsert', record)
}
