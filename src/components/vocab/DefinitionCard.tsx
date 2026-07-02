import { useUIStore } from '../../stores/useUIStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { X, BookmarkSimple, Trash } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'

const CARD_W = 300
const CARD_MAX_H = 340
const HEADER_H = 56
const FOOTER_H = 88

export function DefinitionCard() {
  const card = useUIStore((s) => s.definitionCard)
  const hideDefinition = useUIStore((s) => s.hideDefinition)
  const captureWord = useVocabStore((s) => s.captureWord)
  const removeCapturedWord = useVocabStore((s) => s.removeCapturedWord)
  const capturedWords = useVocabStore((s) => s.capturedWords)
  const seek = usePlayerStore((s) => s.seek)
  const videoId = usePlayerStore((s) => s.videoId)

  const [visible, setVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })

  useEffect(() => {
    if (card) {
      const left = Math.max(8, Math.min(card.position.x - CARD_W / 2, window.innerWidth - CARD_W - 8))
      const top = card.position.y - CARD_MAX_H - 12 > 8
        ? card.position.y - CARD_MAX_H - 12
        : card.position.y + 20
      setPos({ left, top })
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [card])

  const isCaptured = card
    ? capturedWords.some(
        (w) => w.spelling === card.word && w.source.subtitleSegmentId === card.segmentId
      )
    : false

  const handleCapture = async () => {
    if (!card) return
    const currentTime = usePlayerStore.getState().currentTime
    await captureWord(card.word, card.lemma, {
      videoId: videoId || 'unknown',
      subtitleSegmentId: card.segmentId,
      timestamp: currentTime,
      sentenceEn: '',
      sentenceZh: '',
      videoClipStart: Math.max(0, currentTime - 2),
    })
  }

  const handleRemove = async () => {
    if (!card) return
    const captured = capturedWords.find(
      (w) => w.spelling === card.word && w.source.subtitleSegmentId === card.segmentId
    )
    if (captured) await removeCapturedWord(captured.id)
  }

  const handleViewClip = () => {
    if (!card) return
    const captured = capturedWords.find(
      (w) => w.spelling === card.word && w.source.subtitleSegmentId === card.segmentId
    )
    if (captured) {
      seek(captured.source.timestamp)
      useUIStore.getState().setMode('play')
      hideDefinition()
      setTimeout(() => usePlayerStore.getState().play(), 200)
    }
  }

  const levelLabel = (lvl: string) => {
    const map: Record<string, string> = { CET4: '四级', CET6: '六级', IELTS: '雅思', TOEFL: '托福' }
    return map[lvl] || lvl
  }

  if (!card && !visible) return null

  return (
    <div
      ref={cardRef}
      className="fixed z-50 bg-surface-1 border border-surface-border rounded-xl shadow-modal flex flex-col overflow-hidden"
      style={{
        left: pos.left,
        top: pos.top,
        width: CARD_W,
        maxHeight: CARD_MAX_H,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.95)',
        transformOrigin: 'bottom center',
        transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
      }}
    >
      {/* Fixed header — word + phonetics + close */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-surface-border/50 shrink-0">
        <div className="min-w-0">
          <h3 className="text-xl font-display font-semibold text-ink truncate">{card?.word}</h3>
          {card?.phonetics && (
            <p className="text-sm text-ink-muted font-mono mt-0.5 truncate">{card.phonetics}</p>
          )}
        </div>
        <button
          onClick={hideDefinition}
          className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors shrink-0"
          aria-label="关闭"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* Scrollable senses area — no visible scrollbar */}
      <div
        className="flex-1 overflow-y-auto px-4 py-2.5 defcard-scroll"
        style={{ maxHeight: CARD_MAX_H - HEADER_H - FOOTER_H }}
      >
        {card?.senses && card.senses.length > 0 ? (
          <div className="space-y-2">
            {card.senses.map((sense, i) => (
              <div key={i} className="text-sm leading-relaxed">
                {sense.pos && (
                  <span className="inline-block text-[10px] font-mono text-purple bg-purple/10 px-1 py-0.5 rounded mr-1.5 align-middle">
                    {sense.pos}
                  </span>
                )}
                <span className="text-ink-dim">{sense.definition}</span>
                {sense.example && (
                  <span className="block text-xs text-ink-muted mt-0.5 pl-1.5 border-l border-surface-border">
                    {sense.example}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : card?.status === 'loading' ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <span className="inline-block w-3 h-3 border-2 border-purple/30 border-t-purple rounded-full animate-spin" />
            正在查询词典...
          </div>
        ) : card?.status === 'failed' ? (
          <p className="text-sm text-ink-muted">
            词典查询失败，该词可能不在词典中
          </p>
        ) : (
          <p className="text-sm text-ink-dim leading-relaxed">
            {card?.definition || '释义暂缺'}
          </p>
        )}

        {/* Tags row inside scroll area */}
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-surface-border/30">
          {card?.level && (
            <span className="inline-block text-[11px] px-1.5 py-0.5 rounded-md bg-purple/15 text-purple border border-purple/20">
              {levelLabel(card.level)} 词汇
            </span>
          )}
          {!card?.level && card?.status === 'api' && (
            <span className="inline-block text-[11px] px-1.5 py-0.5 rounded-md bg-surface-2 text-ink-muted border border-surface-border">
              词典查询
            </span>
          )}
          {!card?.level && card?.status === 'loading' && (
            <span className="inline-block text-[11px] px-1.5 py-0.5 rounded-md bg-surface-2 text-ink-muted border border-surface-border">
              查询中...
            </span>
          )}
          {!card?.level && card?.status === 'failed' && (
            <span className="inline-block text-[11px] px-1.5 py-0.5 rounded-md bg-accent-rose/10 text-accent-rose border border-accent-rose/20">
              查询失败
            </span>
          )}
        </div>
      </div>

      {/* Fixed footer — action buttons */}
      <div className="flex gap-2 px-4 py-3 border-t border-surface-border/50 shrink-0">
        {!isCaptured ? (
          <button
            onClick={handleCapture}
            className="flex items-center gap-1.5 flex-1 justify-center py-2 px-3 rounded-lg bg-purple text-white text-xs font-medium hover:bg-purple-bright transition-colors"
          >
            <BookmarkSimple size={14} weight="fill" />
            加入生词本
          </button>
        ) : (
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 flex-1 justify-center py-2 px-3 rounded-lg bg-surface-2 text-xs text-ink-muted hover:text-accent-rose hover:bg-accent-rose/10 transition-colors"
          >
            <Trash size={14} weight="regular" />
            移出生词本
          </button>
        )}
        {isCaptured && (
          <button
            onClick={handleViewClip}
            className="flex items-center gap-1.5 flex-1 justify-center py-2 px-3 rounded-lg bg-surface-2 text-xs text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors"
          >
            看原片段
          </button>
        )}
      </div>
    </div>
  )
}
