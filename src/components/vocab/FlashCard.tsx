import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { CapturedWord, MasteryResult } from '../../types'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { PlayCircle, ArrowArcRight } from '@phosphor-icons/react'

interface FlashCardProps {
  word: CapturedWord
  mode: 'learn' | 'review'
  lastReviewAt?: number
  onMastery: (result: MasteryResult) => void
}

export function FlashCard({ word, mode, lastReviewAt, onMastery }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const seek = usePlayerStore((s) => s.seek)

  const entry = useVocabStore.getState().lookupWord(word.lemma)
  const definition = entry?.definition ?? '释义暂缺'
  const level = entry?.level ?? ''

  const levelLabel = (lvl: string) => {
    const map: Record<string, string> = { CET4: '四级', CET6: '六级', IELTS: '雅思', TOEFL: '托福' }
    return map[lvl] || lvl
  }

  const handleFlip = useCallback(() => {
    setIsFlipped((f) => !f)
  }, [])

  const handleViewClip = useCallback(() => {
    const player = usePlayerStore.getState()
    if (player.hasVideo) {
      seek(word.source.videoClipStart)
      player.play()
    }
  }, [seek, word.source.videoClipStart])

  const handleMastery = useCallback(
    (result: MasteryResult) => {
      onMastery(result)
      setIsFlipped(false)
    },
    [onMastery]
  )

  return (
    <div className="flex flex-col gap-4 px-4">
      <AnimatePresence mode="wait">
        {!isFlipped ? (
          <motion.div
            key="front"
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center py-12 px-6 bg-surface-2 rounded-2xl border border-surface-border cursor-pointer"
            onClick={handleFlip}
          >
            <span className="text-3xl font-display font-semibold text-ink tracking-tight">
              {word.spelling}
            </span>
            <span className="text-xs text-ink-muted mt-3">
              {mode === 'learn' ? '点击翻转查看释义' : '点击翻转回忆含义'}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4 p-6 bg-surface-2 rounded-2xl border border-surface-border"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-display font-semibold text-ink">{word.spelling}</h3>
                {level && (
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-purple/15 text-purple border border-purple/20">
                    {levelLabel(level)}词汇
                  </span>
                )}
              </div>
              <p className="text-base text-ink-dim leading-relaxed mt-3">
                {definition}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleViewClip}
                className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-surface-3 text-sm text-ink-dim hover:text-purple transition-colors"
              >
                <PlayCircle size={16} weight="fill" />
                看原片段
              </button>
              <span className="text-xs text-ink-muted">
                {word.source.sentenceEn}
              </span>
            </div>

            {mode === 'review' && lastReviewAt && (
              <p className="text-xs text-ink-muted">
                上次复习：{Math.floor((Date.now() - lastReviewAt) / 86400000)}天前
              </p>
            )}

            <button
              onClick={() => handleFlip()}
              className="flex items-center gap-1.5 text-xs text-ink-dim hover:text-ink transition-colors"
            >
              <ArrowArcRight size={14} />
              翻回正面
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isFlipped && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 justify-center"
        >
          {([
            { key: 'known', label: '认识', className: 'bg-accent-green/15 text-accent-green hover:bg-accent-green/25 border-accent-green/25' },
            { key: 'fuzzy', label: '模糊', className: 'bg-purple/15 text-purple hover:bg-purple/25 border-purple/25' },
            { key: 'unknown', label: '不认识', className: 'bg-accent-rose/15 text-accent-rose hover:bg-accent-rose/25 border-accent-rose/25' },
          ] as const).map((btn) => (
            <button
              key={btn.key}
              onClick={() => handleMastery(btn.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${btn.className}`}
            >
              {btn.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}