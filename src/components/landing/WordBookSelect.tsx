import { motion, useReducedMotion } from 'motion/react'
import { useUIStore } from '../../stores/useUIStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { BookOpen, GraduationCap, Globe, Airplane } from '@phosphor-icons/react'
import { useEffect, useCallback } from 'react'
import type { WordBookId } from '../../types'

const BOOKS = [
  { id: 'cet4' as WordBookId, name: '四级词汇', sub: 'CET-4 · 2,607 词', icon: BookOpen, color: '#a78bfa' },
  { id: 'cet6' as WordBookId, name: '六级词汇', sub: 'CET-6 · 2,345 词', icon: GraduationCap, color: '#8b5cf6' },
  { id: 'ielts' as WordBookId, name: '雅思词汇', sub: 'IELTS · 3,575 词', icon: Globe, color: '#7c3aed' },
  { id: 'toefl' as WordBookId, name: '托福词汇', sub: 'TOEFL · 4,264 词', icon: Airplane, color: '#6d28d9' },
]

export function WordBookSelect() {
  const setSelectedWordBookId = useUIStore((s) => s.setSelectedWordBookId)
  const setAppScreen = useUIStore((s) => s.setAppScreen)
  const selectedBookId = useUIStore((s) => s.selectedWordBookId)
  const loadedBooks = useVocabStore((s) => s.loadedBooks)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const loadAll = async () => {
      for (const book of BOOKS) {
        if (!loadedBooks.has(book.id)) {
          try {
            const resp = await fetch(`/wordbooks/${book.id}.json`)
            if (resp.ok) {
              const data = await resp.json()
              useVocabStore.getState().loadBook(data)
            }
          } catch { /* skip if file missing */ }
        }
      }
    }
    loadAll()
  }, [])

  const handleSelect = useCallback((id: WordBookId) => {
    setSelectedWordBookId(id)
    useVocabStore.getState().setActiveBook(id)
    setTimeout(() => setAppScreen('app'), 400)
  }, [setSelectedWordBookId, setAppScreen])

  return (
    <div className="fixed inset-0 bg-surface-0 flex items-center justify-center z-30">
      <div className="max-w-lg w-full px-6">
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl font-display font-bold text-ink mb-2">选择词书</h2>
          <p className="text-sm text-ink-dim">选择一个词书，看剧时匹配的生词会自动高亮</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BOOKS.map((book, i) => {
            const Icon = book.icon
            const isSelected = selectedBookId === book.id
            const isLoaded = loadedBooks.has(book.id)
            return (
              <motion.button
                key={book.id}
                onClick={() => handleSelect(book.id)}
                initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
                whileHover={reduceMotion ? {} : { scale: 1.02, y: -2 }}
                whileTap={reduceMotion ? {} : { scale: 0.98 }}
                className={`
                  relative flex items-start gap-4 p-5 rounded-xl border text-left transition-all duration-200
                  ${isSelected
                    ? 'border-purple/40 bg-purple/8 shadow-[0_0_24px_rgba(139,92,246,0.12)]'
                    : 'border-surface-border bg-surface-1 hover:border-purple/20 hover:bg-surface-2'
                  }
                `}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${book.color}20` }}
                >
                  <Icon size={22} weight="fill" style={{ color: book.color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">{book.name}</div>
                  <div className="text-xs text-ink-muted mt-0.5">{book.sub}</div>
                  {isLoaded && (
                    <div className="text-[10px] text-purple/60 mt-1">已加载</div>
                  )}
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-purple" />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}