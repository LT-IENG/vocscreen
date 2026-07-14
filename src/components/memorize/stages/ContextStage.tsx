import { useState, useCallback, useEffect } from 'react'
import { Lightbulb, PlayCircle, Spinner } from '@phosphor-icons/react'
import type { MemorizeItem } from '../MemorizeScreen'
import { fetchWordFromApi } from '../../../engines/dict/DictEngine'

interface Props {
  item: MemorizeItem
  onResult: (known: boolean) => void
  onPlayClip?: () => void
}

export function ContextStage({ item, onResult, onPlayClip }: Props) {
  const [showHint, setShowHint] = useState(false)
  const [fetchedExample, setFetchedExample] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  // Fetch example sentence from dictionary API if no video or word book example available
  useEffect(() => {
    if (item.videoSentence || item.exampleSentence) {
      setFetchedExample(null)
      setFetching(false)
      return
    }
    let cancelled = false
    setFetching(true)
    setFetchedExample(null)
    fetchWordFromApi(item.lemma)
      .then((result) => {
        if (cancelled) return
        if (result && result.senses.length > 0) {
          // Find first sense with an example sentence
          const senseWithExample = result.senses.find(s => s.example)
          if (senseWithExample?.example) {
            setFetchedExample(senseWithExample.example)
          } else {
            // No example in API, use the English definition as context
            const firstSense = result.senses[0]
            setFetchedExample(firstSense?.definition || null)
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFetching(false)
      })
    return () => { cancelled = true }
  }, [item.lemma, item.videoSentence, item.exampleSentence])

  const handleResult = useCallback((known: boolean) => {
    onResult(known)
  }, [onResult])

  const displayExample = item.videoSentence || item.exampleSentence || fetchedExample
  const showClipButton = !!item.videoSentence && !!onPlayClip && item.videoClipStart !== undefined
  const isApiExample = !item.videoSentence && !item.exampleSentence && !!fetchedExample

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-[480px]">
      <div className="text-xs text-purple font-medium">阶段 2/3 · 例句判断</div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-display font-semibold text-ink tracking-tight">
          {item.spelling}
        </h2>
        {item.phonetics && (
          <p className="text-sm text-ink-muted font-mono">{item.phonetics}</p>
        )}
      </div>

      {displayExample ? (
        <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border">
          {showClipButton && (
            <button
              onClick={onPlayClip}
              className="flex items-center gap-1.5 px-2.5 py-1 mb-2 rounded-md bg-purple/10 border border-purple/20 text-xs text-purple hover:bg-purple/20 transition-colors"
            >
              <PlayCircle size={14} weight="fill" />
              原声
            </button>
          )}
          <p className="text-sm text-ink leading-relaxed">
            {displayExample}
          </p>
          {isApiExample && (
            <p className="text-[10px] text-ink-muted/60 mt-2">来自词典</p>
          )}
        </div>
      ) : fetching ? (
        <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border flex items-center justify-center gap-2">
          <Spinner size={14} className="animate-spin text-ink-muted" />
          <p className="text-sm text-ink-muted">加载例句中...</p>
        </div>
      ) : (
        <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border text-center">
          <p className="text-sm text-ink-muted">暂无例句，请根据释义判断</p>
        </div>
      )}

      {showHint && (
        <div className="w-full p-3 rounded-lg bg-purple/10 border border-purple/20">
          <p className="text-xs text-ink-dim leading-relaxed">{item.definition}</p>
          {item.senses && item.senses.length > 0 && (
            <div className="mt-2 space-y-1">
              {item.senses.slice(0, 3).map((sense, i) => (
                <p key={i} className="text-xs text-ink-muted">
                  {sense.pos && <span className="text-purple mr-1">{sense.pos}.</span>}
                  {sense.definition}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowHint(h => !h)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs text-ink-muted hover:text-purple transition-colors"
      >
        <Lightbulb size={16} />
        {showHint ? '隐藏提示' : '提示'}
      </button>

      <div className="flex gap-3 w-full">
        <button
          onClick={() => handleResult(false)}
          className="flex-1 py-3 rounded-lg text-sm font-medium bg-accent-rose/15 text-accent-rose border border-accent-rose/25 hover:bg-accent-rose/25 transition-colors"
        >
          ✗ 不认识
        </button>
        <button
          onClick={() => handleResult(true)}
          className="flex-1 py-3 rounded-lg text-sm font-medium bg-accent-green/15 text-accent-green border border-accent-green/25 hover:bg-accent-green/25 transition-colors"
        >
          ✓ 认识
        </button>
      </div>
    </div>
  )
}
