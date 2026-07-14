import { useState, useMemo } from 'react'
import { Lightbulb } from '@phosphor-icons/react'
import type { MemorizeItem } from '../MemorizeScreen'
import { generateDistractors } from '../../../lib/distractors'
import { useVocabStore } from '../../../stores/useVocabStore'

interface Props {
  item: MemorizeItem
  onResult: (correct: boolean) => void
}

export function ChoiceStage({ item, onResult }: Props) {
  const loadedBooks = useVocabStore((s) => s.loadedBooks)
  const [selected, setSelected] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)

  const correctDefinition = typeof item.definition === 'string' ? item.definition : '释义暂缺'
  const options = useMemo(() => {
    const distractors = generateDistractors(correctDefinition, item.lemma, loadedBooks, 3)
    const all = [correctDefinition, ...distractors]
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]]
    }
    return all
  }, [correctDefinition, item.lemma, loadedBooks])

  const handleSelect = (option: string) => {
    if (selected !== null) return
    setSelected(option)
    const correct = option === correctDefinition
    setTimeout(() => {
      onResult(correct)
    }, correct ? 1500 : 2000)
  }

  const handleShowAnswer = () => {
    if (selected !== null) return
    setShowAnswer(true)
    setSelected(correctDefinition)
    setTimeout(() => {
      onResult(false)
    }, 2000)
  }

  const getOptionStyle = (option: string) => {
    if (selected === null) {
      return 'bg-surface-2 border-surface-border hover:border-purple/30 hover:bg-surface-3'
    }
    if (option === correctDefinition) {
      return 'bg-accent-green/15 border-accent-green/40 text-accent-green'
    }
    if (option === selected) {
      return 'bg-accent-rose/15 border-accent-rose/40 text-accent-rose'
    }
    return 'bg-surface-2 border-surface-border opacity-50'
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-[480px]">
      <div className="text-xs text-purple font-medium">阶段 1/3 · 选义</div>

      <div className="text-center space-y-2">
        <h2 className="text-4xl font-display font-semibold text-ink tracking-tight">
          {item.spelling}
        </h2>
        {item.phonetics && (
          <p className="text-sm text-ink-muted font-mono">{item.phonetics}</p>
        )}
      </div>

      <p className="text-xs text-ink-muted">先回想词义，再选择正确释义</p>

      <div className="w-full space-y-2">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(option)}
            disabled={selected !== null}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${getOptionStyle(option)}`}
          >
            <span className="text-xs text-ink-muted mr-2 font-mono">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="text-ink-dim">{option}</span>
          </button>
        ))}
      </div>

      {selected === null && (
        <button
          onClick={handleShowAnswer}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs text-ink-muted hover:text-purple transition-colors"
        >
          <Lightbulb size={16} />
          看答案
        </button>
      )}

      {selected !== null && (
        <p className="text-xs text-ink-muted animate-pulse">
          {selected === correctDefinition ? '✓ 正确' : showAnswer ? '记一下答案' : '✗ 再看看正确答案'}
        </p>
      )}
    </div>
  )
}
