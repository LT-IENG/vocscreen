import { useRef, useCallback } from 'react'
import { ChartPie, User, X, UploadSimple } from '@phosphor-icons/react'
import { useUIStore } from '../../stores/useUIStore'
import { useReviewStore } from '../../stores/useReviewStore'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { motion } from 'motion/react'

export function TopToolbar() {
  const { activePanel, openPanel, closePanel, setAppScreen, subtitleDisplay, setSubtitleDisplay, subtitleFontSize, setSubtitleFontSize } = useUIStore()
  const dueCount = useReviewStore((s) => s.dueCount)
  const hasVideo = usePlayerStore((s) => s.hasVideo)
  const videoTitle = usePlayerStore((s) => s.videoTitle)
  const resetPlayer = usePlayerStore((s) => s.reset)
  const resetSubtitles = useSubtitleStore((s) => s.reset)
  const loadVideo = usePlayerStore((s) => s.loadVideo)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBrandClick = () => setAppScreen('landing')

  const handleCloseVideo = () => {
    resetPlayer()
    resetSubtitles()
  }

  const handleChangeVideo = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    resetPlayer()
    resetSubtitles()
    loadVideo(file)
    useUIStore.getState().openSubtitleSourceModal(file)
    e.target.value = ''
  }, [loadVideo, resetPlayer, resetSubtitles])

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="toolbar-glass absolute top-0 left-0 right-0 z-30 flex items-center gap-2 px-4 py-2.5 text-xs overflow-hidden"
    >
      <button
        onClick={handleBrandClick}
        className="flex items-baseline gap-1.5 hover:opacity-80 transition-opacity"
        title="返回开始界面"
      >
        <span className="text-purple font-display font-semibold text-sm tracking-wide select-none">
          词映
        </span>
        <span className="text-purple-bright/60 text-[10px] tracking-[0.12em] uppercase select-none hidden sm:inline">
          VocScreen
        </span>
      </button>

      {hasVideo && (
        <div className="flex items-center gap-0.5 ml-2 border border-surface-border rounded-md overflow-hidden">
          {(['bilingual', 'en', 'zh'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSubtitleDisplay(mode)}
              className={`px-2 py-1 text-[11px] transition-colors ${
                subtitleDisplay === mode
                  ? 'bg-purple/15 text-purple'
                  : 'text-ink-dim hover:text-ink'
              }`}
            >
              {mode === 'bilingual' ? '双语' : mode === 'en' ? 'EN' : '中文'}
            </button>
          ))}
        </div>
      )}

      {hasVideo && (
        <div className="flex items-center gap-0.5 border border-surface-border rounded-md overflow-hidden">
          {(['s', 'm', 'l'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setSubtitleFontSize(size)}
              className={`px-1.5 py-1 text-[11px] transition-colors ${
                subtitleFontSize === size
                  ? 'bg-purple/15 text-purple font-medium'
                  : 'text-ink-dim hover:text-ink'
              }`}
              title={size === 's' ? '小号字幕' : size === 'm' ? '中号字幕' : '大号字幕'}
            >
              {size === 's' ? '小' : size === 'm' ? '中' : '大'}
            </button>
          ))}
        </div>
      )}

      {hasVideo && (
        <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-md bg-surface-2/60 border border-surface-border">
          <span className="text-[11px] text-ink-dim max-w-[140px] truncate hidden sm:inline">
            {videoTitle || '视频'}
          </span>
          <button
            onClick={handleCloseVideo}
            className="p-0.5 rounded text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
            title="关闭当前视频"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      <div className="flex-1" />

      {hasVideo && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            onClick={handleChangeVideo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors"
            title="上传其他视频"
          >
            <UploadSimple size={16} weight="regular" />
            <span className="hidden sm:inline">换视频</span>
          </button>
        </>
      )}

      <button
        onClick={() => activePanel === 'dashboard' ? closePanel() : openPanel('dashboard')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
          activePanel === 'dashboard'
            ? 'bg-purple/15 text-purple'
            : 'text-ink-dim hover:text-ink hover:bg-surface-3'
        }`}
        title="仪表盘"
      >
        <ChartPie size={16} weight="regular" />
        <span className="hidden sm:inline">仪表盘</span>
        {dueCount > 0 && (
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-accent-rose text-[10px] font-semibold text-white">
            {dueCount > 9 ? '9+' : dueCount}
          </span>
        )}
      </button>

      <button
        onClick={() => activePanel === 'profile' ? closePanel() : openPanel('profile')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
          activePanel === 'profile'
            ? 'bg-purple/15 text-purple'
            : 'text-ink-dim hover:text-ink hover:bg-surface-3'
        }`}
        title="我的"
      >
        <User size={16} weight="regular" />
        <span className="hidden sm:inline">我的</span>
      </button>
    </motion.header>
  )
}