export interface WordAlignment {
  wordEn: string
  wordZh: string
  startChar: number
  endChar: number
}

export interface HighlightedWord {
  word: string
  lemma: string
  matchedBookId: string
}

export interface SubtitleSegment {
  id: string
  videoId: string
  startTime: number
  endTime: number
  textEn: string
  textZh: string
  alignment: WordAlignment[]
  highlightedWords: HighlightedWord[]
}

export type AsrStatus = 'idle' | 'processing' | 'done' | 'error'
export type AsrChannel = 'local' | 'cloud' | 'mock' | null
export type SubtitleSource = 'asr' | 'external' | 'mock' | null
export type SubtitleDisplay = 'bilingual' | 'en' | 'zh'

export interface MockSubtitleFile {
  videoId: string
  title: string
  duration: number
  segments: SubtitleSegment[]
  matchSummary: {
    bookId: string
    bookName: string
    totalMatches: number
    matchList: string[]
  }
}