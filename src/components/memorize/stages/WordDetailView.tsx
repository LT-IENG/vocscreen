import { useState, useEffect } from 'react'
import {
  PlayCircle, Spinner, Check, X, Lightbulb, Quotes, Swap,
  ShareNetwork, GraduationCap, CaretDown,
} from '@phosphor-icons/react'
import type { MemorizeItem } from '../MemorizeScreen'
import type { LearnStage } from '../../../types'
import { fetchWordFromApi } from '../../../engines/dict/DictEngine'

interface Props {
  item: MemorizeItem
  result: boolean
  stage: LearnStage
  mode: 'learn' | 'review'
  assessing?: boolean
  onContinue: () => void
  onPlayClip?: () => void
}

export function WordDetailView({ item, result, stage, mode, assessing, onContinue, onPlayClip }: Props) {
  const [fetchedExample, setFetchedExample] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [showExamSentences, setShowExamSentences] = useState(false)

  useEffect(() => {
    if (item.exampleSentence) {
      setFetchedExample(null)
      setFetching(false)
      return
    }
    let cancelled = false
    setFetching(true)
    setFetchedExample(null)
    fetchWordFromApi(item.lemma)
      .then((dictResult) => {
        if (cancelled) return
        if (dictResult && dictResult.senses.length > 0) {
          const senseWithExample = dictResult.senses.find(s => s.example)
          if (senseWithExample?.example) {
            setFetchedExample(senseWithExample.example)
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false) })
    return () => { cancelled = true }
  }, [item.lemma, item.exampleSentence])

  const bookExample = item.exampleSentence || fetchedExample
  const isApiExample = !item.exampleSentence && !!fetchedExample

  const stageText = stage === 'choice' ? '选义' : stage === 'context' ? '例句' : '裸词'
  const resultLabel = result ? '认识' : '不认识'
  const ResultIcon = result ? Check : X

  const hasVideoSentence = !!item.videoSentence
  const hasPhrases = !!(item.phrases && item.phrases.length > 0)
  const hasSynonyms = !!(item.synonyms && item.synonyms.length > 0)
  const hasRelatedWords = !!(item.relatedWords && item.relatedWords.length > 0)
  const hasExamSentences = !!(item.examSentences && item.examSentences.length > 0)

  return (
    <div className="flex flex-col w-full max-w-[480px]">
      <div className="flex flex-col items-center gap-4 max-h-[72vh] overflow-y-auto px-1 pb-2">
        {/* Result badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${result ? 'bg-accent-green/10' : 'bg-accent-rose/10'}`}>
          <ResultIcon size={14} weight="bold" className={result ? 'text-accent-green' : 'text-accent-rose'} />
          <span className={`text-xs font-medium ${result ? 'text-accent-green' : 'text-accent-rose'}`}>{resultLabel}</span>
          <span className="text-[10px] text-ink-muted ml-1">· {stageText}阶段</span>
        </div>

        {/* Word + phonetics */}
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-display font-semibold text-ink tracking-tight">
            {item.spelling}
          </h2>
          {item.phonetics && (
            <p className="text-sm text-ink-muted font-mono">{item.phonetics}</p>
          )}
        </div>

        {/* Senses (释义) */}
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

        {/* Mnemonic (记忆方法) */}
        {item.mnemonic && (
          <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={14} weight="fill" style={{ color: '#f59e0b' }} />
              <span className="text-xs font-medium text-ink-muted">记忆方法</span>
            </div>
            <p className="text-sm text-ink-dim leading-relaxed">{item.mnemonic}</p>
          </div>
        )}

        {/* Video original sentence (原声) — from video subtitle */}
        {hasVideoSentence && (
          <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border">
            {onPlayClip && item.videoClipStart !== undefined && (
              <button
                onClick={onPlayClip}
                className="flex items-center gap-1.5 px-2.5 py-1 mb-2 rounded-md bg-purple/10 border border-purple/20 text-xs text-purple hover:bg-purple/20 transition-colors"
              >
                <PlayCircle size={14} weight="fill" />
                原声
              </button>
            )}
            <p className="text-sm text-ink leading-relaxed">{item.videoSentence}</p>
            {item.videoSentenceTranslation && (
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">{item.videoSentenceTranslation}</p>
            )}
          </div>
        )}

        {/* Word book example (例句) — from wordbook or dictionary API */}
        {bookExample ? (
          <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border">
            <p className="text-sm text-ink leading-relaxed">{bookExample}</p>
            {item.exampleTranslation && (
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">{item.exampleTranslation}</p>
            )}
            {isApiExample && (
              <p className="text-[10px] text-ink-muted/60 mt-2">来自词典</p>
            )}
          </div>
        ) : fetching ? (
          <div className="w-full p-3 rounded-xl bg-surface-2 border border-surface-border flex items-center justify-center gap-2">
            <Spinner size={14} className="animate-spin text-ink-muted" />
            <p className="text-xs text-ink-muted">加载例句...</p>
          </div>
        ) : null}

        {/* Phrases (短语) */}
        {hasPhrases && (
          <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Quotes size={14} weight="fill" style={{ color: '#8b5cf6' }} />
              <span className="text-xs font-medium text-ink-muted">短语</span>
            </div>
            <div className="space-y-1.5">
              {item.phrases!.slice(0, 8).map((phrase, i) => (
                <div key={i} className="text-sm leading-relaxed">
                  <span className="text-ink font-medium">{phrase.content}</span>
                  <span className="text-ink-muted ml-2">{phrase.translation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Synonyms (同近义词) */}
        {hasSynonyms && (
          <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Swap size={14} weight="fill" style={{ color: '#3b82f6' }} />
              <span className="text-xs font-medium text-ink-muted">同近义词</span>
            </div>
            <div className="space-y-2">
              {item.synonyms!.map((group, i) => (
                <div key={i} className="text-sm leading-relaxed">
                  {group.pos && (
                    <span
                      className="inline-block text-[10px] font-mono px-1 py-0.5 rounded mr-1.5 align-middle"
                      style={{ color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                    >
                      {group.pos}
                    </span>
                  )}
                  {group.translation && (
                    <span className="text-ink-muted mr-2">{group.translation}</span>
                  )}
                  <span className="text-ink font-medium">{group.words.join('、')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related words (同根词) */}
        {hasRelatedWords && (
          <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border">
            <div className="flex items-center gap-1.5 mb-2">
              <ShareNetwork size={14} weight="fill" style={{ color: '#10b981' }} />
              <span className="text-xs font-medium text-ink-muted">同根词</span>
            </div>
            <div className="space-y-2">
              {item.relatedWords!.map((group, i) => (
                <div key={i} className="space-y-1">
                  {group.pos && (
                    <span
                      className="inline-block text-[10px] font-mono px-1 py-0.5 rounded mr-1.5 align-middle"
                      style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                    >
                      {group.pos}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {group.words.map((w, j) => (
                      <span key={j} className="text-sm">
                        <span className="text-ink font-medium">{w.word}</span>
                        <span className="text-ink-muted ml-1 text-xs">{w.translation}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exam sentences (真题例句) - collapsible */}
        {hasExamSentences && (
          <div className="w-full p-4 rounded-xl bg-surface-2 border border-surface-border">
            <button
              onClick={() => setShowExamSentences(!showExamSentences)}
              className="flex items-center gap-1.5 w-full"
            >
              <GraduationCap size={14} weight="fill" style={{ color: '#f43f5e' }} />
              <span className="text-xs font-medium text-ink-muted">真题例句</span>
              <CaretDown
                size={12}
                className={`text-ink-muted ml-auto transition-transform ${showExamSentences ? 'rotate-180' : ''}`}
              />
            </button>
            {showExamSentences && (
              <div className="mt-2 space-y-2">
                {item.examSentences!.map((exam, i) => (
                  <div key={i} className="text-sm leading-relaxed">
                    <p className="text-ink">{exam.en}</p>
                    {exam.source && (
                      <p className="text-[10px] text-ink-muted/60 mt-0.5">— {exam.source}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue button - always visible */}
      <button
        onClick={onContinue}
        disabled={assessing}
        className="w-full py-3 mt-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {assessing ? '保存中...' : '继续 →'}
      </button>
    </div>
  )
}
