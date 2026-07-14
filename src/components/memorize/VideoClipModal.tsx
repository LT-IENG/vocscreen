import { useRef, useState, useEffect, useCallback } from 'react'
import { X, Play, Pause, ArrowsClockwise } from '@phosphor-icons/react'

interface Props {
  videoUrl: string
  clipStart: number
  clipEnd: number
  sentenceEn?: string
  sentenceZh?: string
  hideTranslation?: boolean
  onClose: () => void
}

export function VideoClipModal({ videoUrl, clipStart, clipEnd, sentenceEn, sentenceZh, hideTranslation = false, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(clipStart)

  const duration = clipEnd - clipStart

  // Seek to clipStart when video is ready
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = clipStart
    setIsLoading(false)
  }, [clipStart])

  // Stop at clipEnd
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    if (video.currentTime >= clipEnd) {
      video.pause()
      setIsPlaying(false)
    }
  }, [clipEnd])

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      if (video.currentTime >= clipEnd - 0.1) {
        video.currentTime = clipStart
      }
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [clipStart, clipEnd])

  const handleReplay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = clipStart
    video.play()
    setIsPlaying(true)
  }, [clipStart])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const handleEnded = () => setIsPlaying(false)
    video.addEventListener('ended', handleEnded)
    return () => video.removeEventListener('ended', handleEnded)
  }, [])

  const progress = duration > 0 ? Math.min(100, ((currentTime - clipStart) / duration) * 100) : 0

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-surface-0/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-1 border border-surface-border rounded-2xl shadow-modal w-full max-w-[640px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
          <span className="text-sm font-medium text-ink">原片片段</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onCanPlay={() => setIsLoading(false)}
            className="w-full max-h-[360px]"
            playsInline
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-8 h-8 border-2 border-purple border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Subtitle overlay */}
        {(sentenceEn || (sentenceZh && !hideTranslation)) && (
          <div className="px-4 py-3 bg-surface-2/60 border-b border-surface-border">
            {sentenceEn && (
              <p className="text-sm text-ink leading-relaxed">{sentenceEn}</p>
            )}
            {sentenceZh && !hideTranslation && (
              <p className="text-xs text-ink-dim mt-1 leading-relaxed">{sentenceZh}</p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-purple text-white hover:bg-purple-bright transition-colors disabled:opacity-40 shrink-0"
          >
            {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
          </button>

          <button
            onClick={handleReplay}
            disabled={isLoading}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-3 text-ink-dim hover:text-ink transition-colors disabled:opacity-40 shrink-0"
            title="重播片段"
          >
            <ArrowsClockwise size={16} />
          </button>

          {/* Progress bar */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[11px] text-ink-muted font-mono tabular-nums w-10 text-right">
              {formatTime(Math.max(0, currentTime - clipStart))}
            </span>
            <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple rounded-full transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] text-ink-muted font-mono tabular-nums w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
