export type WordBookId = 'cet4' | 'cet6' | 'ielts' | 'toefl' | 'kaoyan'

export interface WordBook {
  id: WordBookId
  name: string
  entries: WordEntry[]
}

export interface WordEntry {
  id: string
  spelling: string
  lemma: string
  phonetics: string
  definition: string
  level: string
  frequency: number
  tags: string[]
}

export interface SourceContext {
  videoId: string
  subtitleSegmentId: string
  timestamp: number
  sentenceEn: string
  sentenceZh: string
  shortClip?: Blob
  videoClipStart: number
}

export type WordStatus = 'new' | 'learning' | 'fuzzy' | 'mastered'

export interface Notebook {
  id: string
  name: string
  createdAt: number
  isDefault?: boolean
}

export interface CapturedWord {
  id: string
  wordEntryId: string
  spelling: string
  lemma: string
  source: SourceContext
  status: WordStatus
  capturedAt: number
  learnedAt?: number
  notebookId?: string
}