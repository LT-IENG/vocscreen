import { useEffect, useRef } from 'react'
import { useUIStore } from '../stores/useUIStore'
import { useVocabStore } from '../stores/useVocabStore'
import { usePlayerStore } from '../stores/usePlayerStore'

export function useAutoCapture() {
  const prevCardRef = useRef<string | null>(null)

  useEffect(() => {
    const unsub = useUIStore.subscribe((state) => {
      const card = state.definitionCard
      const currentTime = usePlayerStore.getState().currentTime
      const videoId = usePlayerStore.getState().videoId

      // Only trigger when a new card appears (not on hide)
      if (!card) {
        prevCardRef.current = null
        return
      }

      const cardKey = `${card.word}-${card.segmentId}`
      if (cardKey === prevCardRef.current) return
      prevCardRef.current = cardKey

      if (state.interactionMode === 'interact') {
        const vocabState = useVocabStore.getState()
        const exists = vocabState.capturedWords.find(
          (w) => w.spelling === card.word && w.source.subtitleSegmentId === card.segmentId,
        )
        if (!exists) {
          vocabState.captureWord(card.word, card.lemma, {
            videoId: videoId || 'unknown',
            subtitleSegmentId: card.segmentId,
            timestamp: currentTime,
            sentenceEn: '',
            sentenceZh: '',
            videoClipStart: Math.max(0, currentTime - 2),
          })
        }
      }
    })

    return () => unsub()
  }, [])
}