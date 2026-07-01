import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../stores/usePlayerStore'
import { useVocabStore } from '../stores/useVocabStore'
import { useUIStore } from '../stores/useUIStore'

export function useVideoEndDetection() {
  const videoEndedFired = useRef(false)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const hasVideo = usePlayerStore((s) => s.hasVideo)

  useEffect(() => {
    if (hasVideo) videoEndedFired.current = false
  }, [hasVideo])

  useEffect(() => {
    if (duration > 0 && !isPlaying && currentTime > 0 && Math.abs(currentTime - duration) < 1.5) {
      if (!videoEndedFired.current) {
        videoEndedFired.current = true
        const newWords = useVocabStore.getState().getNewCapturedWords()
        if (newWords.length > 0) {
          setTimeout(() => useUIStore.getState().openLearningModal(), 500)
        }
      }
    }
  }, [isPlaying, currentTime, duration])
}