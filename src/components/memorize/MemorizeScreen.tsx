import { useState, useCallback, useMemo, useEffect } from 'react'
import { useUIStore } from '../../stores/useUIStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useReviewStore } from '../../stores/useReviewStore'
import { MemorizeCardView } from './MemorizeCardView'
import type { MasteryResult, WordBookId } from '../../types'
import type { DictSense } from '../../stores/useUIStore'
import {
  ArrowLeft, GraduationCap, Check, X, Repeat, VideoCamera,
  BookOpen, Notebook, Lightning, Clock, Sparkle,
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
  source: 'video' | 'captured' | 'wordbook'
  capturedWordId?: string
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

export function MemorizeScreen() {
  const setAppScreen = useUIStore((s) => s.setAppScreen)
  const selectedWordBookId = useUIStore((s) => s.selectedWordBookId)

  const combinedDict = useVocabStore((s) => s.combinedDict)
  const loadedBooks = useVocabStore((s) => s.loadedBooks)
  const capturedWords = useVocabStore((s) => s.capturedWords)
  const captureWord = useVocabStore((s) => s.captureWord)
  const segments = useSubtitleStore((s) => s.segments)
  const matchSummary = useSubtitleStore((s) => s.matchSummary)

  const schedules = useReviewStore((s) => s.schedules)
  const reviewQueue = useReviewStore((s) => s.reviewQueue)
  const dueCount = useReviewStore((s) => s.dueCount)
  const getDueWords = useReviewStore((s) => s.getDueWords)
  const initializeSchedule = useReviewStore((s) => s.initializeSchedule)
  const recordReview = useReviewStore((s) => s.recordReview)

  const [phase, setPhase] = useState<Phase>('home')
  const [mode, setMode] = useState<Mode>('learn')
  const [sources, setSources] = useState<Set<'video' | 'captured' | 'wordbook'>>(new Set(['video']))
  const [queue, setQueue] = useState<MemorizeItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([])

  // Refresh due words when entering screen
  useEffect(() => {
    getDueWords()
  }, [getDueWords])

  // Build items from each source
  const sourceCounts = useMemo(() => {
    const videoWords = matchSummary?.matchList ?? []
    const videoCount = videoWords.length

    const capturedLemmas = new Set(capturedWords.map(w => w.lemma.toLowerCase()))
    const capturedCount = capturedLemmas.size

    const book = selectedWordBookId
      ? loadedBooks.get(selectedWordBookId as WordBookId)
      : undefined
    const wordbookCount = book ? book.entries.length : 0

    return { video: videoCount, captured: capturedCount, wordbook: wordbookCount }
  }, [matchSummary, capturedWords, loadedBooks, selectedWordBookId])

  const findExample = useCallback((lemma: string): { en?: string; zh?: string } => {
    const lower = lemma.toLowerCase()
    for (const seg of segments) {
      const words = seg.textEn.toLowerCase().split(/[^a-z']+/)
      if (words.includes(lower) || seg.highlightedWords?.some(hw => hw.lemma === lemma)) {
        return { en: seg.textEn, zh: seg.textZh }
      }
    }
    return {}
  }, [segments])

  const buildLearnItems = useCallback((): MemorizeItem[] => {
    const itemMap = new Map<string, MemorizeItem>()

    // Source 1: Video words (highest priority)
    if (sources.has('video') && matchSummary) {
      for (const lemma of matchSummary.matchList) {
        const entry = combinedDict.get(lemma.toLowerCase())
        if (!entry) continue
        const ex = findExample(lemma)
        itemMap.set(lemma.toLowerCase(), {
          spelling: entry.spelling,
          lemma: entry.lemma,
          phonetics: entry.phonetics,
          definition: entry.definition,
          senses: entry.senses,
          level: entry.level,
          exampleSentence: ex.en,
          exampleTranslation: ex.zh,
          source: 'video',
        })
      }
    }

    // Source 2: Captured words
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
          definition: entry?.definition ?? '释义暂缺',
          senses: entry?.senses,
          level: entry?.level,
          exampleSentence: ex.en,
          exampleTranslation: ex.zh,
          source: 'captured',
          capturedWordId: cw.id,
        })
      }
    }

    // Source 3: Full wordbook (limit 50 by frequency)
    if (sources.has('wordbook') && selectedWordBookId) {
      const book = loadedBooks.get(selectedWordBookId as WordBookId)
      if (book) {
        const sorted = [...book.entries].sort((a, b) => b.frequency - a.frequency)
        for (const entry of sorted.slice(0, 50)) {
          const key = entry.lemma.toLowerCase()
          if (itemMap.has(key)) continue
          itemMap.set(key, {
            spelling: entry.spelling,
            lemma: entry.lemma,
            phonetics: entry.phonetics,
            definition: entry.definition,
            level: entry.level,
            source: 'wordbook',
          })
        }
      }
    }

    return shuffle([...itemMap.values()])
  }, [sources, matchSummary, combinedDict, capturedWords, loadedBooks, selectedWordBookId, findExample])

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
        definition: entry?.definition ?? '释义暂缺',
        senses: entry?.senses,
        level: entry?.level,
        exampleSentence: ex.en,
        exampleTranslation: ex.zh,
        source: 'captured',
        capturedWordId: cw.id,
      })
    }
    return items
  }, [reviewQueue, capturedWords, combinedDict, findExample])

  const handleStartLearn = useCallback(() => {
    const items = buildLearnItems()
    if (items.length === 0) return
    setQueue(items)
    setCurrentIndex(0)
    setAssessments([])
    setMode('learn')
    setPhase('learning')
  }, [buildLearnItems])

  const handleStartReview = useCallback(() => {
    const items = buildReviewItems()
    if (items.length === 0) return
    setQueue(items)
    setCurrentIndex(0)
    setAssessments([])
    setMode('review')
    setPhase('learning')
  }, [buildReviewItems])

  const handleAssess = useCallback(async (result: MasteryResult) => {
    const item = queue[currentIndex]
    if (!item) return

    setAssessments(prev => [...prev, { item, result }])

    // In review mode, record to review store
    if (mode === 'review' && item.capturedWordId) {
      await recordReview(item.capturedWordId, result)
    } else if (mode === 'learn') {
      // In learn mode, ensure the word is captured and has a schedule
      let capturedId = item.capturedWordId
      if (!capturedId) {
        // Try to find existing captured word by lemma
        const existing = capturedWords.find(w => w.lemma.toLowerCase() === item.lemma.toLowerCase())
        if (existing) {
          capturedId = existing.id
        } else {
          // Capture the word with a minimal source context
          const sourceCtx = {
            videoId: 'memorize-learn',
            subtitleSegmentId: '',
            timestamp: Date.now() / 1000,
            sentenceEn: item.exampleSentence ?? '',
            sentenceZh: item.exampleTranslation ?? '',
            videoClipStart: 0,
          }
          await captureWord(item.spelling, item.lemma, sourceCtx)
          // Get the newly captured word's id
          const state = useVocabStore.getState()
          const newlyCaptured = state.capturedWords.find(
            w => w.lemma.toLowerCase() === item.lemma.toLowerCase() && w.source.videoId === 'memorize-learn'
          )
          capturedId = newlyCaptured?.id
        }
      }
      // Initialize review schedule (if not already exists)
      if (capturedId && !schedules.has(capturedId)) {
        await initializeSchedule(capturedId, result)
      }
    }

    // If unknown/fuzzy in learn mode, re-queue at end
    let newQueue = queue
    if (mode === 'learn' && (result === 'unknown' || result === 'fuzzy')) {
      newQueue = [...queue, item]
      setQueue(newQueue)
    }

    // Advance
    if (currentIndex < newQueue.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setPhase('results')
    }
  }, [queue, currentIndex, mode, capturedWords, captureWord, schedules, initializeSchedule, recordReview])

  const handleRetryUnknown = useCallback(() => {
    const unknownItems = assessments
      .filter(a => a.result !== 'known')
      .map(a => a.item)
    const seen = new Set<string>()
    const unique = unknownItems.filter(item => {
      const key = item.lemma.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    if (unique.length === 0) {
      setPhase('home')
      return
    }
    setQueue(shuffle(unique))
    setCurrentIndex(0)
    setAssessments([])
    setPhase('learning')
  }, [assessments])

  const handleBack = useCallback(() => {
    setAppScreen('app')
  }, [setAppScreen])

  const handleBackToHome = useCallback(() => {
    setPhase('home')
    getDueWords()
  }, [getDueWords])

  // Stats during learning
  const totalInRound = queue.length
  const knownCount = assessments.filter(a => a.result === 'known').length
  const fuzzyCount = assessments.filter(a => a.result === 'fuzzy').length
  const unknownCount = assessments.filter(a => a.result === 'unknown').length
  const progress = totalInRound > 0 ? (assessments.length / totalInRound) * 100 : 0

  // Mastered count (for home screen stats)
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

  // ---- Phase: Home (Learn/Review dual entry) ----
  if (phase === 'home') {
    return (
      <div className="w-full h-dvh bg-surface-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
          <button onClick={handleBack} className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors">
            <ArrowLeft size={18} weight="bold" />
          </button>
          <h1 className="text-sm font-semibold text-ink flex items-center gap-2">
            <GraduationCap size={18} className="text-purple" />
            背单词
          </h1>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            {/* Title */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-display font-semibold text-ink">今天学点什么？</h2>
              <p className="text-sm text-ink-muted">学习新词，复习旧词</p>
            </div>

            {/* Stats row */}
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

            {/* Learn entry */}
            <button
              onClick={() => setPhase('source-select')}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-purple/15 to-purple/5 border border-purple/30 hover:border-purple/50 hover:from-purple/20 hover:to-purple/10 transition-all group"
            >
              <div className="p-3 rounded-xl bg-purple/20 text-purple group-hover:scale-110 transition-transform">
                <Lightning size={28} weight="fill" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-base font-semibold text-ink">Learn · 学习新词</div>
                <div className="text-xs text-ink-muted mt-0.5">自由背词，不限数量</div>
              </div>
              <ArrowLeft size={18} weight="bold" className="text-purple rotate-180" />
            </button>

            {/* Review entry */}
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

            {/* Tip */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-2 border border-surface-border">
              <Sparkle size={14} className="text-purple shrink-0" />
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Learn 的词会自动加入 Review 复习队列，按艾宾浩斯曲线安排下次复习时间
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Phase: Source Select (Learn mode only) ----
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

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-display font-semibold text-ink">选择背词来源</h2>
              <p className="text-sm text-ink-muted">可多选，视频词汇优先（含例句）</p>
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
                开始学习（{totalAvailable} 词）
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
    const item = queue[currentIndex]

    if (!item) {
      setPhase('results')
      return null
    }

    const modeLabel = mode === 'learn' ? 'Learn' : 'Review'
    const ModeIcon = mode === 'learn' ? Lightning : Clock
    const modeColor = mode === 'learn' ? 'text-purple' : 'text-accent-green'

    return (
      <div className="w-full h-dvh bg-surface-0 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
          <button
            onClick={() => {
              if (confirm('确定退出？进度不会保存。')) handleBack()
            }}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft size={18} weight="bold" />
          </button>
          <h1 className="text-sm font-semibold text-ink flex items-center gap-2">
            <ModeIcon size={18} className={modeColor} weight="fill" />
            {modeLabel}
          </h1>
          <div className="flex-1" />
          <span className="text-xs text-ink-muted">
            认识 {knownCount} · 模糊 {fuzzyCount} · 不认识 {unknownCount}
          </span>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-2">
          <div className="memorize-progress-track">
            <div className="memorize-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 flex items-center justify-center p-6">
          <MemorizeCardView
            key={`${item.lemma}-${currentIndex}`}
            item={item}
            index={currentIndex}
            total={totalInRound}
            onAssess={handleAssess}
            mode={mode}
          />
        </div>
      </div>
    )
  }

  // ---- Phase: Results ----
  const totalUnique = new Set(assessments.map(a => a.item.lemma.toLowerCase())).size
  const finalKnown = assessments.filter(a => a.result === 'known').length
  const finalFuzzy = assessments.filter(a => a.result === 'fuzzy').length
  const finalUnknown = assessments.filter(a => a.result === 'unknown').length
  const uniqueUnknownLemmas = new Set(
    assessments.filter(a => a.result !== 'known').map(a => a.item.lemma.toLowerCase())
  )

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

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-2 rounded-xl p-4">
                <div className="text-2xl font-bold text-accent-green">{finalKnown}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">认识</div>
              </div>
              <div className="bg-surface-2 rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-400">{finalFuzzy}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">模糊</div>
              </div>
              <div className="bg-surface-2 rounded-xl p-4">
                <div className="text-2xl font-bold text-accent-rose">{finalUnknown}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">不认识</div>
              </div>
            </div>

            {/* Progress ring */}
            <div className="px-4">
              <div className="memorize-progress-track" style={{ height: '8px' }}>
                <div className="memorize-progress-fill" style={{ width: `${totalUnique > 0 ? (finalKnown / totalUnique) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-ink-muted mt-2">
                掌握率 {totalUnique > 0 ? Math.round((finalKnown / totalUnique) * 100) : 0}%
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              {mode === 'learn' && uniqueUnknownLemmas.size > 0 && (
                <button
                  onClick={handleRetryUnknown}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-purple text-white text-sm font-semibold hover:bg-purple-bright transition-colors"
                >
                  <Repeat size={16} weight="bold" />
                  再背不认识的（{uniqueUnknownLemmas.size} 词）
                </button>
              )}
              <button
                onClick={handleBackToHome}
                className="w-full py-2.5 rounded-xl bg-surface-2 text-sm text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors"
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
