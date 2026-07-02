import { useEffect } from 'react'
import { usePlayerStore } from '../stores/usePlayerStore'
import { useUIStore } from '../stores/useUIStore'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
      // Fix #17: Skip contenteditable elements
      if (target.isContentEditable) return

      const player = usePlayerStore.getState()
      const ui = useUIStore.getState()

      switch (e.code) {
        case 'Space': {
          // Fix #17: Don't intercept Space when a button is focused (let it click)
          if (target instanceof HTMLButtonElement) return
          e.preventDefault()
          if (!player.hasVideo) return
          const wasPlaying = player.isPlaying
          player.togglePlay()
          if (wasPlaying) {
            ui.setMode('interact')
          } else {
            ui.setMode('play')
            ui.clearHoveredWord()
            ui.hideDefinition()
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (!player.hasVideo) return
          player.seek(Math.max(0, player.currentTime - 5))
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (!player.hasVideo) return
          player.seek(Math.min(player.duration, player.currentTime + 5))
          break
        }
        case 'KeyR': {
          e.preventDefault()
          ui.activePanel === 'review' ? ui.closePanel() : ui.openPanel('review')
          break
        }
        case 'KeyS': {
          e.preventDefault()
          ui.activePanel === 'stats' ? ui.closePanel() : ui.openPanel('stats')
          break
        }
        case 'Escape': {
          e.preventDefault()
          if (ui.definitionCard) ui.hideDefinition()
          else if (ui.isLearningModalOpen) ui.closeLearningModal()
          else if (ui.activePanel !== 'none') ui.closePanel()
          else if (ui.interactionMode === 'interact') {
            ui.setMode('play')
            if (player.isPlaying) player.pause()
            else player.play()
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}