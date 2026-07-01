import { create } from 'zustand'
import type { WordBook, WordEntry, CapturedWord, WordBookId, SourceContext, Notebook } from '../types'
import { db } from '../db/database'
import type { DictSense } from '../engines/dict/DictEngine'
import { buildWordSet, rematchAll, getMatchList } from '../engines/matching/MatcherEngine'

interface DefinitionSense {
  tranCn?: string
  descOther?: string
  pos?: string
  descCn?: string
  tranOther?: string
}

function formatDefinition(def: unknown): string {
  if (typeof def === 'string') return def
  if (!Array.isArray(def) || def.length === 0) return ''
  return def
    .map((sense: DefinitionSense) => {
      const pos = sense.pos ? `${sense.pos}. ` : ''
      const cn = sense.tranCn || ''
      const en = sense.tranOther ? `；${sense.tranOther}` : ''
      return pos + cn + en
    })
    .filter(Boolean)
    .join('；')
}

function parseSenses(def: unknown): DictSense[] | undefined {
  if (typeof def === 'string') return undefined
  if (!Array.isArray(def) || def.length === 0) return undefined
  return def
    .map((sense: DefinitionSense): DictSense | null => {
      const definition = sense.tranCn || sense.tranOther || ''
      if (!definition) return null
      return {
        pos: sense.pos,
        definition: sense.tranCn || '',
        example: sense.tranOther || undefined,
      }
    })
    .filter((s): s is DictSense => s !== null)
}

const CONTRACTIONS: Record<string, string> = {
  "didn't": 'did', "don't": 'do', "doesn't": 'does', "isn't": 'is', "aren't": 'are',
  "wasn't": 'was', "weren't": 'were', "haven't": 'have', "hasn't": 'has', "hadn't": 'had',
  "won't": 'will', "wouldn't": 'would', "shouldn't": 'should', "couldn't": 'could',
  "can't": 'can', "mightn't": 'might', "mustn't": 'must', "needn't": 'need',
  "it's": 'it', "he's": 'he', "she's": 'she', "that's": 'that', "there's": 'there',
  "here's": 'here', "what's": 'what', "who's": 'who', "where's": 'where', "when's": 'when',
  "they're": 'they', "we're": 'we', "you're": 'you', "i'm": 'i',
  "they've": 'they', "we've": 'we', "you've": 'you', "i've": 'i',
  "they'll": 'they', "we'll": 'we', "you'll": 'you', "i'll": 'i', "he'll": 'he', "she'll": 'she',
  "they'd": 'they', "we'd": 'we', "you'd": 'you', "i'd": 'i', "he'd": 'he', "she'd": 'she',
  "let's": 'let',
}

function expandContraction(word: string): string {
  return CONTRACTIONS[word] ?? word
}

interface VocabState {
  loadedBooks: Map<WordBookId, WordBook>
  selectedBookId: WordBookId | null
  combinedDict: Map<string, Omit<WordEntry, 'id' | 'tags' | 'frequency'> & { senses?: DictSense[] }>
  capturedWords: CapturedWord[]
  isBookLoaded: boolean
  notebooks: Notebook[]
  defaultNotebookId: string | null

  loadBook: (book: WordBook) => Promise<void>
  setActiveBook: (bookId: WordBookId) => void
  lookupWord: (rawWord: string) => { spelling: string; lemma: string; phonetics: string; definition: string; level: string; senses?: DictSense[] } | undefined
  getDefinition: (lemma: string) => WordEntry | undefined
  captureWord: (word: string, lemma: string, source: SourceContext, notebookId?: string) => Promise<void>
  removeCapturedWord: (wordId: string) => Promise<void>
  getCapturedWordsForVideo: (videoId: string) => CapturedWord[]
  getNewCapturedWords: () => CapturedWord[]
  markWordAsLearned: (wordId: string) => Promise<void>
  loadPersistedWords: () => Promise<void>
  loadNotebooks: () => Promise<void>
  createNotebook: (name: string) => Promise<Notebook>
  renameNotebook: (id: string, name: string) => Promise<void>
  deleteNotebook: (id: string) => Promise<void>
  setDefaultNotebook: (id: string) => Promise<void>
  moveCapturedWord: (wordId: string, notebookId: string) => Promise<void>
  getCapturedWordsForNotebook: (notebookId: string) => CapturedWord[]
}

export const useVocabStore = create<VocabState>((set, get) => ({
  loadedBooks: new Map(),
  selectedBookId: null,
  combinedDict: new Map(),
  capturedWords: [],
  isBookLoaded: false,
  notebooks: [],
  defaultNotebookId: null,

  loadBook: async (book) => {
    set((s) => {
      const newBooks = new Map(s.loadedBooks)
      newBooks.set(book.id, book)
      const newDict = new Map(s.combinedDict)
      for (const e of book.entries) {
        const key = e.lemma.toLowerCase()
        if (!newDict.has(key)) {
          newDict.set(key, {
            spelling: e.spelling,
            lemma: e.lemma,
            phonetics: e.phonetics,
            definition: formatDefinition(e.definition),
            level: e.level,
            senses: parseSenses(e.definition),
          })
        }
      }
      return { loadedBooks: newBooks, combinedDict: newDict }
    })
    await db.wordEntries.bulkPut(
      book.entries.map((e) => ({
        id: e.id,
        spelling: e.spelling,
        lemma: e.lemma,
        phonetics: e.phonetics,
        definition: formatDefinition(e.definition),
        level: e.level,
        frequency: e.frequency,
        tags: JSON.stringify(e.tags),
      }))
    )
    if (!get().selectedBookId) {
      set({ selectedBookId: book.id, isBookLoaded: true })
    }

    // Re-match existing subtitles with the newly loaded book
    const { useSubtitleStore } = await import('./useSubtitleStore')
    const subtitleState = useSubtitleStore.getState()
    if (subtitleState.segments.length > 0) {
      const wordSet = buildWordSet(book)
      const newSegments = rematchAll(subtitleState.segments, wordSet, book.id)
      const matchList = getMatchList(newSegments)
      useSubtitleStore.setState({
        segments: newSegments,
        matchSummary: { bookId: book.id, bookName: book.name, totalMatches: matchList.length, matchList },
      })
    }
  },

  setActiveBook: (bookId) => set({ selectedBookId: bookId }),

  lookupWord: (rawWord) => {
    const clean = rawWord.toLowerCase().replace(/^[.,!?;:'"()\[\]{}]+|[.,!?;:'"()\[\]{}]+$/g, '').trim()
    const dict = get().combinedDict
    // Direct match (preserves apostrophes: didn't, it's)
    const direct = dict.get(clean)
    if (direct) return direct
    // Expand common contractions: didn't -> did, it's -> it, they're -> they
    const expanded = expandContraction(clean)
    if (expanded !== clean) {
      const exp = dict.get(expanded)
      if (exp) return exp
    }
    return undefined
  },

  getDefinition: (lemma) => {
    const entry = get().combinedDict.get(lemma.toLowerCase())
    return entry ? { ...entry, id: '', tags: [], frequency: 0 } as WordEntry : undefined
  },

  captureWord: async (word, lemma, source, notebookId) => {
    const state = get()
    const targetNotebookId = notebookId || state.defaultNotebookId
    const exists = state.capturedWords.find(
      (w) => w.lemma === lemma && w.source.videoId === source.videoId
    )
    if (exists) return

    const id = crypto.randomUUID()
    const entry = state.lookupWord(lemma)
    const captured: CapturedWord = {
      id,
      wordEntryId: entry ? `${entry.level}-${lemma}` : `custom-${lemma}`,
      spelling: word,
      lemma,
      source,
      status: 'new',
      capturedAt: Date.now(),
      notebookId: targetNotebookId || undefined,
    }
    set((s) => ({ capturedWords: [...s.capturedWords, captured] }))
    await db.capturedWords.put({
      id: captured.id,
      wordEntryId: captured.wordEntryId,
      spelling: captured.spelling,
      lemma: captured.lemma,
      source: JSON.stringify(captured.source),
      status: captured.status,
      capturedAt: captured.capturedAt,
      notebookId: captured.notebookId,
    })
  },

  removeCapturedWord: async (wordId) => {
    set((s) => ({ capturedWords: s.capturedWords.filter((w) => w.id !== wordId) }))
    await db.capturedWords.delete(wordId)
  },

  getCapturedWordsForVideo: (videoId) =>
    get().capturedWords.filter((w) => w.source.videoId === videoId),

  getNewCapturedWords: () => get().capturedWords.filter((w) => w.status === 'new'),

  markWordAsLearned: async (wordId) => {
    set((s) => ({
      capturedWords: s.capturedWords.map((w) =>
        w.id === wordId ? { ...w, status: 'learning' as const, learnedAt: Date.now() } : w
      ),
    }))
    await db.capturedWords.update(wordId, { status: 'learning', learnedAt: Date.now() })
  },

  loadPersistedWords: async () => {
    const records = await db.capturedWords.toArray()
    const words: CapturedWord[] = records
      .map((r) => ({
        id: r.id,
        wordEntryId: r.wordEntryId,
        spelling: r.spelling,
        lemma: r.lemma,
        source: JSON.parse(r.source),
        status: r.status as CapturedWord['status'],
        capturedAt: r.capturedAt,
        learnedAt: r.learnedAt,
        notebookId: r.notebookId,
      }))
      .filter((w) => w.spelling)
    set({ capturedWords: words })
  },

  loadNotebooks: async () => {
    const records = await db.notebooks.toArray()
    const notebooks: Notebook[] = records.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      isDefault: r.isDefault,
    }))
    // Auto-create default notebook if none exists
    if (notebooks.length === 0) {
      const defaultNb: Notebook = {
        id: crypto.randomUUID(),
        name: '默认生词本',
        createdAt: Date.now(),
        isDefault: true,
      }
      await db.notebooks.put({
        id: defaultNb.id,
        name: defaultNb.name,
        createdAt: defaultNb.createdAt,
        isDefault: true,
      })
      notebooks.push(defaultNb)
      set({ notebooks, defaultNotebookId: defaultNb.id })
    } else {
      const defaultNb = notebooks.find((n) => n.isDefault) || notebooks[0]
      set({ notebooks, defaultNotebookId: defaultNb.id })
    }
  },

  createNotebook: async (name) => {
    const nb: Notebook = {
      id: crypto.randomUUID(),
      name: name.trim() || `生词本${get().notebooks.length + 1}`,
      createdAt: Date.now(),
    }
    await db.notebooks.put({
      id: nb.id,
      name: nb.name,
      createdAt: nb.createdAt,
      isDefault: nb.isDefault,
    })
    set((s) => ({ notebooks: [...s.notebooks, nb] }))
    return nb
  },

  renameNotebook: async (id, name) => {
    set((s) => ({
      notebooks: s.notebooks.map((n) => (n.id === id ? { ...n, name } : n)),
    }))
    await db.notebooks.update(id, { name })
  },

  deleteNotebook: async (id) => {
    const state = get()
    if (state.notebooks.length <= 1) return
    // Move words to default notebook
    const defaultId = state.defaultNotebookId
    if (defaultId && defaultId !== id) {
      const wordsToMove = state.capturedWords.filter((w) => w.notebookId === id)
      for (const w of wordsToMove) {
        await db.capturedWords.update(w.id, { notebookId: defaultId })
      }
    }
    set((s) => ({
      notebooks: s.notebooks.filter((n) => n.id !== id),
      capturedWords: s.capturedWords.map((w) =>
        w.notebookId === id && defaultId ? { ...w, notebookId: defaultId } : w
      ),
    }))
    await db.notebooks.delete(id)
  },

  setDefaultNotebook: async (id) => {
    const state = get()
    for (const nb of state.notebooks) {
      await db.notebooks.update(nb.id, { isDefault: nb.id === id })
    }
    set({
      notebooks: state.notebooks.map((n) => ({ ...n, isDefault: n.id === id })),
      defaultNotebookId: id,
    })
  },

  moveCapturedWord: async (wordId, notebookId) => {
    set((s) => ({
      capturedWords: s.capturedWords.map((w) =>
        w.id === wordId ? { ...w, notebookId } : w
      ),
    }))
    await db.capturedWords.update(wordId, { notebookId })
  },

  getCapturedWordsForNotebook: (notebookId) =>
    get().capturedWords.filter((w) => w.notebookId === notebookId),
}))