import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { SubtitleCanvas } from './SubtitleCanvas'
import { FilmReel } from '@phosphor-icons/react'

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const {
    videoBlobUrl,
    isPlaying,
    currentTime,
    volume,
    hasVideo,
    setCurrentTime,
    setDuration,
    pause,
  } = usePlayerStore()
  const isDemoMode = usePlayerStore((s) => s.isDemoMode)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onLoadedMeta = () => {
      if (video.duration && isFinite(video.duration)) setDuration(video.duration)
    }
    const onEnded = () => pause()

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMeta)
    video.addEventListener('ended', onEnded)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMeta)
      video.removeEventListener('ended', onEnded)
    }
  }, [videoBlobUrl, setCurrentTime, setDuration, pause])

  useEffect(() => { setVideoError(false) }, [videoBlobUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) video.play().catch(() => {})
    else video.pause()
  }, [isPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime
    }
  }, [currentTime, isPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
  }, [volume])

  if (!hasVideo) return null

  const showVideo = !isDemoMode && videoBlobUrl
  const title = usePlayerStore((s) => s.videoTitle)

  return (
    <div className="absolute inset-0 bg-black">
      {showVideo && (
        <video
          ref={videoRef}
          src={videoBlobUrl}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          onError={() => {
            setVideoError(true)
            const ps = usePlayerStore.getState()
            if (!ps.isDemoMode) {
              ps.startDemo(ps.videoTitle)
            }
          }}
          crossOrigin="anonymous"
          playsInline
        />
      )}
      {(isDemoMode || !videoBlobUrl || videoError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-0">
          <div className="text-center space-y-4">
            <FilmReel size={48} weight="thin" className="text-ink-muted/30 mx-auto" />
            <p className="text-xl font-display font-semibold text-ink">
              {title || '词映 VocScreen'}
            </p>
            {isDemoMode && (
              <>
                <p className="text-sm text-ink-dim">Demo Mode</p>
                <p className="text-xs text-ink-muted">字幕已加载，按 Space 开始播放</p>
              </>
            )}
            {videoError && (
              <p className="text-xs text-accent-rose">浏览器不支持此视频编码（尝试转码为 MP4/H.264）</p>
            )}
            {!isDemoMode && !videoBlobUrl && !videoError && (
              <p className="text-xs text-ink-muted">暂无可播放的视频画面，字幕正常工作</p>
            )}
          </div>
        </div>
      )}

      <SubtitleCanvas />
    </div>
  )
}