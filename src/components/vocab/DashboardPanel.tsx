import { useState, useEffect } from 'react'
import { useUIStore } from '../../stores/useUIStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useReviewStore } from '../../stores/useReviewStore'
import { buildWordSet } from '../../engines/matching/MatcherEngine'
import { Modal } from '../ui/Modal'
import { toast } from '../ui/Toast'
import {
  X, BookOpen, Trash, Export, GraduationCap, Plus, Gear,
  Star, PencilSimple, FolderOpen, Warning,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'

const BOOK_OPTIONS = [
  { id: 'cet4', name: '四级词汇 (CET-4)' },
  { id: 'cet6', name: '六级词汇 (CET-6)' },
  { id: 'ielts', name: '雅思词汇 (IELTS)' },
  { id: 'toefl', name: '托福词汇 (TOEFL)' },
]

export function DashboardPanel() {
  const activePanel = useUIStore((s) => s.activePanel)
  const closePanel = useUIStore((s) => s.closePanel)
  const selectedWordBookId = useUIStore((s) => s.selectedWordBookId)
  const setSelectedWordBookId = useUIStore((s) => s.setSelectedWordBookId)
  const setAppScreen = useUIStore((s) => s.setAppScreen)

  const capturedWords = useVocabStore((s) => s.capturedWords)
  const notebooks = useVocabStore((s) => s.notebooks)
  const defaultNotebookId = useVocabStore((s) => s.defaultNotebookId)
  const setActiveBook = useVocabStore((s) => s.setActiveBook)
  const removeCapturedWord = useVocabStore((s) => s.removeCapturedWord)
  const moveCapturedWord = useVocabStore((s) => s.moveCapturedWord)
  const createNotebook = useVocabStore((s) => s.createNotebook)
  const renameNotebook = useVocabStore((s) => s.renameNotebook)
  const deleteNotebook = useVocabStore((s) => s.deleteNotebook)
  const setDefaultNotebook = useVocabStore((s) => s.setDefaultNotebook)

  const matchSummary = useSubtitleStore((s) => s.matchSummary)
  const dueCount = useReviewStore((s) => s.dueCount)

  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null)
  const [showNotebookManager, setShowNotebookManager] = useState(false)
  const [movingWordId, setMovingWordId] = useState<string | null>(null)
  const [wordToDelete, setWordToDelete] = useState<string | null>(null)
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null)

  useEffect(() => {
    // Fix #10: If selected notebook was deleted, fall back to default
    if (!selectedNotebookId && defaultNotebookId) {
      setSelectedNotebookId(defaultNotebookId)
    } else if (selectedNotebookId && !notebooks.find(n => n.id === selectedNotebookId)) {
      setSelectedNotebookId(defaultNotebookId)
    }
  }, [defaultNotebookId, selectedNotebookId, notebooks])

  if (activePanel !== 'dashboard') return null

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      capturedWords: capturedWords.map(w => ({
        spelling: w.spelling,
        lemma: w.lemma,
        status: w.status,
        source: { sentenceEn: w.source.sentenceEn, sentenceZh: w.source.sentenceZh, timestamp: w.source.timestamp },
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vocscreen-wordbook.json'
    a.click()
    URL.revokeObjectURL(url)
    toast(`已导出 ${capturedWords.length} 个单词`, 'success')
  }

  const handleConfirmDeleteWord = async () => {
    if (!wordToDelete) return
    await removeCapturedWord(wordToDelete)
    setWordToDelete(null)
    toast('已删除', 'info')
  }

  const handleConfirmDeleteNotebook = async () => {
    if (!notebookToDelete) return
    await deleteNotebook(notebookToDelete)
    if (selectedNotebookId === notebookToDelete) {
      setSelectedNotebookId(defaultNotebookId)
    }
    setNotebookToDelete(null)
    toast('生词本已删除，单词已移至默认生词本', 'info')
  }

  const handleBookChange = (id: string) => {
    setSelectedWordBookId(id)
    setActiveBook(id as any)
    const book = useVocabStore.getState().loadedBooks.get(id as any)
    if (book) {
      const wordSet = buildWordSet(book)
      useSubtitleStore.getState().rematchWords(wordSet, id, book.name)
    }
  }

  const wordsForNotebook = selectedNotebookId
    ? capturedWords.filter(w => w.notebookId === selectedNotebookId)
    : capturedWords

  const bookName = matchSummary?.bookName ?? '词汇'

  return (
    <motion.div
      initial={{ x: 380 }}
      animate={{ x: 0 }}
      exit={{ x: 380 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-0 right-0 bottom-0 w-[380px] max-w-[90vw] z-40 bg-surface-1 border-l border-surface-border shadow-modal flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
          <BookOpen size={18} weight="fill" className="text-purple" />
          仪表盘
        </h3>
        <button onClick={closePanel} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-3">
          <X size={16} weight="bold" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-2 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple">{matchSummary?.totalMatches ?? 0}</div>
            <div className="text-[11px] text-ink-muted mt-0.5">视频中{bookName}</div>
          </div>
          <div className="bg-surface-2 rounded-lg p-3">
            <div className="text-2xl font-bold text-accent-rose">{dueCount}</div>
            <div className="text-[11px] text-ink-muted mt-0.5">待复习</div>
          </div>
        </div>

        {/* Go to memorize button */}
        <button
          onClick={() => {
            closePanel()
            setAppScreen('memorize')
          }}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-bright transition-colors"
        >
          <GraduationCap size={18} weight="fill" />
          去背单词
        </button>

        {/* Wordbook selector */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-muted mb-2">当前词书</div>
          <select
            value={selectedWordBookId ?? ''}
            onChange={(e) => handleBookChange(e.target.value)}
            className="w-full bg-surface-2 text-ink text-sm border border-surface-border rounded-lg px-3 py-2 outline-none focus:border-purple/50 cursor-pointer"
          >
            {BOOK_OPTIONS.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <p className="text-[10px] text-ink-muted/60 mt-1.5">切换词书后，字幕高亮会实时刷新</p>
        </div>

        {/* Notebook section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wider text-ink-muted">
              生词本 ({wordsForNotebook.length})
            </div>
            <button
              onClick={() => setShowNotebookManager(true)}
              className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
              title="管理生词本"
            >
              <Gear size={14} />
            </button>
          </div>

          {/* Notebook tabs */}
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
            {notebooks.map(nb => {
              const count = capturedWords.filter(w => w.notebookId === nb.id).length
              const isActive = selectedNotebookId === nb.id
              return (
                <button
                  key={nb.id}
                  onClick={() => setSelectedNotebookId(nb.id)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-purple text-white'
                      : 'bg-surface-2 text-ink-dim hover:text-ink hover:bg-surface-3'
                  }`}
                >
                  {nb.isDefault && <Star size={10} weight="fill" className={isActive ? 'text-yellow-300' : 'text-amber-400'} />}
                  {nb.name}
                  <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-ink-muted'}`}>{count}</span>
                </button>
              )
            })}
            <button
              onClick={async () => {
                const nb = await createNotebook(`生词本${notebooks.length + 1}`)
                setSelectedNotebookId(nb.id)
              }}
              className="shrink-0 p-1.5 rounded-lg bg-surface-2 text-ink-muted hover:text-purple hover:bg-surface-3 transition-colors"
              title="新建生词本"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Word list */}
          {wordsForNotebook.length === 0 ? (
            <p className="text-xs text-ink-muted/50 py-4 text-center">
              该生词本还没有单词。播放视频时暂停，点击任意英文单词即可加入生词本。
            </p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {wordsForNotebook.slice().reverse().map(w => (
                <div key={w.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-surface-2 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-ink truncate">{w.spelling}</span>
                    <span className={`shrink-0 text-[10px] px-1 py-0.5 rounded ${
                      w.status === 'new' ? 'bg-purple/10 text-purple' :
                      w.status === 'learning' ? 'bg-accent-green/10 text-accent-green' :
                      w.status === 'fuzzy' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-surface-2 text-ink-muted'
                    }`}>
                      {w.status === 'new' ? '新' : w.status === 'learning' ? '学习中' : w.status === 'fuzzy' ? '模糊' : '掌握'}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* Move to notebook dropdown */}
                    {movingWordId === w.id ? (
                      <select
                        autoFocus
                        value=""
                        onChange={async (e) => {
                          if (e.target.value) {
                            await moveCapturedWord(w.id, e.target.value)
                          }
                          setMovingWordId(null)
                        }}
                        onBlur={() => setMovingWordId(null)}
                        className="text-[10px] bg-surface-3 text-ink border border-surface-border rounded px-1 py-0.5 outline-none"
                      >
                        <option value="">移动到...</option>
                        {notebooks.filter(nb => nb.id !== w.notebookId).map(nb => (
                          <option key={nb.id} value={nb.id}>{nb.name}</option>
                        ))}
                      </select>
                    ) : (
                      notebooks.length > 1 && (
                        <button
                          onClick={() => setMovingWordId(w.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-muted hover:text-ink transition-all"
                          title="移动到其他生词本"
                        >
                          <FolderOpen size={12} />
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setWordToDelete(w.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-muted hover:text-accent-rose transition-all"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-surface-border">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 w-full justify-center py-2 rounded-lg bg-surface-2 text-xs text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors"
          disabled={capturedWords.length === 0}
        >
          <Export size={14} />
          导出词本 (JSON)
        </button>
      </div>

      {/* Notebook manager modal */}
      <NotebookManagerModal
        isOpen={showNotebookManager}
        onClose={() => setShowNotebookManager(false)}
        notebooks={notebooks}
        capturedWords={capturedWords}
        defaultNotebookId={defaultNotebookId}
        onCreate={createNotebook}
        onRename={renameNotebook}
        onDelete={deleteNotebook}
        onSetDefault={setDefaultNotebook}
        onNotebookDelete={(id) => { setShowNotebookManager(false); setNotebookToDelete(id) }}
      />

      {/* Confirm delete word modal (#14) */}
      <Modal isOpen={!!wordToDelete} onClose={() => setWordToDelete(null)}>
        <div className="w-[320px] max-w-[90vw] p-5 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-accent-rose/15 flex items-center justify-center">
            <Warning size={24} className="text-accent-rose" weight="bold" />
          </div>
          <h3 className="text-base font-semibold text-ink">删除这个单词？</h3>
          <p className="text-xs text-ink-muted">将从生词本中永久移除</p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setWordToDelete(null)}
              className="flex-1 py-2 rounded-lg bg-surface-2 text-sm text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmDeleteWord}
              className="flex-1 py-2 rounded-lg bg-accent-rose text-white text-sm font-medium hover:bg-accent-rose/90 transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete notebook modal (#14) */}
      <Modal isOpen={!!notebookToDelete} onClose={() => setNotebookToDelete(null)}>
        <div className="w-[340px] max-w-[90vw] p-5 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-accent-rose/15 flex items-center justify-center">
            <Warning size={24} className="text-accent-rose" weight="bold" />
          </div>
          <h3 className="text-base font-semibold text-ink">删除这个生词本？</h3>
          <p className="text-xs text-ink-muted">生词本内的单词会移至默认生词本，不会丢失</p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setNotebookToDelete(null)}
              className="flex-1 py-2 rounded-lg bg-surface-2 text-sm text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmDeleteNotebook}
              className="flex-1 py-2 rounded-lg bg-accent-rose text-white text-sm font-medium hover:bg-accent-rose/90 transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}

interface NotebookManagerModalProps {
  isOpen: boolean
  onClose: () => void
  notebooks: ReturnType<typeof useVocabStore.getState>['notebooks']
  capturedWords: ReturnType<typeof useVocabStore.getState>['capturedWords']
  defaultNotebookId: string | null
  onCreate: (name: string) => Promise<unknown>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSetDefault: (id: string) => Promise<void>
  onNotebookDelete: (id: string) => void
}

function NotebookManagerModal({
  isOpen, onClose, notebooks, capturedWords, defaultNotebookId,
  onCreate, onRename, onDelete, onSetDefault, onNotebookDelete,
}: NotebookManagerModalProps) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    await onCreate(newName.trim())
    setNewName('')
  }

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditName(name)
  }

  const handleSaveEdit = async () => {
    if (editingId && editName.trim()) {
      await onRename(editingId, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[400px] max-w-[90vw] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Gear size={16} className="text-purple" />
            管理生词本
          </h3>
          <button onClick={onClose} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-3">
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Notebook list */}
        <div className="space-y-1.5 mb-4 max-h-[300px] overflow-y-auto">
          {notebooks.map(nb => {
            const count = capturedWords.filter(w => w.notebookId === nb.id).length
            const isEditing = editingId === nb.id
            const isDefault = nb.id === defaultNotebookId
            const canDelete = notebooks.length > 1
            return (
              <div key={nb.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-2">
                {isEditing ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveEdit()
                      if (e.key === 'Escape') { setEditingId(null); setEditName('') }
                    }}
                    onBlur={handleSaveEdit}
                    className="flex-1 bg-surface-3 text-ink text-sm border border-purple/40 rounded px-2 py-1 outline-none"
                  />
                ) : (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    {isDefault && <Star size={12} weight="fill" className="text-amber-400 shrink-0" />}
                    <span className="text-sm text-ink truncate">{nb.name}</span>
                    <span className="text-[10px] text-ink-muted shrink-0">{count}词</span>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!isDefault && (
                      <button
                        onClick={() => onSetDefault(nb.id)}
                        className="p-1 rounded text-ink-muted hover:text-amber-400 transition-colors"
                        title="设为默认"
                      >
                        <Star size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(nb.id, nb.name)}
                      className="p-1 rounded text-ink-muted hover:text-ink transition-colors"
                      title="重命名"
                    >
                      <PencilSimple size={12} />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => onNotebookDelete(nb.id)}
                        className="p-1 rounded text-ink-muted hover:text-accent-rose transition-colors"
                        title="删除（词移到默认本）"
                      >
                        <Trash size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Create new */}
        <div className="flex gap-2 pt-3 border-t border-surface-border">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            placeholder="新生词本名称..."
            className="flex-1 bg-surface-2 text-ink text-sm border border-surface-border rounded-lg px-3 py-2 outline-none focus:border-purple/40"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-bright transition-colors disabled:opacity-40"
          >
            <Plus size={14} weight="bold" />
            创建
          </button>
        </div>
      </div>
    </Modal>
  )
}
