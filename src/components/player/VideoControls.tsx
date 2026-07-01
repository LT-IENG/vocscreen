import { useCallback, useRef, type ChangeEvent, type MouseEvent } from 'react'
import { Play, Pause, SpeakerHigh, SpeakerX, ArrowsOut } from '@phosphor-icons/react'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { motion, AnimatePresence } from 'motion/react'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VideoControls() {
  const { isPlaying, currentTime, duration, volume, isFullscreen, hasVideo } = usePlayerStore()
  const { togglePlay, seek, setVolume, toggleFullscreen } = usePlayerStore()
  const seekBarRef = useRef<HTMLInputElement>(null)

  const handleSeekChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      seek(Number(e.target.value))
    },
    [seek]
  )

  const handleSeekBarClick = useCallback(
    (e: MouseEvent<HTMLInputElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      seek(ratio * duration)
    },
    [seek, duration]
  )

  if (!hasVideo) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-3 pt-8 bg-gradient-to-t from-black/80 to-transparent"
      >
        <input
          ref={seekBarRef}
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeekChange}
          onClick={handleSeekBarClick}
          className="w-full mb-2"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded-full text-ink hover:text-purple transition-colors"
          >
            {isPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
          </button>

          <span className="text-xs font-mono text-ink-dim tabular-nums min-w-[80px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          <button
            onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
            className="p-1 text-ink-dim hover:text-ink transition-colors"
          >
            {volume === 0 ? <SpeakerX size={18} weight="regular" /> : <SpeakerHigh size={18} weight="regular" />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-20"
          />

          <button
            onClick={toggleFullscreen}
            className="p-1 text-ink-dim hover:text-ink transition-colors"
          >
            <ArrowsOut size={18} weight="regular" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}