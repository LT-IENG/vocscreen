import { useState, useCallback } from 'react'
import { Drawer } from '../ui/Drawer'
import { FlashCard } from './FlashCard'
import { useUIStore } from '../../stores/useUIStore'
import { useReviewStore } from '../../stores/useReviewStore'
import { useVocabStore } from '../../stores/useVocabStore'
import type { MasteryResult } from '../../types'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

export function ReviewPanel() {
  const activePanel = useUIStore((s) => s.activePanel)
  const closePanel = useUIStore((s) => s.closePanel)
  const { reviewQueue, dueCount, recordReview, schedules } = useReviewStore()
  const capturedWords = useVocabStore((s) => s.capturedWords)
  const [currentIndex, setCurrentIndex] = useState(0)

  const dueWords = capturedWords.filter((w) => reviewQueue.includes(w.id))

  const handleMastery = useCallback(
    async (result: MasteryResult) => {
      const word = dueWords[currentIndex]
      if (!word) return
      await recordReview(word.id, result)
      if (currentIndex < dueWords.length - 1) {
        setCurrentIndex((i) => i + 1)
      } else {
        setCurrentIndex(0)
      }
    },
    [currentIndex, dueWords, recordReview]
  )

  return (
    <Drawer isOpen={activePanel === 'review'} onClose={closePanel} width={400}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-ink">复习队列</h2>
          <span className="text-xs text-ink-muted">{dueCount} 个待复习</span>
        </div>

        {dueWords.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <p className="text-ink-dim text-sm">暂无待复习词汇</p>
              <p className="text-ink-muted text-xs">捕获新词并完成首次学习后，将自动排入复习队列</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-center justify-center py-8">
              <FlashCard
                word={dueWords[currentIndex]}
                mode="review"
                lastReviewAt={schedules.get(dueWords[currentIndex]?.id)?.lastReviewAt ?? undefined}
                onMastery={handleMastery}
              />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-surface-border">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="p-1.5 rounded-md text-ink-dim hover:text-ink disabled:opacity-30 transition-colors"
              >
                <CaretLeft size={18} weight="bold" />
              </button>
              <span className="text-xs text-ink-muted font-mono tabular-nums">
                {currentIndex + 1} / {dueWords.length}
              </span>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(dueWords.length - 1, i + 1))}
                disabled={currentIndex === dueWords.length - 1}
                className="p-1.5 rounded-md text-ink-dim hover:text-ink disabled:opacity-30 transition-colors"
              >
                <CaretRight size={18} weight="bold" />
              </button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}