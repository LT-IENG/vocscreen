import { useState, useCallback } from 'react'
import { Modal } from '../ui/Modal'
import { FlashCard } from './FlashCard'
import { useUIStore } from '../../stores/useUIStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { useReviewStore } from '../../stores/useReviewStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import type { MasteryResult } from '../../types'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

export function LearningModal() {
  const isOpen = useUIStore((s) => s.isLearningModalOpen)
  const closeModal = useUIStore((s) => s.closeLearningModal)
  const capturedWords = useVocabStore((s) => s.capturedWords)
  const markWordAsLearned = useVocabStore((s) => s.markWordAsLearned)
  const initializeSchedule = useReviewStore((s) => s.initializeSchedule)
  const matchSummary = useSubtitleStore((s) => s.matchSummary)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  const newWords = capturedWords.filter((w) => w.status === 'new')

  const handleStartLearning = () => {
    setHasStarted(true)
    setCurrentIndex(0)
  }

  const handleMastery = useCallback(
    async (result: MasteryResult) => {
      const word = newWords[currentIndex]
      if (!word) return
      await markWordAsLearned(word.id)
      await initializeSchedule(word.id, result)
      if (currentIndex < newWords.length - 1) setCurrentIndex((i) => i + 1)
    },
    [currentIndex, newWords, markWordAsLearned, initializeSchedule]
  )

  const handleClose = () => {
    setHasStarted(false)
    setCurrentIndex(0)
    closeModal()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="w-[480px] max-w-[90vw] p-6">
        {!hasStarted ? (
          <div className="text-center space-y-4 py-4">
            <span className="text-4xl">🎬</span>
            <div>
              <p className="text-lg font-semibold text-ink">
                本集匹配到 {matchSummary?.totalMatches ?? 0} 个{matchSummary?.bookName ?? '六级'}词汇
              </p>
              <p className="text-sm text-ink-dim mt-1">
                你关注了其中的 {newWords.length} 个
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={handleStartLearning}
                disabled={newWords.length === 0}
                className="px-6 py-2.5 rounded-lg bg-purple text-surface-0 font-medium text-sm hover:bg-purple-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                看看这 {newWords.length} 个词
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-2 rounded-lg text-sm text-ink-dim hover:text-ink transition-colors"
              >
                稍后再说
              </button>
            </div>
          </div>
        ) : currentIndex < newWords.length ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-ink-muted font-mono tabular-nums">
                {currentIndex + 1} / {newWords.length}
              </span>
              <span className="text-xs text-purple">新词学习</span>
            </div>
            <FlashCard
              word={newWords[currentIndex]}
              mode="learn"
              onMastery={handleMastery}
            />
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="p-1.5 rounded-md text-ink-dim hover:text-ink disabled:opacity-30 transition-colors"
              >
                <CaretLeft size={18} weight="bold" />
              </button>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(newWords.length - 1, i + 1))}
                disabled={currentIndex === newWords.length - 1}
                className="p-1.5 rounded-md text-ink-dim hover:text-ink disabled:opacity-30 transition-colors"
              >
                <CaretRight size={18} weight="bold" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 py-6">
            <span className="text-4xl">✅</span>
            <p className="text-lg font-semibold text-ink">全部学完</p>
            <p className="text-sm text-ink-dim">已排入复习队列，明天开始按遗忘曲线复习</p>
            <button
              onClick={handleClose}
              className="px-6 py-2 rounded-lg bg-surface-2 text-sm text-ink-dim hover:text-ink transition-colors"
            >
              完成
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}