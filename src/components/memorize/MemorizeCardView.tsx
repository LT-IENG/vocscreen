import { useState, useCallback } from 'react'
import type { MasteryResult } from '../../types'
import type { MemorizeItem } from './MemorizeScreen'
import './MemorizeScreen.css'

interface Props {
  item: MemorizeItem
  index: number
  total: number
  onAssess: (result: MasteryResult) => void
  mode?: 'learn' | 'review'
}

export function MemorizeCardView({ item, index, total, onAssess, mode = 'learn' }: Props) {
  const [flipped, setFlipped] = useState(false)

  const handleFlip = useCallback(() => {
    setFlipped(f => !f)
  }, [])

  const handleAssess = useCallback((result: MasteryResult) => {
    onAssess(result)
    setFlipped(false)
  }, [onAssess])

  const levelLabel = (lvl?: string) => {
    if (!lvl) return ''
    const map: Record<string, string> = { CET4: '四级', CET6: '六级', IELTS: '雅思', TOEFL: '托福' }
    return map[lvl] || lvl
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="text-xs text-ink-muted font-mono tabular-nums">
        {index + 1} / {total}
      </div>

      <div
        className={`memorize-card ${flipped ? 'flipped' : ''}`}
        onClick={handleFlip}
      >
        <div className="memorize-card-inner">
          {/* Front face */}
          <div className="memorize-card-face memorize-card-front">
            <span className="text-4xl font-display font-semibold text-ink tracking-tight text-center">
              {item.spelling}
            </span>
            {item.phonetics && (
              <span className="text-sm text-ink-muted font-mono mt-3">{item.phonetics}</span>
            )}
            <span className="text-xs text-ink-muted/60 mt-6">点击卡片查看释义</span>
          </div>

          {/* Back face */}
          <div className="memorize-card-face memorize-card-back">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-2xl font-display font-semibold text-ink">{item.spelling}</h3>
              {item.level && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple/15 text-purple border border-purple/20">
                  {levelLabel(item.level)}
                </span>
              )}
            </div>
            {item.phonetics && (
              <p className="text-xs text-ink-muted font-mono mb-3">{item.phonetics}</p>
            )}

            {item.senses && item.senses.length > 0 ? (
              <div className="space-y-1.5 flex-1 overflow-y-auto">
                {item.senses.slice(0, 5).map((sense, i) => (
                  <div key={i} className="text-sm leading-relaxed">
                    {sense.pos && (
                      <span className="inline-block text-[10px] font-mono text-purple bg-purple/10 px-1 py-0.5 rounded mr-1.5 align-middle">
                        {sense.pos}
                      </span>
                    )}
                    <span className="text-ink-dim">{sense.definition}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-dim leading-relaxed flex-1">
                {item.definition || '释义暂缺'}
              </p>
            )}

            {item.exampleSentence && (
              <div className="mt-3 pt-3 border-t border-surface-border">
                <p className="text-xs text-ink-dim italic">{item.exampleSentence}</p>
                {item.exampleTranslation && (
                  <p className="text-xs text-ink-muted mt-1">{item.exampleTranslation}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assessment buttons */}
      {flipped && (
        <div className="flex gap-2">
          <button
            onClick={() => handleAssess('unknown')}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-accent-rose/15 text-accent-rose border border-accent-rose/25 hover:bg-accent-rose/25 transition-colors"
          >
            不认识
          </button>
          <button
            onClick={() => handleAssess('fuzzy')}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
          >
            模糊
          </button>
          <button
            onClick={() => handleAssess('known')}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-accent-green/15 text-accent-green border border-accent-green/25 hover:bg-accent-green/25 transition-colors"
          >
            认识
          </button>
        </div>
      )}
    </div>
  )
}
