export interface VideoMetadata {
  id: string
  title: string
  filePath?: string
  duration: number
}

export interface VideoState {
  id: string
  blobUrl: string
  title: string
  duration: number
  isPlaying: boolean
  currentTime: number
  volume: number
  isFullscreen: boolean
  isSeeking: boolean
}