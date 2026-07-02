import { useEffect, useRef } from 'react'
import { StartPage } from './components/landing/StartPage'
import { WordBookSelect } from './components/landing/WordBookSelect'
import { TopToolbar } from './components/toolbar/TopToolbar'
import { VideoPlayer } from './components/player/VideoPlayer'
import { VideoDropZone } from './components/player/VideoDropZone'
import { VideoControls } from './components/player/VideoControls'
import { DefinitionCard } from './components/vocab/DefinitionCard'
import { ReviewPanel } from './components/vocab/ReviewPanel'
import { LearningModal } from './components/vocab/LearningModal'
import { DashboardPanel } from './components/vocab/DashboardPanel'
import { ProfilePanel } from './components/vocab/ProfilePanel'
import { StatsPanel } from './components/stats/StatsPanel'
import { MemorizeScreen } from './components/memorize/MemorizeScreen'
import { SubtitleSourceModal } from './components/player/SubtitleSourceModal'
import { usePlayerStore } from './stores/usePlayerStore'
import { useVocabStore } from './stores/useVocabStore'
import { useReviewStore } from './stores/useReviewStore'
import { useUIStore } from './stores/useUIStore'
import { useSubtitleStore } from './stores/useSubtitleStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useDemoTimeline } from './hooks/useDemoTimeline'
import { useVideoEndDetection } from './hooks/useVideoEndDetection'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/ui/Toast'
import type { WordBook } from './types'

function MainApp() {
  const hasVideo = usePlayerStore((s) => s.hasVideo)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const definitionCard = useUIStore((s) => s.definitionCard)
  const subtitleSourceModal = useUIStore((s) => s.subtitleSourceModal)
  const closeSubtitleSourceModal = useUIStore((s) => s.closeSubtitleSourceModal)

  useKeyboardShortcuts()
  useDemoTimeline()
  useVideoEndDetection()

  return (
    <div className="relative w-full h-dvh bg-surface-0 overflow-hidden select-none">
      <TopToolbar />

      <main className="relative w-full h-full">
        <ErrorBoundary>
          {hasVideo ? (
            <>
              <VideoPlayer />
              <VideoControls />
              {!isPlaying && usePlayerStore.getState().currentTime > 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-xs text-ink-muted/60 pointer-events-none">
                  点击单词查看释义 · Space 继续
                </div>
              )}
            </>
          ) : (
            <VideoDropZone />
          )}
        </ErrorBoundary>
      </main>

      {!hasVideo && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <span className="text-[10px] text-ink-muted/40">拖入视频文件开始</span>
        </div>
      )}

      <DefinitionCard />
      <ReviewPanel />
      <LearningModal />
      <DashboardPanel />
      <ProfilePanel />
      <StatsPanel />

      {subtitleSourceModal && (
        <SubtitleSourceModal
          file={subtitleSourceModal.videoFile}
          onClose={closeSubtitleSourceModal}
        />
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-ink-muted/30 pointer-events-none select-none">
        Space 暂停/播放 · ←→ 进退 · 暂停后点击单词查看释义 · R 复习 · S 统计
      </div>

      <Toaster />
    </div>
  )
}

export default function App() {
  const appScreen = useUIStore((s) => s.appScreen)
  const initialized = useRef(false)

  // Fix #11: Init at top level so it doesn't re-run when switching screens
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const { loadPersistedWords, loadNotebooks, loadBook, loadedBooks } = useVocabStore.getState()
    const { loadPersistedSchedules, getDueWords } = useReviewStore.getState()

    loadPersistedWords()
    loadNotebooks()
    loadPersistedSchedules().then(() => getDueWords())

    // Load default CET6 wordbook
    if (!loadedBooks.has('cet6')) {
      fetch('/wordbooks/cet6.json')
        .then((r) => r.json())
        .then((book: WordBook) => {
          loadBook(book)
          if (!useUIStore.getState().selectedWordBookId) {
            useUIStore.getState().setSelectedWordBookId(book.id)
          }
        })
        .catch(() => {})
    }
  }, [])

  switch (appScreen) {
    case 'landing':
      return <StartPage />
    case 'wordbook-select':
      return <WordBookSelect />
    case 'app':
      return <MainApp />
    case 'memorize':
      return <MemorizeScreen />
    default:
      return <StartPage />
  }
}