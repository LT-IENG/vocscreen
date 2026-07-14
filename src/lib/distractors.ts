import type { WordBook, WordBookId } from '../types'

interface DistractorOption {
  text: string
  pos: string
}

function extractPos(definition: string): string {
  if (typeof definition !== 'string') return 'other'
  const match = definition.match(/^(n\.|v\.|vt\.|vi\.|adj\.|adv\.|prep\.|conj\.|pron\.|art\.|num\.)/)
  return match ? match[1] : 'other'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const GENERIC_DISTRACTORS = [
  '物品，东西',
  '普通的，平常的',
  '移动，改变',
  '非常，极其',
  '状态，状况',
  '重要的，必要的',
]

export function stripEnglish(def: string): string {
  if (typeof def !== 'string') return ''
  const cleaned = def
    .split('；')
    .map(part => part.trim())
    .map(part => part.replace(/^(n|v|vt|vi|adj|adv|prep|conj|pron|art|num)\.\s*/i, ''))
    .filter(part => {
      const chineseChars = part.match(/[\u4e00-\u9fff]/g)
      return chineseChars && chineseChars.length > 0
    })
    .join('；')
  return cleaned || def
}

function normalizeDefinition(def: unknown): string {
  if (typeof def === 'string') return stripEnglish(def)
  if (Array.isArray(def)) {
    return def
      .map((s: unknown) => {
        if (typeof s === 'string') return stripEnglish(s)
        if (s && typeof s === 'object') {
          const obj = s as Record<string, unknown>
          const cn = typeof obj.tranCn === 'string' ? obj.tranCn : ''
          if (!cn) return ''
          return cn
        }
        return ''
      })
      .filter(Boolean)
      .join('；')
  }
  return ''
}

export function generateDistractors(
  correctDefinition: string,
  correctLemma: string,
  loadedBooks: Map<WordBookId, WordBook>,
  count: number = 3
): string[] {
  const safeCorrect = typeof correctDefinition === 'string' ? correctDefinition : ''
  const correctPos = extractPos(safeCorrect)

  const allOptions: DistractorOption[] = []
  for (const book of loadedBooks.values()) {
    for (const entry of book.entries) {
      if (entry.lemma === correctLemma) continue
      const def = normalizeDefinition(entry.definition)
      if (!def || def === safeCorrect) continue
      allOptions.push({
        text: def,
        pos: extractPos(def),
      })
    }
  }

  const samePos = allOptions.filter(d => d.pos === correctPos)
  const otherPos = allOptions.filter(d => d.pos !== correctPos)

  const pool = [...shuffle(samePos), ...shuffle(otherPos)]

  const distractors: string[] = []
  const seen = new Set<string>()
  for (const d of pool) {
    if (distractors.length >= count) break
    const key = d.text.slice(0, 20)
    if (seen.has(key)) continue
    seen.add(key)
    distractors.push(d.text)
  }

  let gi = 0
  while (distractors.length < count && gi < GENERIC_DISTRACTORS.length) {
    const g = GENERIC_DISTRACTORS[gi++]
    if (!distractors.includes(g)) distractors.push(g)
  }

  return shuffle(distractors)
}
