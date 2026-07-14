import { useRef } from 'react'
import { useUIStore } from '../../stores/useUIStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { X, QrCode, Download, UploadSimple, Trash, Info } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { db, clearAllLocalData } from '../../db/database'

export function ProfilePanel() {
  const activePanel = useUIStore((s) => s.activePanel)
  const closePanel = useUIStore((s) => s.closePanel)
  const subtitleDisplay = useUIStore((s) => s.subtitleDisplay)
  const setSubtitleDisplay = useUIStore((s) => s.setSubtitleDisplay)
  const setAppScreen = useUIStore((s) => s.setAppScreen)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const capturedWords = useVocabStore((s) => s.capturedWords)
  const loadPersistedWords = useVocabStore((s) => s.loadPersistedWords)
  const [nickname, setNickname] = useState('学习者')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('vocScreenProfile')
    if (saved) {
      try { setNickname(JSON.parse(saved).nickname || '学习者') } catch { /* ignore */ }
    }
  }, [])

  const saveNickname = (name: string) => {
    setNickname(name)
    localStorage.setItem('vocScreenProfile', JSON.stringify({ nickname: name }))
  }

  const qrUrl = typeof window !== 'undefined'
    ? window.location.origin
    : ''

  if (activePanel !== 'profile') return null

  return (
    <motion.div
      initial={{ x: 380 }}
      animate={{ x: 0 }}
      exit={{ x: 380 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-0 right-0 bottom-0 w-[380px] max-w-[90vw] z-40 bg-surface-1 border-l border-surface-border shadow-modal flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <h3 className="text-sm font-semibold text-ink">我的</h3>
        <button onClick={closePanel} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-3">
          <X size={16} weight="bold" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple/20 flex items-center justify-center text-xl">
            🦊
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={nickname}
              onChange={(e) => saveNickname(e.target.value)}
              className="bg-transparent text-ink font-semibold text-sm outline-none border-b border-transparent hover:border-surface-border focus:border-purple/50 px-1 py-0.5 w-full"
            />
            <p className="text-[11px] text-ink-muted mt-0.5">
              {capturedWords.length} 个生词 · 本地账户
            </p>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-muted mb-2">设置</div>
          <div className="bg-surface-2 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-dim">字幕默认显示</span>
              <select
                value={subtitleDisplay}
                onChange={(e) => setSubtitleDisplay(e.target.value as any)}
                className="bg-surface-3 text-ink text-xs border border-surface-border rounded px-2 py-1 outline-none"
              >
                <option value="bilingual">双语</option>
                <option value="en">仅英文</option>
                <option value="zh">仅中文</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-dim">主题</span>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-1.5 text-[10px] bg-surface-3 px-2 py-1 rounded-md hover:bg-surface-border transition-colors cursor-pointer"
              >
                <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
                <span className="text-ink-dim">{theme === 'dark' ? '暗色' : '浅色'}</span>
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-muted mb-2">跨设备同步</div>
          <div className="bg-surface-2 rounded-lg p-4 text-center">
            <div className="w-32 h-32 mx-auto mb-3 bg-white rounded-lg flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(qrUrl)}`}
                alt="QR Code"
                className="w-28 h-28"
                loading="lazy"
              />
            </div>
            <p className="text-xs text-ink-dim">手机扫描二维码打开手机版</p>
            <p className="text-[10px] text-ink-muted/50 mt-1">{qrUrl}</p>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-muted mb-2">数据管理</div>
          <div className="space-y-2">
            <button
              onClick={() => {
                const data = {
                  version: 'v2',
                  capturedWords: capturedWords,
                  exportedAt: new Date().toISOString(),
                }
                const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'vocscreen-backup.json'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="flex items-center gap-2 w-full py-2 px-3 rounded-lg bg-surface-2 text-xs text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors"
            >
              <Download size={14} />
              导出全部数据
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="flex items-center gap-2 w-full py-2 px-3 rounded-lg bg-surface-2 text-xs text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors"
            >
              <UploadSimple size={14} />
              导入数据（从备份文件恢复）
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  const data = JSON.parse(text)
                  if (data.version !== 'v2') { setImportStatus('文件版本不匹配'); return }

                  if (Array.isArray(data.capturedWords)) {
                    for (const w of data.capturedWords) {
                      await db.capturedWords.put({
                        id: w.id || crypto.randomUUID(),
                        wordEntryId: w.wordEntryId || '',
                        spelling: w.spelling,
                        lemma: w.lemma,
                        source: JSON.stringify(w.source),
                        status: w.status || 'new',
                        capturedAt: w.capturedAt || Date.now(),
                        learnedAt: w.learnedAt,
                      })
                    }
                    await loadPersistedWords()
                  }

                  setImportStatus(`已导入 ${data.capturedWords?.length || 0} 个生词`)
                  setTimeout(() => setImportStatus(null), 3000)
                } catch {
                  setImportStatus('文件解析失败，请检查文件格式')
                  setTimeout(() => setImportStatus(null), 3000)
                }
              }}
            />
            {importStatus && (
              <p className="text-[11px] text-purple px-3">{importStatus}</p>
            )}
            <button
              onClick={() => {
                if (!confirm('确定要清除所有本地数据？包括生词、复习计划、学习记录等，此操作不可撤销。')) return
                clearAllLocalData()
              }}
              className="flex items-center gap-2 w-full py-2 px-3 rounded-lg bg-surface-2 text-xs text-ink-muted hover:text-accent-rose hover:bg-accent-rose/5 transition-colors"
            >
              <Trash size={14} />
              清除本地数据
            </button>
          </div>
        </div>

        <button
          onClick={() => setAppScreen('landing')}
          className="flex items-center gap-2 w-full py-2 px-3 rounded-lg bg-surface-2 text-xs text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors"
        >
          <Info size={14} />
          关于词映 VocScreen
        </button>
      </div>
    </motion.div>
  )
}