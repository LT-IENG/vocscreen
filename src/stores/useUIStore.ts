import { create } from 'zustand'
import type { SubtitleDisplay } from '../types'

export type InteractionMode = 'play' | 'interact'
export type ActivePanel = 'none' | 'review' | 'dashboard' | 'profile' | 'stats'
export type AppScreen = 'landing' | 'wordbook-select' | 'app' | 'memorize'
export type SubtitleSourceOption = 'none' | 'upload' | 'api' | 'local'

export type AsrProvider = 'auto' | 'local' | 'cloud'
export type TranslationProvider = 'auto' | 'local' | 'cloud'

export type DictSense = {
  pos?: string
  definition: string
  example?: string
}

export type DefinitionCardStatus = 'wordbook' | 'loading' | 'api' | 'failed'

export type DefinitionCardState = {
  word: string
  lemma: string
  spelling: string
  definition: string
  phonetics: string
  level: string
  position: { x: number; y: number }
  segmentId: string
  senses?: DictSense[]
  status?: DefinitionCardStatus
} | null

export type HoveredWordState = {
  word: string
  lemma: string
  definition: string
  phonetics: string
  level: string
  isCaptured: boolean
  isHighlighted: boolean
  position: { x: number; y: number }
} | null

interface UIState {
  interactionMode: InteractionMode
  activePanel: ActivePanel
  subtitleDisplay: SubtitleDisplay
  definitionCard: DefinitionCardState
  hoveredWord: HoveredWordState
  selectedWordBookId: string | null
  appScreen: AppScreen
  subtitleSourceModal: { videoFile: File } | null
  theme: 'dark' | 'light'
  subtitleFontSize: 's' | 'm' | 'l'
  asrProvider: AsrProvider
  translationProvider: TranslationProvider
  authModal: boolean

  setMode: (mode: InteractionMode) => void
  toggleMode: () => void
  openPanel: (panel: ActivePanel) => void
  closePanel: () => void
  setSubtitleDisplay: (mode: SubtitleDisplay) => void
  setSubtitleFontSize: (size: 's' | 'm' | 'l') => void
  showDefinition: (card: DefinitionCardState) => void
  hideDefinition: () => void
  setHoveredWord: (hw: HoveredWordState) => void
  clearHoveredWord: () => void
  setSelectedWordBookId: (id: string | null) => void
  setAppScreen: (screen: AppScreen) => void
  openSubtitleSourceModal: (videoFile: File) => void
  closeSubtitleSourceModal: () => void
  setTheme: (theme: 'dark' | 'light') => void
  setAsrProvider: (provider: AsrProvider) => void
  setTranslationProvider: (provider: TranslationProvider) => void
  openAuthModal: () => void
  closeAuthModal: () => void
}

const LS_KEY = 'vocScreenV2Prefs'

function loadPrefs() {
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {}
}

function savePrefs(prefs: Record<string, unknown>) {
  const existing = loadPrefs()
  localStorage.setItem(LS_KEY, JSON.stringify({ ...existing, ...prefs }))
}

const prefs = loadPrefs()

export const useUIStore = create<UIState>((set) => ({
  interactionMode: 'play',
  activePanel: 'none',
  subtitleDisplay: prefs.subtitleDisplay ?? 'bilingual',
  definitionCard: null,
  hoveredWord: null,
  selectedWordBookId: prefs.selectedWordBookId ?? null,
  appScreen: 'landing',
  subtitleSourceModal: null,
  theme: prefs.theme ?? 'dark',
  subtitleFontSize: prefs.subtitleFontSize ?? 'm',
  asrProvider: prefs.asrProvider ?? 'auto',
  translationProvider: prefs.translationProvider ?? 'auto',
  authModal: false,

  setMode: (mode) => set({ interactionMode: mode }),
  toggleMode: () =>
    set((s) => ({
      interactionMode: s.interactionMode === 'play' ? 'interact' : 'play',
    })),

  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: 'none', definitionCard: null, hoveredWord: null }),

  setSubtitleDisplay: (mode) => {
    set({ subtitleDisplay: mode })
    savePrefs({ subtitleDisplay: mode })
  },

  showDefinition: (card) => set({ definitionCard: card }),
  hideDefinition: () => set({ definitionCard: null }),
  setHoveredWord: (hw) => set({ hoveredWord: hw }),
  clearHoveredWord: () => set({ hoveredWord: null }),
  setSelectedWordBookId: (id) => {
    set({ selectedWordBookId: id })
    savePrefs({ selectedWordBookId: id ?? undefined })
  },

  setAppScreen: (screen) => {
    if (screen === 'app') savePrefs({ hasVisited: true })
    set({ appScreen: screen })
  },

  openSubtitleSourceModal: (videoFile) =>
    set({ subtitleSourceModal: { videoFile } }),
  closeSubtitleSourceModal: () => set({ subtitleSourceModal: null }),

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
    savePrefs({ theme })
  },

  setSubtitleFontSize: (size) => {
    set({ subtitleFontSize: size })
    savePrefs({ subtitleFontSize: size })
  },

  setAsrProvider: (provider) => {
    set({ asrProvider: provider })
    savePrefs({ asrProvider: provider })
  },

  setTranslationProvider: (provider) => {
    set({ translationProvider: provider })
    savePrefs({ translationProvider: provider })
  },

  openAuthModal: () => set({ authModal: true }),
  closeAuthModal: () => set({ authModal: false }),
}))