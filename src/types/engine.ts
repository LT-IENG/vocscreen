import type { AsrChannel, AsrStatus } from './subtitle'

export type AsrProvider = 'auto' | 'local' | 'cloud'
export type TranslationProvider = 'auto' | 'local' | 'cloud'

export interface AsrProgress {
  status: AsrStatus
  progress: number
  channel: AsrChannel
}

export interface AsrEngineConfig {
  provider: AsrProvider
  modelSize: 'tiny' | 'base'
  onProgress: (progress: AsrProgress) => void
}

export interface TranslationEngineConfig {
  provider: TranslationProvider
  onProgress: (progress: number) => void
}

export interface RawTranscriptionSegment {
  startTime: number
  endTime: number
  text: string
}