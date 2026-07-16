import { useCallback, useRef, useState, type DragEvent } from 'react'
import { FilmReel, UploadSimple, WarningCircle, PlayCircle } from '@phosphor-icons/react'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { useUIStore } from '../../stores/useUIStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { buildWordSet, rematchAll, getMatchList } from '../../engines/matching/MatcherEngine'
import { motion } from 'motion/react'
import mockSubtitles from '../../mock/friends-s01e01/subtitles.json'
import mockMetadata from '../../mock/friends-s01e01/metadata.json'

// COS video URL (do not auto-test — requires user authorization to access)
const DEMO_VIDEO_URL = 'https://tencent-1414173792.cos.ap-guangzhou.myqcloud.com/S01E01_compress2.mp4'
const DEMO_VIDEO_TITLE = 'Friends S01E01'
const DEMO_VIDEO_ID = 'friends-s01e01'

export function VideoDropZone() {
  const loadVideo = usePlayerStore((s) => s.loadVideo)
  const loadVideoUrl = usePlayerStore((s) => s.loadVideoUrl)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isVideoFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const videoExts = ['mp4', 'm4v', 'mov', 'mkv', 'webm', 'avi', 'wmv', 'flv']
    if (ext && videoExts.includes(ext)) return true
    if (file.type.startsWith('video/')) return true
    return false
  }

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      if (!isVideoFile(file)) {
        setError(`不支持的文件格式 ".${file.name.split('.').pop()}"。请使用 MP4 / M4V / MOV / MKV 格式。`)
        return
      }
      loadVideo(file)
      useUIStore.getState().openSubtitleSourceModal(file)
    },
    [loadVideo]
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleLoadDemo = useCallback(async () => {
    setError(null)
    setLoadingDemo(true)
    try {
      // 字幕直接从 JS 包中读取，不走网络请求，100% 可靠
      const segments = mockSubtitles as any[]
      const meta = mockMetadata as any

      if (segments && segments.length > 0) {
        const vocabState = useVocabStore.getState()
        const currentBookId = useUIStore.getState().selectedWordBookId
        if (currentBookId && vocabState.loadedBooks.has(currentBookId as any)) {
          const book = vocabState.loadedBooks.get(currentBookId as any)!
          const wordSet = buildWordSet(book)
          const newSegments = rematchAll(segments, wordSet, book.id)
          const matchList = getMatchList(newSegments)
          useSubtitleStore.getState().loadMock({
            segments: newSegments,
            matchSummary: {
              bookId: book.id,
              bookName: book.name,
              totalMatches: matchList.length,
              matchList,
            },
            title: meta.title,
            duration: meta.duration,
          })
        } else {
          useSubtitleStore.getState().loadMock({
            segments,
            matchSummary: meta.matchSummary ?? { bookId: '', bookName: '', totalMatches: 0, matchList: [] },
            title: meta.title,
            duration: meta.duration,
          })
        }
      }

      // 加载视频
      loadVideoUrl(DEMO_VIDEO_URL, DEMO_VIDEO_TITLE, DEMO_VIDEO_ID)
    } catch (err) {
      setError('加载演示视频失败，请检查网络后重试')
      console.error('[Demo] error:', err)
    } finally {
      setLoadingDemo(false)
    }
  }, [loadVideoUrl])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-0"
    >
      {/* Main drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center gap-6 p-16 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
          isDragOver
            ? 'border-purple bg-purple/5 scale-[1.02]'
            : 'border-surface-border hover:border-ink-muted'
        }`}
      >
        <div className={`p-5 rounded-full ${isDragOver ? 'bg-purple/15' : 'bg-surface-2'}`}>
          {isDragOver ? (
            <UploadSimple size={40} weight="fill" className="text-purple" />
          ) : (
            <FilmReel size={40} weight="regular" className="text-ink-muted" />
          )}
        </div>

        <div className="text-center space-y-2">
          <p className="text-ink font-medium text-lg">拖入视频文件开始学习</p>
          <p className="text-ink-muted text-sm">支持 MP4 / M4V / MOV / MKV，也可点击浏览</p>

          {error && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-xs">
              <WarningCircle size={16} weight="fill" />
              {error}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Demo video button — separated from drop zone */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <button
          onClick={handleLoadDemo}
          disabled={loadingDemo}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-2 border border-surface-border hover:border-purple/40 hover:bg-purple/5 text-sm text-ink-dim hover:text-purple transition-colors disabled:opacity-50"
        >
          <PlayCircle size={18} weight="fill" />
          {loadingDemo ? '加载中...' : '加载演示视频'}
        </button>
        <p className="text-[10px] text-ink-muted/50">无需上传，直接体验 Friends S01E01 演示</p>
      </div>
    </motion.div>
  )
}
