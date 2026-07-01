import { useRef, useState, useCallback } from 'react'
import { FileText, Robot, Cpu, X, Translate } from '@phosphor-icons/react'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { useUIStore } from '../../stores/useUIStore'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { parseSrt } from '../../engines/subtitle/SrtParser'
import { fillMissingTranslations } from '../../engines/subtitle/TranslateEngine'
import { buildWordSet, rematchAll, getMatchList } from '../../engines/matching/MatcherEngine'
import type { SubtitleSegment } from '../../types'

interface Props { file: File; onClose: () => void }

export function SubtitleSourceModal({ file, onClose }: Props) {
  const srtInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [pendingSegments, setPendingSegments] = useState<SubtitleSegment[] | null>(null)
  const [needsTranslation, setNeedsTranslation] = useState(false)

  const doLoad = useCallback((rawSegments: SubtitleSegment[]) => {
    const bookId = useUIStore.getState().selectedWordBookId
    const book = bookId ? useVocabStore.getState().loadedBooks.get(bookId as any) : undefined

    // Re-match using lemmatization engine
    const wordSet = book ? buildWordSet(book) : new Set<string>()
    const segments = book ? rematchAll(rawSegments, wordSet, bookId!) : rawSegments
    const matchList = getMatchList(segments)
    const matchCount = matchList.length
    const duration = segments[segments.length - 1]?.endTime || 0

    useSubtitleStore.getState().loadMock({
      segments,
      matchSummary: {
        bookId: bookId || '',
        bookName: book?.name || '未选择词书',
        totalMatches: matchCount,
        matchList,
      },
      title: file.name,
      duration,
    })
    usePlayerStore.getState().setDuration(duration)
    setStatus(`已加载 ${segments.length} 条字幕，${matchCount} 个词书匹配`)
    setTimeout(onClose, 800)
  }, [file.name, onClose])

  const handleUploadSrt = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const srtFile = e.target.files?.[0]
    if (!srtFile) return
    setStatus('解析中...')
    setPendingSegments(null)
    setNeedsTranslation(false)

    try {
      let text = await srtFile.text()
      if (!/[一-鿿]{2,}/.test(text)) {
        try {
          const buf = await srtFile.arrayBuffer()
          text = new TextDecoder('gbk').decode(buf)
        } catch { /* fall through */ }
      }
      const parsed = parseSrt(text)
      if (parsed.length === 0) {
        setStatus('字幕文件为空或格式不正确')
        return
      }

      const videoId = usePlayerStore.getState().videoId
      const bookId = useUIStore.getState().selectedWordBookId

      // Build segments without matching — doLoad will use MatcherEngine
      const segments: SubtitleSegment[] = parsed.map((item, i) => ({
        id: `srt-${String(i + 1).padStart(4, '0')}`,
        videoId,
        startTime: Math.round(item.startTime * 10) / 10,
        endTime: Math.round(item.endTime * 10) / 10,
        textEn: item.textEn,
        textZh: item.textZh,
        alignment: [],
        highlightedWords: [],
      }))

      const hasEn = segments.some(s => /[a-zA-Z]{3,}/.test(s.textEn))
      const hasZh = segments.some(s => /[一-鿿]/.test(s.textZh))

      if (hasEn && hasZh) {
        doLoad(segments)
      } else {
        setPendingSegments(segments)
        setNeedsTranslation(true)
        setStatus(`单语字幕 ${segments.length} 条。点击翻译补齐另一语言，或直接加载`)
      }
    } catch (err) {
      setStatus(`解析失败：${err instanceof Error ? err.message : '未知错误'}`)
    }
  }, [file.name, doLoad])

  const handleTranslate = useCallback(async () => {
    if (!pendingSegments) return
    setStatus('翻译中...')
    try {
      const filled = await fillMissingTranslations(pendingSegments)
      setNeedsTranslation(false)
      doLoad(filled)
    } catch {
      setStatus('翻译失败，将按单语加载')
      setTimeout(() => { if (pendingSegments) doLoad(pendingSegments) }, 1200)
    }
  }, [pendingSegments, doLoad])

  return (
    <div
      className="absolute inset-0 z-50 bg-surface-0/70 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-6 w-[420px] max-w-[90vw] shadow-modal">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-ink leading-tight max-w-[300px] truncate">{file.name}</h3>
            <p className="text-xs text-ink-dim mt-1">选择字幕来源</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-3"><X size={18} /></button>
        </div>

        {status && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-purple/10 border border-purple/20 text-xs text-purple">{status}</div>
        )}

        {needsTranslation && pendingSegments && (
          <div className="flex gap-2 mb-3">
            <button onClick={handleTranslate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-bright transition-colors">
              <Translate size={18} weight="bold" />翻译为双语
            </button>
            <button onClick={() => doLoad(pendingSegments!)}
              className="flex-1 py-2.5 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink-dim hover:text-ink transition-colors">
              直接加载
            </button>
          </div>
        )}

        <div className="space-y-3">
          <button onClick={() => srtInputRef.current?.click()}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-surface-border hover:border-purple/30 text-left transition-colors group">
            <FileText size={24} weight="regular" className="text-ink-muted group-hover:text-purple transition-colors shrink-0" />
            <div>
              <div className="text-sm font-medium text-ink">上传双语字幕</div>
              <div className="text-[11px] text-ink-muted">SRT 格式，自动解析中英双语</div>
            </div>
            <input ref={srtInputRef} type="file" accept=".srt,.vtt,.ass,.txt" onChange={handleUploadSrt} className="hidden" />
          </button>

          <button onClick={() => setStatus('云端 AI 字幕生成需要配置 API 密钥。即将支持。')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-surface-border hover:border-purple/30 text-left transition-colors group">
            <Robot size={24} weight="regular" className="text-ink-muted group-hover:text-purple transition-colors shrink-0" />
            <div>
              <div className="text-sm font-medium text-ink">AI 生成字幕 — 云端 API</div>
              <div className="text-[11px] text-ink-muted">高精度，需要联网 + API Key</div>
            </div>
          </button>

          <button onClick={() => setStatus('本地 Whisper 模型即将集成。')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-surface-border hover:border-purple/30 text-left transition-colors group">
            <Cpu size={24} weight="regular" className="text-ink-muted group-hover:text-purple transition-colors shrink-0" />
            <div>
              <div className="text-sm font-medium text-ink">AI 生成字幕 — 本地模型</div>
              <div className="text-[11px] text-ink-muted">离线运行，使用 Whisper WASM</div>
            </div>
          </button>

          <button onClick={onClose} className="w-full py-2 text-xs text-ink-muted hover:text-ink transition-colors">
            跳过，仅播放视频
          </button>
        </div>
      </div>
    </div>
  )
}