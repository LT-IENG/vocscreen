import { create } from 'zustand'

interface PlayerState {
  videoBlobUrl: string | null
  videoTitle: string
  videoId: string
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isFullscreen: boolean
  hasVideo: boolean
  isDemoMode: boolean

  loadVideo: (file: File) => void
  loadVideoUrl: (url: string, title: string, videoId: string) => void
  startDemo: (title?: string, videoId?: string) => void
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  toggleFullscreen: () => void
  reset: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  videoBlobUrl: null,
  videoTitle: '',
  videoId: '',
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isFullscreen: false,
  hasVideo: false,
  isDemoMode: false,

  startDemo: (title, videoId) =>
    set({
      hasVideo: true,
      isDemoMode: true,
      isPlaying: false,
      currentTime: 0,
      videoTitle: title || 'Demo Mode',
      videoId: videoId || 'demo',
    }),

  loadVideo: (file) => {
    if (get().videoBlobUrl) {
      URL.revokeObjectURL(get().videoBlobUrl)
    }
    const url = URL.createObjectURL(file)
    const videoId = crypto.randomUUID()
    set({
      videoBlobUrl: url,
      videoTitle: file.name.replace(/\.[^/.]+$/, ''),
      videoId,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      hasVideo: true,
      isDemoMode: false,
    })
  },

  loadVideoUrl: (url, title, videoId) => {
    set({
      videoBlobUrl: url,
      videoTitle: title,
      videoId,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      hasVideo: true,
      isDemoMode: false,
    })
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  seek: (time) => set({ currentTime: time }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

  reset: () => {
    if (get().videoBlobUrl) URL.revokeObjectURL(get().videoBlobUrl!)
    set({
      videoBlobUrl: null,
      videoTitle: '',
      videoId: '',
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      hasVideo: false,
      isDemoMode: false,
    })
  },
}))