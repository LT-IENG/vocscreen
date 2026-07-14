import { PlayCircle } from '@phosphor-icons/react'
import type { MemorizeItem } from '../MemorizeScreen'

interface Props {
  item: MemorizeItem
  onGotIt: () => void
  onPlayClip?: () => void
}

export function ReviewFailView({ item, onGotIt, onPlayClip }: Props) {
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-[480px]">
      <div className="flex items-center gap-2 text-accent-rose">
        <span className="text-xs font-medium">← 不认识，再看一眼</span>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-display font-semibold text-ink tracking-tight">
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

      {item.exampleSentence && (
        <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border">
          <p className="text-sm text-ink leading-relaxed">{item.exampleSentence}</p>
          {item.exampleTranslation && (
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">{item.exampleTranslation}</p>
          )}
        </div>
      )}

      {onPlayClip && item.videoClipStart !== undefined && (
        <button
          onClick={onPlayClip}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple/10 border border-purple/20 text-sm text-purple hover:bg-purple/20 transition-colors"
        >
          <PlayCircle size={18} weight="fill" />
          看原片段
        </button>
      )}

      <button
        onClick={onGotIt}
        className="w-full py-3 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-bright transition-colors"
      >
        ✓ 记住了
      </button>
    </div>
  )
}
