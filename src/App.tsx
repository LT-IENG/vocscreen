import { useEffect, useRef } from 'react'
import { StartPage } from './components/landing/StartPage'
import { WordBookSelect } from './components/landing/WordBookSelect'
import { TopToolbar } from './components/toolbar/TopToolbar'
import { VideoPlayer } from './components/player/VideoPlayer'
import { VideoDropZone } from './components/player/VideoDropZone'
import { VideoControls } from './components/player/VideoControls'
import { DefinitionCard } from './components/vocab/DefinitionCard'

import { DashboardPanel } from './components/vocab/DashboardPanel'
import { ProfilePanel } from './components/vocab/ProfilePanel'
import { StatsPanel } from './components/stats/StatsPanel'
import { SubtitleSourceModal } from './components/player/SubtitleSourceModal'
import { AuthModal } from './components/auth/AuthModal'
import { MemorizeScreen } from './components/memorize/MemorizeScreen'
import { usePlayerStore } from './stores/usePlayerStore'
import { useVocabStore } from './stores/useVocabStore'
import { useReviewStore } from './stores/useReviewStore'
import { useUIStore } from './stores/useUIStore'
import { useAuthStore } from './stores/useAuthStore'
import { useSubtitleStore } from './stores/useSubtitleStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useDemoTimeline } from './hooks/useDemoTimeline'
import { useVideoEndDetection } from './hooks/useVideoEndDetection'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/ui/Toast'
import { pullCloudToLocal, migrateLocalToCloud } from './lib/sync'
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
        Space 暂停/播放 · ←→ 进退 · 暂停后点击单词查看释义 · R 背单词 · S 统计
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

    // 检测 ?screen=memorize 参数（手机扫码直入背单词）
    const params = new URLSearchParams(window.location.search)
    if (params.get('screen') === 'memorize') {
      useUIStore.getState().setAppScreen('memorize')
      history.replaceState({}, '', window.location.pathname)
    }

    const { loadPersistedWords, loadNotebooks, loadBook, loadedBooks } = useVocabStore.getState()
    const { loadPersistedSchedules, getDueWords } = useReviewStore.getState()

    loadPersistedWords()
    loadNotebooks()
    loadPersistedSchedules().then(() => getDueWords())

    // Init auth + sync on login
    const { init: initAuth } = useAuthStore.getState()
    initAuth().then(async () => {
      const { user } = useAuthStore.getState()
      if (user) {
        // Logged in: pull cloud data, merge with local, then push
        await pullCloudToLocal(user.id).catch(() => {})
        await loadPersistedWords()
        await loadNotebooks()
        await loadPersistedSchedules().then(() => getDueWords())
        await migrateLocalToCloud(user.id).catch(() => {})
      }
    }).catch(() => {})

    // Watch for login/logout to trigger sync
    const unsub = useAuthStore.subscribe(async (state, prev) => {
      if (!prev.user && state.user) {
        // Just logged in
        try {
          await pullCloudToLocal(state.user.id)
          await useVocabStore.getState().loadPersistedWords()
          await useVocabStore.getState().loadNotebooks()
          await useReviewStore.getState().loadPersistedSchedules().then(() => useReviewStore.getState().getDueWords())
          await migrateLocalToCloud(state.user.id)
        } catch {
          // sync failure is non-fatal; local data still works
        }
      }
    })

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

    return () => {
      unsub()
      useAuthStore.getState().cleanup()
    }
  }, [])

  let screen
  switch (appScreen) {
    case 'landing':
      screen = <StartPage />
      break
    case 'wordbook-select':
      screen = <WordBookSelect />
      break
    case 'app':
      screen = <MainApp />
      break
    case 'memorize':
      screen = <MemorizeScreen />
      break
    default:
      screen = <StartPage />
  }

  return (
    <>
      {screen}
      <AuthModal />
    </>
  )
}