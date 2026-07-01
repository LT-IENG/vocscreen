import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../stores/usePlayerStore'

export function useDemoTimeline() {
  const isDemoMode = usePlayerStore((s) => s.isDemoMode)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const duration = usePlayerStore((s) => s.duration)
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime)
  const pause = usePlayerStore((s) => s.pause)
  const intervalRef = useRef<number>(0)

  useEffect(() => {
    if (!isDemoMode) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    if (isPlaying && duration > 0) {
      intervalRef.current = window.setInterval(() => {
        const current = usePlayerStore.getState().currentTime
        const next = current + 0.1
        if (next >= duration - 0.05) {
          pause()
          usePlayerStore.getState().setCurrentTime(duration)
        } else {
          setCurrentTime(next)
        }
      }, 100)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isDemoMode, isPlaying, duration, setCurrentTime, pause])
}