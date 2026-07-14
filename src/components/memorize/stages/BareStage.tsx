import { useState, useCallback } from 'react'
import { Eye } from '@phosphor-icons/react'
import type { MemorizeItem } from '../MemorizeScreen'

interface Props {
  item: MemorizeItem
  onResult: (known: boolean) => void
  revealOnFail?: boolean
}

export function BareStage({ item, onResult, revealOnFail = true }: Props) {
  const [revealed, setRevealed] = useState(false)

  const handleNotKnown = useCallback(() => {
    if (revealOnFail) {
      setRevealed(true)
    } else {
      onResult(false)
    }
  }, [revealOnFail, onResult])

  const handleConfirmNotKnown = useCallback(() => {
    onResult(false)
  }, [onResult])

  const handleKnown = useCallback(() => {
    onResult(true)
  }, [onResult])

  if (revealed) {
    return (
      <div className="flex flex-col items-center gap-5 w-full max-w-[480px]">
        <div className="flex items-center gap-2 text-accent-rose">
          <span className="text-xs font-medium">不认识 · 看看释义</span>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-4xl font-display font-semibold text-ink tracking-tight">
            {item.spelling}
          </h2>
          {item.phonetics && (
            <p className="text-sm text-ink-muted font-mono">{item.phonetics}</p>
          )}
        </div>

        <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border space-y-2">
          {item.senses && item.senses.length > 0 ? (
            item.senses.slice(0, 5).map((sense, i) => (
              <div key={i} className="text-sm leading-relaxed">
                {sense.pos && (
                  <span className="inline-block text-[10px] font-mono text-purple bg-purple/10 px-1 py-0.5 rounded mr-1.5 align-middle">
                    {sense.pos}
                  </span>
                )}
                <span className="text-ink-dim">{sense.definition}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-dim leading-relaxed">
              {item.definition || '释义暂缺'}
            </p>
          )}
        </div>

        {(item.exampleSentence || item.videoSentence) && (
          <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border">
            <p className="text-sm text-ink leading-relaxed">{item.exampleSentence || item.videoSentence}</p>
            {(item.exampleTranslation || item.videoSentenceTranslation) && (
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">{item.exampleTranslation || item.videoSentenceTranslation}</p>
            )}
          </div>
        )}

        <button
          onClick={handleConfirmNotKnown}
          className="w-full py-3 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-bright transition-colors"
        >
          记住了，继续 →
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-[480px]">
      <div className="text-xs text-purple font-medium">阶段 3/3 · 裸词判断</div>

      <div className="text-center space-y-3 py-8">
        <h2 className="text-5xl font-display font-semibold text-ink tracking-tight">
          {item.spelling}
        </h2>
        {item.phonetics && (
          <p className="text-base text-ink-muted font-mono">{item.phonetics}</p>
        )}
      </div>

      <p className="text-xs text-ink-muted">无提示，请判断是否认识</p>

      <div className="flex gap-3 w-full">
        <button
          onClick={handleNotKnown}
          className="flex-1 py-3 rounded-lg text-sm font-medium bg-accent-rose/15 text-accent-rose border border-accent-rose/25 hover:bg-accent-rose/25 transition-colors"
        >
          ✗ 不认识
        </button>
        <button
          onClick={handleKnown}
          className="flex-1 py-3 rounded-lg text-sm font-medium bg-accent-green/15 text-accent-green border border-accent-green/25 hover:bg-accent-green/25 transition-colors"
        >
          ✓ 认识
        </button>
      </div>

      {revealOnFail && (
        <button
          onClick={() => setRevealed(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs text-ink-muted hover:text-purple transition-colors"
        >
          <Eye size={16} />
          看答案
        </button>
      )}
    </div>
  )
}
