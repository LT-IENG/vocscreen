import { useRef, useState, useCallback } from 'react'
import { FileText, Robot, Cpu, X, Translate, Gear, Spinner } from '@phosphor-icons/react'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { useUIStore } from '../../stores/useUIStore'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { parseSrt } from '../../engines/subtitle/SrtParser'
import { fillMissingTranslations } from '../../engines/subtitle/TranslateEngine'
import { buildWordSet, rematchAll, getMatchList } from '../../engines/matching/MatcherEngine'
import { runAsr } from '../../engines/asr/AsrEngine'
import { getAsrSettings, saveAsrSettings, hasAsrConfig, type AsrSettings } from '../../lib/asrSettings'
import type { SubtitleSegment } from '../../types'

interface Props { file: File; onClose: () => void }

type ModalView = 'main' | 'local-info' | 'cloud-config' | 'cloud-running'

export function SubtitleSourceModal({ file, onClose }: Props) {
  const srtInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [pendingSegments, setPendingSegments] = useState<SubtitleSegment[] | null>(null)
  const [needsTranslation, setNeedsTranslation] = useState(false)
  const [view, setView] = useState<ModalView>('main')
  const [asrSettings, setAsrSettings] = useState<AsrSettings>(getAsrSettings())

  const doLoad = useCallback((rawSegments: SubtitleSegment[]) => {
    const bookId = useUIStore.getState().selectedWordBookId
    const book = bookId ? useVocabStore.getState().loadedBooks.get(bookId as never) : undefined

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
  }, [doLoad])

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

  const handleSaveAsrSettings = useCallback(() => {
    saveAsrSettings(asrSettings)
    setStatus('ASR 配置已保存')
    setView('main')
  }, [asrSettings])

  const handleRunCloudAsr = useCallback(async () => {
    saveAsrSettings(asrSettings)
    if (!asrSettings.apiUrl || !asrSettings.apiKey) {
      setStatus('请填写 API 地址和密钥')
      return
    }
    setView('cloud-running')
    setStatus('正在上传视频并转录，请耐心等待...')

    try {
      const segments = await runAsr(file, {
        provider: 'cloud',
        modelSize: 'base',
        onProgress: (p) => {
          if (p.status === 'processing') {
            setStatus(`转录中... ${Math.round(p.progress * 100)}%`)
          }
        },
      })

      if (segments.length === 0) {
        setStatus('转录结果为空')
        setView('cloud-config')
        return
      }

      const videoId = usePlayerStore.getState().videoId
      const rawSegments: SubtitleSegment[] = segments.map((seg, i) => ({
        id: `asr-${String(i + 1).padStart(4, '0')}`,
        videoId,
        startTime: Math.round(seg.startTime * 10) / 10,
        endTime: Math.round(seg.endTime * 10) / 10,
        textEn: seg.text,
        textZh: '',
        alignment: [],
        highlightedWords: [],
      }))

      setPendingSegments(rawSegments)
      setNeedsTranslation(true)
      setView('main')
      setStatus(`转录完成，${rawSegments.length} 条字幕。点击翻译补齐中文`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误'
      setStatus(`转录失败：${msg}`)
      setView('cloud-config')
    }
  }, [asrSettings, file])

  return (
    <div
      className="absolute inset-0 z-50 bg-surface-0/70 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-6 w-[420px] max-w-[90vw] shadow-modal">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-ink leading-tight max-w-[300px] truncate">{file.name}</h3>
            <p className="text-xs text-ink-dim mt-1">
              {view === 'local-info' ? '本地 ASR' : view === 'cloud-config' ? '云端 ASR 配置' : view === 'cloud-running' ? '转录中' : '选择字幕来源'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-3"><X size={18} /></button>
        </div>

        {status && view !== 'cloud-running' && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-purple/10 border border-purple/20 text-xs text-purple">{status}</div>
        )}

        {/* 主视图 */}
        {view === 'main' && (
          <>
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
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">上传双语字幕</div>
                  <div className="text-[11px] text-ink-muted">SRT 格式，自动解析中英双语</div>
                </div>
                <input ref={srtInputRef} type="file" accept=".srt,.vtt,.ass,.txt" onChange={handleUploadSrt} className="hidden" />
              </button>

              <button onClick={() => { setView('cloud-config'); setStatus(null) }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-surface-border hover:border-purple/30 text-left transition-colors group">
                <Robot size={24} weight="regular" className="text-ink-muted group-hover:text-purple transition-colors shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">AI 生成字幕 — 云端 API</div>
                  <div className="text-[11px] text-ink-muted">高精度，需配置 API Key</div>
                </div>
                {hasAsrConfig() && (
                  <Gear size={16} className="text-purple/60" />
                )}
              </button>

              <button onClick={() => { setView('local-info'); setStatus(null) }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-surface-border hover:border-purple/30 text-left transition-colors group">
                <Cpu size={24} weight="regular" className="text-ink-muted group-hover:text-purple transition-colors shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">AI 生成字幕 — 本地模型</div>
                  <div className="text-[11px] text-ink-muted">离线运行，使用 Whisper WASM</div>
                </div>
              </button>

              <button onClick={onClose} className="w-full py-2 text-xs text-ink-muted hover:text-ink transition-colors">
                跳过，仅播放视频
              </button>
            </div>
          </>
        )}

        {/* 本地 ASR 提示 */}
        {view === 'local-info' && (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-3">
              <Cpu size={48} weight="duotone" className="text-purple mx-auto" />
              <div>
                <p className="text-base font-semibold text-ink">本地 ASR 即将上线</p>
                <p className="text-sm text-ink-dim mt-2 leading-relaxed">
                  本地 Whisper WASM 模型空间占用较大（约 40-80MB），
                  首次加载耗时较长。将在后续版本通过 Web Worker 集成，
                  届时即可离线转录。
                </p>
              </div>
              <div className="flex gap-2 justify-center mt-4">
                <button onClick={() => setView('main')}
                  className="px-5 py-2 rounded-lg bg-surface-2 text-sm text-ink-dim hover:text-ink transition-colors">
                  返回
                </button>
                <button onClick={() => { setView('cloud-config'); setStatus(null) }}
                  className="px-5 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-bright transition-colors">
                  使用云端 ASR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 云端 ASR 配置 */}
        {(view === 'cloud-config' || view === 'cloud-running') && (
          <div className="space-y-4">
            {view === 'cloud-running' ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Spinner size={40} className="text-purple animate-spin" />
                <p className="text-sm text-ink-dim text-center max-w-[320px]">{status || '正在转录...'}</p>
                <p className="text-xs text-ink-muted">大文件可能需要 1-3 分钟，请勿关闭窗口</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-ink-dim mb-1.5">API 地址</label>
                    <input
                      type="url"
                      value={asrSettings.apiUrl}
                      onChange={(e) => setAsrSettings(s => ({ ...s, apiUrl: e.target.value }))}
                      placeholder="https://api.openai.com/v1/audio/transcriptions"
                      className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-purple/40"
                    />
                    <p className="text-[10px] text-ink-muted mt-1">兼容 OpenAI Whisper API 格式</p>
                  </div>
                  <div>
                    <label className="block text-xs text-ink-dim mb-1.5">API Key</label>
                    <input
                      type="password"
                      value={asrSettings.apiKey}
                      onChange={(e) => setAsrSettings(s => ({ ...s, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-purple/40"
                    />
                    <p className="text-[10px] text-ink-muted mt-1">密钥仅保存在本地浏览器，不会上传</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-ink-dim mb-1.5">模型</label>
                      <input
                        type="text"
                        value={asrSettings.model}
                        onChange={(e) => setAsrSettings(s => ({ ...s, model: e.target.value }))}
                        placeholder="whisper-1"
                        className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-purple/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-dim mb-1.5">语言</label>
                      <input
                        type="text"
                        value={asrSettings.language}
                        onChange={(e) => setAsrSettings(s => ({ ...s, language: e.target.value }))}
                        placeholder="en"
                        className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-purple/40"
                      />
                    </div>
                  </div>
                </div>

                {status && (
                  <div className="px-3 py-2 rounded-lg bg-accent-rose/10 border border-accent-rose/20 text-xs text-accent-rose">{status}</div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setView('main')}
                    className="px-4 py-2 rounded-lg bg-surface-2 text-sm text-ink-dim hover:text-ink transition-colors">
                    返回
                  </button>
                  <button onClick={handleSaveAsrSettings}
                    className="px-4 py-2 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink-dim hover:text-ink transition-colors">
                    仅保存
                  </button>
                  <button onClick={handleRunCloudAsr}
                    disabled={!asrSettings.apiUrl || !asrSettings.apiKey}
                    className="flex-1 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    保存并转录
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
