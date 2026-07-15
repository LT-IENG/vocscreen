import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { SubtitleCanvas } from './SubtitleCanvas'
import { FilmReel } from '@phosphor-icons/react'

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const retryCountRef = useRef(0)
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
  const title = usePlayerStore((s) => s.videoTitle)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onLoadedMeta = () => {
      if (video.duration && isFinite(video.duration)) setDuration(video.duration)
      // 加载成功，重置重试计数
      retryCountRef.current = 0
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

  useEffect(() => {
    setVideoError(false)
    retryCountRef.current = 0
  }, [videoBlobUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.play().catch(() => {
        // Autoplay/play failed — roll back state to paused (#7)
        usePlayerStore.getState().pause()
      })
    } else {
      video.pause()
    }
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

  return (
    <div className="absolute inset-0 bg-black">
      {showVideo && (
        <video
          ref={videoRef}
          src={videoBlobUrl}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          onError={() => {
            // 重试一次（浏览器可能因 CORS 预检或网络抖动中止请求）
            if (retryCountRef.current < 2) {
              retryCountRef.current++
              const video = videoRef.current
              if (video) {
                // 重新触发加载
                video.load()
              }
              return
            }
            // 重试仍失败，显示错误但保持视频元素（不切换到 demo 模式）
            setVideoError(true)
          }}
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
              <p className="text-xs text-accent-rose">视频加载失败，请检查网络或更换视频源</p>
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