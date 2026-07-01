export interface DictSense {
  pos?: string
  definition: string
  example?: string
}

export interface DictResult {
  spelling: string
  phonetics: string
  senses: DictSense[]
  source: 'wordbook' | 'api'
}

interface FreeDictSense {
  definition?: string
  example?: string
  synonyms?: string[]
  antonyms?: string[]
}

interface FreeDictPhonetic {
  text?: string
  audio?: string
}

interface FreeDictMeaning {
  partOfSpeech?: string
  definitions?: FreeDictSense[]
}

interface FreeDictResponse {
  word?: string
  phonetic?: string
  phonetics?: FreeDictPhonetic[]
  meanings?: FreeDictMeaning[]
  origin?: string
}

const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
const TIMEOUT_MS = 8000
const cache = new Map<string, DictResult>()
const pending = new Map<string, Promise<DictResult | null>>()

export async function fetchWordFromApi(word: string): Promise<DictResult | null> {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, '').trim()
  if (!clean) return null

  if (cache.has(clean)) return cache.get(clean)!
  if (pending.has(clean)) return pending.get(clean)!

  const p = (async (): Promise<DictResult | null> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(API_URL + encodeURIComponent(clean), {
        signal: controller.signal,
      })
      if (!res.ok) return null
      const data: FreeDictResponse[] = await res.json()
      if (!Array.isArray(data) || data.length === 0) return null
      const first = data[0]
      if (!first) return null

      const phonetics =
        first.phonetic ||
        first.phonetics?.find((p) => p.text)?.text ||
        ''

      const senses: DictSense[] = []
      for (const m of first.meanings || []) {
        if (!m.definitions || m.definitions.length === 0) continue
        const top = m.definitions[0]
        if (!top.definition) continue
        senses.push({
          pos: m.partOfSpeech,
          definition: top.definition,
          example: top.example,
        })
      }

      if (senses.length === 0) return null

      const result: DictResult = {
        spelling: first.word || clean,
        phonetics,
        senses,
        source: 'api',
      }
      cache.set(clean, result)
      return result
    } catch {
      return null
    } finally {
      clearTimeout(timer)
      pending.delete(clean)
    }
  })()

  pending.set(clean, p)
  return p
}

export function getCachedApiResult(word: string): DictResult | null {
  return cache.get(word.toLowerCase().replace(/[^a-z'-]/g, '').trim()) || null
}
