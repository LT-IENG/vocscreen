import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useUIStore } from '../../stores/useUIStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useReviewStore } from '../../stores/useReviewStore'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { ChoiceStage } from './stages/ChoiceStage'
import { ContextStage } from './stages/ContextStage'
import { BareStage } from './stages/BareStage'
import { WordDetailView } from './stages/WordDetailView'
import { VideoClipModal } from './VideoClipModal'
import { Modal } from '../ui/Modal'
import { stripEnglish } from '../../lib/distractors'
import { clearAllLocalData } from '../../db/database'
import type { MasteryResult, WordBookId, LearnStage } from '../../types'
import type { DictSense } from '../../stores/useUIStore'
import {
  ArrowLeft, GraduationCap, Check, VideoCamera,
  BookOpen, Notebook, Lightning, Clock, Sparkle, Warning, QrCode, Trash,
} from '@phosphor-icons/react'
import './MemorizeScreen.css'

export interface MemorizeItem {
  spelling: string
  lemma: string
  phonetics: string
  definition: string
  senses?: DictSense[]
  level?: string
  exampleSentence?: string
  exampleTranslation?: string
  videoSentence?: string
  videoSentenceTranslation?: string
  phrases?: import('../../types').Phrase[]
  relatedWords?: import('../../types').RelatedWordGroup[]
  synonyms?: import('../../types').SynonymGroup[]
  mnemonic?: string
  examSentences?: import('../../types').ExamSentence[]
  source: 'video' | 'captured' | 'wordbook'
  capturedWordId?: string
  videoClipStart?: number
  videoClipEnd?: number
}

interface LearnQueueItem extends MemorizeItem {
  currentStage: LearnStage
  stagesPassed: LearnStage[]
}

type Phase = 'home' | 'source-select' | 'learning' | 'results'
type Mode = 'learn' | 'review'

interface AssessmentRecord {
  item: MemorizeItem
  result: MasteryResult
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const DAILY_LIMIT_KEY = 'vocscreen_daily_limit'
const DEFAULT_DAILY_LIMIT = 15

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function cleanDef(def: unknown): string {
  if (!def) return '释义暂缺'
  if (typeof def === 'string') {
    const cleaned = stripEnglish(def)
    return cleaned || '释义暂缺'
  }
  if (Array.isArray(def)) {
    const formatted = def
      .map((s: unknown) => {
        if (typeof s === 'string') return stripEnglish(s)
        if (s && typeof s === 'object') {
          const obj = s as Record<string, unknown>
          const cn = typeof obj.tranCn === 'string' ? obj.tranCn : ''
          if (!cn) return ''
          return cn
        }
        return ''
      })
      .filter(Boolean)
      .join('；')
    return formatted || '释义暂缺'
  }
  return '释义暂缺'
}

export function MemorizeScreen() {
  const setAppScreen = useUIStore((s) => s.setAppScreen)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const selectedWordBookId = useUIStore((s) => s.selectedWordBookId)

  const combinedDict = useVocabStore((s) => s.combinedDict)
  const loadedBooks = useVocabStore((s) => s.loadedBooks)
  const capturedWords = useVocabStore((s) => s.capturedWords)
  const captureWord = useVocabStore((s) => s.captureWord)
  const markWordAsLearned = useVocabStore((s) => s.markWordAsLearned)
  const markWordAsMastered = useVocabStore((s) => s.markWordAsMastered)
  const vocabSelectedBookId = useVocabStore((s) => s.selectedBookId)
  const segments = useSubtitleStore((s) => s.segments)
  const matchSummary = useSubtitleStore((s) => s.matchSummary)

  // Fallback: if UI store's selectedWordBookId is null, use vocab store's selectedBookId or first loaded book
  const effectiveBookId = selectedWordBookId ?? vocabSelectedBookId ?? (loadedBooks.size > 0 ? Array.from(loadedBooks.keys())[0] : null)

  const schedules = useReviewStore((s) => s.schedules)
  const reviewQueue = useReviewStore((s) => s.reviewQueue)
  const dueCount = useReviewStore((s) => s.dueCount)
  const getDueWords = useReviewStore((s) => s.getDueWords)
  const initializeSchedule = useReviewStore((s) => s.initializeSchedule)
  const recordReview = useReviewStore((s) => s.recordReview)

  const [phase, setPhase] = useState<Phase>('home')
  const [mode, setMode] = useState<Mode>('learn')
  const [sources, setSources] = useState<Set<'video' | 'captured' | 'wordbook'>>(new Set(['video']))
  const [queue, setQueue] = useState<LearnQueueItem[]>([])
  const [completedCount, setCompletedCount] = useState(0)
  const [stagesCompleted, setStagesCompleted] = useState(0)
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([])
  const [isAssessing, setIsAssessing] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [clipModalItem, setClipModalItem] = useState<MemorizeItem | null>(null)
  const [pendingDetail, setPendingDetail] = useState<{ result: boolean; stage: LearnStage; mode: Mode } | null>(null)
  const [stepCounter, setStepCounter] = useState(0)
  const [learnedFlash, setLearnedFlash] = useState<string | null>(null)
  const [dailyLimit, setDailyLimit] = useState<number>(() => {
    const saved = localStorage.getItem(DAILY_LIMIT_KEY)
    return saved ? Number(saved) : DEFAULT_DAILY_LIMIT
  })
  const [todayLearnedCount, setTodayLearnedCount] = useState(0)
  const initialQueueLengthRef = useRef(0)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const videoBlobUrl = usePlayerStore((s) => s.videoBlobUrl)

  // Ensure the selected wordbook is loaded
  const targetBookId = (selectedWordBookId ?? vocabSelectedBookId) as WordBookId | null
  const hasTargetBook = targetBookId ? loadedBooks.has(targetBookId) : false

  useEffect(() => {
    if (targetBookId && !hasTargetBook) {
      fetch(`/wordbooks/${targetBookId}.json`)
        .then(r => r.ok ? r.json() : null)
        .then(book => book && useVocabStore.getState().loadBook(book))
        .catch(() => {})
    } else if (!targetBookId && loadedBooks.size === 0) {
      fetch('/wordbooks/cet6.json')
        .then(r => r.ok ? r.json() : null)
        .then(book => book && useVocabStore.getState().loadBook(book))
        .catch(() => {})
    }
  }, [targetBookId, hasTargetBook, loadedBooks.size])

  useEffect(() => {
    getDueWords()
  }, [getDueWords])

  useEffect(() => {
    const today = getTodayStr()
    const key = `vocscreen_learned_${today}`
    const saved = localStorage.getItem(key)
    setTodayLearnedCount(saved ? Number(saved) : 0)
  }, [])

  const sourceCounts = useMemo(() => {
    const videoWords = matchSummary?.matchList ?? []
    const videoCount = videoWords.length
    const capturedLemmas = new Set(capturedWords.map(w => w.lemma.toLowerCase()))
    const capturedCount = capturedLemmas.size
    const book = effectiveBookId
      ? loadedBooks.get(effectiveBookId as WordBookId)
      : undefined
    const wordbookCount = book ? book.entries.length : 0
    return { video: videoCount, captured: capturedCount, wordbook: wordbookCount }
  }, [matchSummary, capturedWords, loadedBooks, effectiveBookId])

  const findExample = useCallback((lemma: string): { en?: string; zh?: string; start?: number; end?: number } => {
    const lower = lemma.toLowerCase()
    for (const seg of segments) {
      const words = seg.textEn.toLowerCase().split(/[^a-z']+/)
      if (words.includes(lower) || seg.highlightedWords?.some(hw => hw.lemma === lemma)) {
        return { en: seg.textEn, zh: seg.textZh, start: seg.startTime, end: seg.endTime }
      }
    }
    return {}
  }, [segments])

  const buildLearnItems = useCallback((): MemorizeItem[] => {
    const itemMap = new Map<string, MemorizeItem>()

    if (sources.has('video') && matchSummary) {
      for (const lemma of matchSummary.matchList) {
        const entry = combinedDict.get(lemma.toLowerCase())
        if (!entry) continue
        const ex = findExample(lemma)
        itemMap.set(lemma.toLowerCase(), {
          spelling: entry.spelling,
          lemma: entry.lemma,
          phonetics: entry.phonetics,
          definition: cleanDef(entry.definition),
          senses: entry.senses,
          level: entry.level,
          exampleSentence: entry.exampleSentence,
          exampleTranslation: entry.exampleTranslation,
          videoSentence: ex.en,
          videoSentenceTranslation: ex.zh,
          phrases: entry.phrases,
          relatedWords: entry.relatedWords,
          synonyms: entry.synonyms,
          mnemonic: entry.mnemonic,
          examSentences: entry.examSentences,
          source: 'video',
          videoClipStart: ex.start,
          videoClipEnd: ex.end,
        })
      }
    }

    if (sources.has('captured')) {
      const seen = new Set<string>()
      for (const cw of capturedWords) {
        const key = cw.lemma.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        if (itemMap.has(key)) continue
        const entry = combinedDict.get(key)
        const ex = findExample(cw.lemma)
        itemMap.set(key, {
          spelling: cw.spelling,
          lemma: cw.lemma,
          phonetics: entry?.phonetics ?? '',
          definition: cleanDef(entry?.definition),
          senses: entry?.senses,
          level: entry?.level,
          exampleSentence: entry?.exampleSentence,
          exampleTranslation: entry?.exampleTranslation,
          videoSentence: ex.en ?? cw.source.sentenceEn,
          videoSentenceTranslation: ex.zh ?? cw.source.sentenceZh,
          phrases: entry?.phrases,
          relatedWords: entry?.relatedWords,
          synonyms: entry?.synonyms,
          mnemonic: entry?.mnemonic,
          examSentences: entry?.examSentences,
          source: 'captured',
          capturedWordId: cw.id,
          videoClipStart: ex.start ?? cw.source.videoClipStart,
          videoClipEnd: ex.end ?? cw.source.videoClipEnd,
        })
      }
    }

    if (sources.has('wordbook') && effectiveBookId) {
      const book = loadedBooks.get(effectiveBookId as WordBookId)
      if (book) {
        const sorted = [...book.entries].sort((a, b) => b.frequency - a.frequency)
        for (const entry of sorted.slice(0, 50)) {
          const key = entry.lemma.toLowerCase()
          if (itemMap.has(key)) continue
          const ex = findExample(entry.lemma)
          const dictEntry = combinedDict.get(key)
          itemMap.set(key, {
            spelling: entry.spelling,
            lemma: entry.lemma,
            phonetics: entry.phonetics,
            definition: cleanDef(entry.definition),
            senses: dictEntry?.senses,
            level: entry.level,
            exampleSentence: entry.exampleSentence,
            exampleTranslation: entry.exampleTranslation,
            videoSentence: ex.en,
            videoSentenceTranslation: ex.zh,
            phrases: entry.phrases,
            relatedWords: entry.relatedWords,
            synonyms: entry.synonyms,
            mnemonic: entry.mnemonic,
            examSentences: entry.examSentences,
            source: 'wordbook',
            videoClipStart: ex.start,
            videoClipEnd: ex.end,
          })
        }
      }
    }

    return shuffle([...itemMap.values()])
  }, [sources, matchSummary, combinedDict, capturedWords, loadedBooks, effectiveBookId, findExample])

  const buildReviewItems = useCallback((): MemorizeItem[] => {
    const items: MemorizeItem[] = []
    const seen = new Set<string>()
    for (const capturedWordId of reviewQueue) {
      const cw = capturedWords.find(w => w.id === capturedWordId)
      if (!cw) continue
      const key = cw.lemma.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const entry = combinedDict.get(key)
      const ex = findExample(cw.lemma)
      items.push({
        spelling: cw.spelling,
        lemma: cw.lemma,
        phonetics: entry?.phonetics ?? '',
        definition: cleanDef(entry?.definition),
        senses: entry?.senses,
        level: entry?.level,
        exampleSentence: entry?.exampleSentence,
        exampleTranslation: entry?.exampleTranslation,
        videoSentence: ex.en ?? cw.source.sentenceEn,
        videoSentenceTranslation: ex.zh ?? cw.source.sentenceZh,
        phrases: entry?.phrases,
        relatedWords: entry?.relatedWords,
        synonyms: entry?.synonyms,
        mnemonic: entry?.mnemonic,
        examSentences: entry?.examSentences,
        source: 'captured',
        capturedWordId: cw.id,
        videoClipStart: ex.start ?? cw.source.videoClipStart,
        videoClipEnd: ex.end ?? cw.source.videoClipEnd,
      })
    }
    return items
  }, [reviewQueue, capturedWords, combinedDict, findExample])

  const handleStartLearn = useCallback(() => {
    const items = buildLearnItems()
    if (items.length === 0) return
    const limited = items.slice(0, dailyLimit)
    const learnQueue: LearnQueueItem[] = limited.map(item => ({
      ...item,
      currentStage: 'choice' as LearnStage,
      stagesPassed: [],
    }))
    setQueue(learnQueue)
    initialQueueLengthRef.current = learnQueue.length
    setCompletedCount(0)
    setStagesCompleted(0)
    setAssessments([])
    setStepCounter(0)
    setLearnedFlash(null)
    setPendingDetail(null)
    setMode('learn')
    setPhase('learning')
  }, [buildLearnItems, dailyLimit])

  const handleStartReview = useCallback(() => {
    const items = buildReviewItems()
    if (items.length === 0) return
    const reviewQueue: LearnQueueItem[] = items.map(item => ({
      ...item,
      currentStage: 'bare' as LearnStage,
      stagesPassed: ['choice', 'context'],
    }))
    setQueue(reviewQueue)
    initialQueueLengthRef.current = reviewQueue.length
    setCompletedCount(0)
    setStagesCompleted(0)
    setAssessments([])
    setPendingDetail(null)
    setStepCounter(0)
    setLearnedFlash(null)
    setMode('review')
    setPhase('learning')
  }, [buildReviewItems])

  useEffect(() => {
    if (phase === 'learning' && queue.length === 0) {
      setPhase('results')
    }
  }, [phase, queue.length])

  const ensureCaptured = useCallback(async (item: MemorizeItem): Promise<string | undefined> => {
    if (item.capturedWordId) return item.capturedWordId
    const latest = useVocabStore.getState().capturedWords
    const existing = latest.find(w => w.lemma.toLowerCase() === item.lemma.toLowerCase())
    if (existing) return existing.id
    const sourceCtx = {
      videoId: 'memorize-learn',
      subtitleSegmentId: '',
      timestamp: Date.now() / 1000,
      sentenceEn: item.exampleSentence ?? '',
      sentenceZh: item.exampleTranslation ?? '',
      videoClipStart: item.videoClipStart ?? 0,
      videoClipEnd: item.videoClipEnd,
    }
    const newId = await captureWord(item.spelling, item.lemma, sourceCtx).catch(() => null)
    return newId ?? undefined
  }, [captureWord])

  const showLearnedFlash = useCallback((word: string) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setLearnedFlash(word)
    flashTimerRef.current = setTimeout(() => setLearnedFlash(null), 1500)
  }, [])

  const handleChoiceResult = useCallback(async (correct: boolean) => {
    const item = queue[0]
    if (!item || isAssessing) return
    setIsAssessing(true)
    try {
      if (correct) {
        const passed: LearnStage[] = [...item.stagesPassed, 'choice']
        setQueue(prev => [...prev.slice(1), { ...item, currentStage: 'context', stagesPassed: passed }])
        setStagesCompleted(c => c + 1)
      } else {
        setQueue(prev => [...prev.slice(1), { ...item, currentStage: 'choice', stagesPassed: item.stagesPassed }])
      }
      setStepCounter(c => c + 1)
    } finally {
      setIsAssessing(false)
    }
  }, [queue, isAssessing])

  const handleContextResult = useCallback(async (known: boolean) => {
    const item = queue[0]
    if (!item || isAssessing) return
    setIsAssessing(true)
    try {
      if (known) {
        const passed: LearnStage[] = [...item.stagesPassed, 'context']
        setQueue(prev => [...prev.slice(1), { ...item, currentStage: 'bare', stagesPassed: passed }])
        setStagesCompleted(c => c + 1)
      } else {
        setQueue(prev => [...prev.slice(1), { ...item, currentStage: 'context', stagesPassed: item.stagesPassed }])
      }
      setStepCounter(c => c + 1)
    } finally {
      setIsAssessing(false)
    }
  }, [queue, isAssessing])

  const handleBareResult = useCallback(async (known: boolean) => {
    const item = queue[0]
    if (!item || isAssessing) return
    setIsAssessing(true)
    try {
      if (known) {
        setAssessments(prev => [...prev, { item, result: 'known' }])
        setStagesCompleted(c => c + 1)
        const capturedId = await ensureCaptured(item)
        if (capturedId) {
          await initializeSchedule(capturedId, 'known').catch(() => {})
          await markWordAsLearned(capturedId).catch(() => {})
        }
        const today = getTodayStr()
        const key = `vocscreen_learned_${today}`
        const newCount = todayLearnedCount + 1
        localStorage.setItem(key, String(newCount))
        setTodayLearnedCount(newCount)
        setCompletedCount(c => c + 1)
        showLearnedFlash(item.spelling)
        setQueue(prev => prev.slice(1))
      } else {
        setQueue(prev => [...prev.slice(1), { ...item, currentStage: 'bare', stagesPassed: item.stagesPassed }])
      }
      setStepCounter(c => c + 1)
    } finally {
      setIsAssessing(false)
    }
  }, [queue, isAssessing, ensureCaptured, initializeSchedule, markWordAsLearned, todayLearnedCount, showLearnedFlash])

  const handleReviewDetailContinue = useCallback(async (known: boolean) => {
    const item = queue[0]
    if (!item || isAssessing) return
    setIsAssessing(true)
    setAssessments(prev => [...prev, { item, result: known ? 'known' : 'unknown' }])
    try {
      if (item.capturedWordId) {
        await recordReview(item.capturedWordId, known ? 'known' : 'unknown').catch(() => {})
        const updatedSched = useReviewStore.getState().schedules.get(item.capturedWordId)
        if (updatedSched?.status === 'mastered') {
          await markWordAsMastered(item.capturedWordId).catch(() => {})
        } else if (known) {
          await markWordAsLearned(item.capturedWordId).catch(() => {})
        }
      }
      setStagesCompleted(c => c + 1)
      setCompletedCount(c => c + 1)
      setQueue(prev => prev.slice(1))
      setStepCounter(c => c + 1)
    } finally {
      setIsAssessing(false)
    }
  }, [queue, isAssessing, recordReview, markWordAsMastered, markWordAsLearned])

  const onChoiceResult = useCallback((correct: boolean) => {
    if (isAssessing) return
    setPendingDetail({ result: correct, stage: 'choice', mode: 'learn' })
  }, [isAssessing])

  const onContextResult = useCallback((known: boolean) => {
    if (isAssessing) return
    setPendingDetail({ result: known, stage: 'context', mode: 'learn' })
  }, [isAssessing])

  const onBareResult = useCallback((known: boolean) => {
    if (isAssessing) return
    setPendingDetail({ result: known, stage: 'bare', mode: 'learn' })
  }, [isAssessing])

  const onReviewResult = useCallback((known: boolean) => {
    if (isAssessing) return
    setPendingDetail({ result: known, stage: 'bare', mode: 'review' })
  }, [isAssessing])

  const handleDetailContinue = useCallback(async () => {
    if (!pendingDetail || isAssessing) return
    const { result, stage, mode: detailMode } = pendingDetail
    if (detailMode === 'review') {
      await handleReviewDetailContinue(result)
    } else if (stage === 'choice') {
      await handleChoiceResult(result)
    } else if (stage === 'context') {
      await handleContextResult(result)
    } else {
      await handleBareResult(result)
    }
    setPendingDetail(null)
  }, [pendingDetail, isAssessing, handleReviewDetailContinue, handleChoiceResult, handleContextResult, handleBareResult])

  const handleBack = useCallback(() => {
    setAppScreen('app')
  }, [setAppScreen])

  const handleBackToHome = useCallback(() => {
    setPhase('home')
    getDueWords()
  }, [getDueWords])

  const handleDailyLimitChange = useCallback((limit: number) => {
    setDailyLimit(limit)
    localStorage.setItem(DAILY_LIMIT_KEY, String(limit))
  }, [])

  const totalInRound = initialQueueLengthRef.current || 1
  const totalStagesTarget = mode === 'learn' ? totalInRound * 3 : totalInRound
  const stageProgress = Math.min(100, (stagesCompleted / totalStagesTarget) * 100)
  const wordProgress = Math.min(100, (completedCount / totalInRound) * 100)

  const masteredCount = useMemo(() => {
    let count = 0
    for (const [, sched] of schedules) {
      if (sched.status === 'mastered') count++
    }
    return count
  }, [schedules])

  const totalLearnedCount = useMemo(() => {
    return capturedWords.filter(w => w.status !== 'new').length
  }, [capturedWords])

  const playClipHandler = useCallback(() => {
    const item = queue[0]
    if (item) setClipModalItem(item)
  }, [queue])

  // ---- Phase: Home ----
  if (phase === 'home') {
    return (
      <div className="w-full h-dvh bg-surface-0 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
          <button onClick={handleBack} className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors">
            <ArrowLeft size={18} weight="bold" />
          </button>
          <h1 className="text-sm font-semibold text-ink flex items-center gap-2">
            <GraduationCap size={18} className="text-purple" />
            背单词
          </h1>
          <div className="flex-1" />
          <button
            onClick={() => setShowQrModal(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border border-surface-border/40 text-sm hover:border-purple/30 hover:bg-surface-1/50 transition-colors"
            title="手机扫码背单词"
          >
            <QrCode size={16} />
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border border-surface-border/40 text-sm hover:border-purple/30 hover:bg-surface-1/50 transition-colors"
            title={theme === 'dark' ? '切换浅色主题' : '切换暗色主题'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-display font-semibold text-ink">今天学点什么？</h2>
              <p className="text-sm text-ink-muted">三阶段学习，科学复习</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-2 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-purple">{totalLearnedCount}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">已学</div>
              </div>
              <div className="bg-surface-2 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-accent-rose">{dueCount}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">待复习</div>
              </div>
              <div className="bg-surface-2 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-accent-green">{masteredCount}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">已掌握</div>
              </div>
            </div>

            <button
              onClick={() => setPhase('source-select')}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-purple/15 to-purple/5 border border-purple/30 hover:border-purple/50 hover:from-purple/20 hover:to-purple/10 transition-all group"
            >
              <div className="p-3 rounded-xl bg-purple/20 text-purple group-hover:scale-110 transition-transform">
                <Lightning size={28} weight="fill" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-base font-semibold text-ink">Learn · 学习新词</div>
                <div className="text-xs text-ink-muted mt-0.5">每日目标 {dailyLimit} 词 · 今日已学 {todayLearnedCount}</div>
              </div>
              <ArrowLeft size={18} weight="bold" className="text-purple rotate-180" />
            </button>

            <button
              onClick={handleStartReview}
              disabled={dueCount === 0}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-accent-green/15 to-accent-green/5 border border-accent-green/30 hover:border-accent-green/50 hover:from-accent-green/20 hover:to-accent-green/10 transition-all group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-accent-green/15 disabled:hover:to-accent-green/5"
            >
              <div className="p-3 rounded-xl bg-accent-green/20 text-accent-green group-hover:scale-110 transition-transform">
                <Clock size={28} weight="fill" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-base font-semibold text-ink">Review · 复习</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {dueCount > 0 ? `${dueCount} 个词到期复习` : '暂无到期词'}
                </div>
              </div>
              {dueCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-accent-rose text-white text-xs font-bold">
                  {dueCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-2 border border-surface-border">
              <Sparkle size={14} className="text-purple shrink-0" />
              <p className="text-[11px] text-ink-muted leading-relaxed">
                新词需通过选义→例句→裸词三阶段才算学会，自动纳入艾宾浩斯复习
              </p>
            </div>

            <button
              onClick={() => {
                if (!confirm('确定要清除所有本地数据？包括生词、复习计划、学习记录等，此操作不可撤销。')) return
                clearAllLocalData()
              }}
              className="flex items-center gap-1.5 mx-auto text-[11px] text-ink-muted/50 hover:text-accent-rose transition-colors py-1"
            >
              <Trash size={11} />
              清空本地数据
            </button>
          </div>
        </div>

        <Modal isOpen={showQrModal} onClose={() => setShowQrModal(false)}>
          <div className="w-[300px] max-w-[90vw] p-6 space-y-4 text-center">
            <h3 className="text-base font-semibold text-ink">手机扫码背单词</h3>
            <p className="text-xs text-ink-muted">用手机扫描下方二维码，直接进入背单词界面</p>
            <div className="w-40 h-40 mx-auto bg-white rounded-lg flex items-center justify-center p-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.origin + '/?screen=memorize')}`}
                alt="QR Code"
                className="w-full h-full"
                loading="lazy"
              />
            </div>
            <p className="text-[10px] text-ink-muted/70">登录同一账号即可同步进度</p>
          </div>
        </Modal>
      </div>
    )
  }

  // ---- Phase: Source Select ----
  if (phase === 'source-select') {
    const sourceOptions: { key: 'video' | 'captured' | 'wordbook'; label: string; icon: typeof VideoCamera; count: number; desc: string }[] = [
      { key: 'video', label: '视频中词汇', icon: VideoCamera, count: sourceCounts.video, desc: '当前视频字幕中匹配到的词书词汇' },
      { key: 'captured', label: '生词本', icon: Notebook, count: sourceCounts.captured, desc: '已捕获的生词（去重）' },
      { key: 'wordbook', label: '整本词书', icon: BookOpen, count: sourceCounts.wordbook, desc: '词书全部词汇，按频率取前50' },
    ]

    const toggleSource = (key: 'video' | 'captured' | 'wordbook') => {
      setSources(prev => {
        const next = new Set(prev)
        if (next.has(key)) {
          if (next.size > 1) next.delete(key)
        } else {
          next.add(key)
        }
        return next
      })
    }

    const totalAvailable = sourceOptions.reduce((sum, opt) => sources.has(opt.key) ? sum + opt.count : sum, 0)
    const willLearn = Math.min(totalAvailable, dailyLimit)

    return (
      <div className="w-full h-dvh bg-surface-0 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
          <button onClick={handleBackToHome} className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors">
            <ArrowLeft size={18} weight="bold" />
          </button>
          <h1 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Lightning size={18} className="text-purple" />
            Learn · 选择来源
          </h1>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-md space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-display font-semibold text-ink">选择背词来源</h2>
              <p className="text-sm text-ink-muted">可多选，视频词汇优先（含例句）</p>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-ink-muted">每日目标</div>
              <div className="flex gap-2">
                {[10, 15, 20].map(n => (
                  <button
                    key={n}
                    onClick={() => handleDailyLimitChange(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dailyLimit === n
                        ? 'bg-purple text-white'
                        : 'bg-surface-2 text-ink-dim hover:bg-surface-3'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-ink-muted">不强制，可超额学习</p>
            </div>

            <div className="space-y-2">
              {sourceOptions.map(opt => {
                const selected = sources.has(opt.key)
                const Icon = opt.icon
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleSource(opt.key)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                      selected
                        ? 'bg-purple/10 border-purple/40'
                        : 'bg-surface-2 border-surface-border hover:border-purple/20'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${selected ? 'bg-purple/20 text-purple' : 'bg-surface-3 text-ink-muted'}`}>
                      <Icon size={20} weight={selected ? 'fill' : 'regular'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{opt.label}</span>
                        <span className="text-xs text-ink-muted">{opt.count} 词</span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-0.5">{opt.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                      selected ? 'bg-purple border-purple' : 'border-surface-border'
                    }`}>
                      {selected && <Check size={12} weight="bold" className="text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleStartLearn}
                disabled={totalAvailable === 0}
                className="w-full py-3 rounded-xl bg-purple text-white text-sm font-semibold hover:bg-purple-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                开始学习（{willLearn} 词）
              </button>
              <button
                onClick={handleBackToHome}
                className="w-full py-2 text-xs text-ink-muted hover:text-ink transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Phase: Learning ----
  if (phase === 'learning') {
    const item = queue[0]
    if (!item) return null

    const stage = item.currentStage
    const modeLabel = mode === 'learn' ? 'Learn' : 'Review'
    const ModeIcon = mode === 'learn' ? Lightning : Clock
    const modeColor = mode === 'learn' ? 'text-purple' : 'text-accent-green'
    const stageText = stage === 'choice' ? '选义 1/3' : stage === 'context' ? '例句 2/3' : stage === 'bare' ? '裸词 3/3' : '完成'
    const stageLabel = mode === 'learn'
      ? `${completedCount}/${totalInRound} 已学 · ${stageText}`
      : `${completedCount}/${totalInRound} 已复习`

    return (
      <div className="w-full h-dvh bg-surface-0 flex flex-col relative">
        {learnedFlash && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-accent-green/20 border border-accent-green/40 backdrop-blur-sm animate-pulse">
            <span className="text-sm text-accent-green font-medium">✓ 已学习「{learnedFlash}」· 已纳入复习</span>
          </div>
        )}

        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft size={18} weight="bold" />
          </button>
          <h1 className="text-sm font-semibold text-ink flex items-center gap-2">
            <ModeIcon size={18} className={modeColor} weight="fill" />
            {modeLabel}
          </h1>
          <div className="flex-1" />
          <span className="text-xs text-ink-muted">{stageLabel}</span>
        </div>

        <div className="px-5 py-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ink-muted w-8">单词</span>
            <div className="memorize-progress-track flex-1">
              <div className="memorize-progress-fill" style={{ width: `${wordProgress}%` }} />
            </div>
            <span className="text-[10px] text-ink-muted w-8 text-right">{Math.round(wordProgress)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ink-muted w-8">阶段</span>
            <div className="memorize-progress-track flex-1" style={{ height: '4px' }}>
              <div className="memorize-progress-fill" style={{ width: `${stageProgress}%`, background: 'var(--color-purple)' }} />
            </div>
            <span className="text-[10px] text-ink-muted w-8 text-right">{stagesCompleted}/{totalStagesTarget}</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          {pendingDetail ? (
            <WordDetailView
              key={`detail-${stepCounter}`}
              item={item}
              result={pendingDetail.result}
              stage={pendingDetail.stage}
              mode={pendingDetail.mode}
              assessing={isAssessing}
              onContinue={handleDetailContinue}
              onPlayClip={videoBlobUrl && item.videoClipStart !== undefined ? playClipHandler : undefined}
            />
          ) : mode === 'learn' && stage === 'choice' ? (
            <ChoiceStage key={`choice-${stepCounter}`} item={item} onResult={onChoiceResult} />
          ) : mode === 'learn' && stage === 'context' ? (
            <ContextStage
              key={`context-${stepCounter}`}
              item={item}
              onResult={onContextResult}
              onPlayClip={videoBlobUrl && item.videoClipStart !== undefined ? playClipHandler : undefined}
            />
          ) : mode === 'learn' && stage === 'bare' ? (
            <BareStage key={`bare-${stepCounter}`} item={item} onResult={onBareResult} revealOnFail={false} />
          ) : mode === 'review' ? (
            <BareStage key={`review-${stepCounter}`} item={item} onResult={onReviewResult} revealOnFail={false} />
          ) : null}
        </div>

        <Modal isOpen={showExitConfirm} onClose={() => setShowExitConfirm(false)}>
          <div className="w-[340px] max-w-[90vw] p-5 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 flex items-center justify-center">
              <Warning size={24} className="text-amber-400" weight="bold" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-ink">确定退出？</h3>
              <p className="text-xs text-ink-muted">已学会的词已保存，未完成的词需重新学习</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-surface-2 text-sm text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors"
              >
                继续
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); handleBack() }}
                className="flex-1 py-2 rounded-lg bg-accent-rose text-white text-sm font-medium hover:bg-accent-rose/90 transition-colors"
              >
                退出
              </button>
            </div>
          </div>
        </Modal>

        {clipModalItem && clipModalItem.videoClipStart !== undefined && clipModalItem.videoClipEnd !== undefined && videoBlobUrl && (
          <VideoClipModal
            videoUrl={videoBlobUrl}
            clipStart={clipModalItem.videoClipStart}
            clipEnd={clipModalItem.videoClipEnd}
            sentenceEn={clipModalItem.videoSentence}
            sentenceZh={clipModalItem.videoSentenceTranslation}
            hideTranslation={!pendingDetail}
            onClose={() => setClipModalItem(null)}
          />
        )}
      </div>
    )
  }

  // ---- Phase: Results ----
  const totalUnique = new Set(assessments.map(a => a.item.lemma.toLowerCase())).size
  const finalKnown = assessments.filter(a => a.result === 'known').length
  const finalUnknown = assessments.filter(a => a.result === 'unknown').length

  const modeLabel = mode === 'learn' ? '学习' : '复习'

  return (
    <div className="w-full h-dvh bg-surface-0 flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
        <button onClick={handleBackToHome} className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors">
          <ArrowLeft size={18} weight="bold" />
        </button>
        <h1 className="text-sm font-semibold text-ink flex items-center gap-2">
          <GraduationCap size={18} className="text-purple" />
          {modeLabel}完成
        </h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <div className="text-5xl">
              {finalUnknown === 0 ? '🎉' : '📊'}
            </div>
            <h2 className="text-xl font-display font-semibold text-ink">
              {finalUnknown === 0 ? '全部掌握！' : `本轮${modeLabel}完成`}
            </h2>
            <p className="text-sm text-ink-muted">共{modeLabel}了 {totalUnique} 个词</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-2 rounded-xl p-4">
              <div className="text-2xl font-bold text-accent-green">{finalKnown}</div>
              <div className="text-[11px] text-ink-muted mt-0.5">认识</div>
            </div>
            <div className="bg-surface-2 rounded-xl p-4">
              <div className="text-2xl font-bold text-accent-rose">{finalUnknown}</div>
              <div className="text-[11px] text-ink-muted mt-0.5">不认识</div>
            </div>
          </div>

          <div className="px-4">
            <div className="memorize-progress-track" style={{ height: '8px' }}>
              <div className="memorize-progress-fill" style={{ width: `${totalUnique > 0 ? (finalKnown / totalUnique) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-ink-muted mt-2">
              掌握率 {totalUnique > 0 ? Math.round((finalKnown / totalUnique) * 100) : 0}%
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleBackToHome}
              className="w-full py-2.5 rounded-xl bg-purple text-white text-sm font-semibold hover:bg-purple-bright transition-colors"
            >
              返回主页
            </button>
            <button
              onClick={handleBack}
              className="w-full py-2 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              退出背单词
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
