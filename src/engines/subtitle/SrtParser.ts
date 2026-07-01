import type { SubtitleSegment, WordBookId } from '../../types'

export interface ParsedSrtSegment {
  startTime: number
  endTime: number
  textEn: string
  textZh: string
}

function parseTime(t: string): number {
  const m = t.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/)
  if (!m) return 0
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000
}

export function parseSrt(text: string): ParsedSrtSegment[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  const blocks = normalized.split(/\n\n+/)
  const result: ParsedSrtSegment[] = []

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue
    const timeMatch = lines[1].match(
      /(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/
    )
    if (!timeMatch) continue
    const startTime = parseTime(timeMatch[1])
    const endTime = parseTime(timeMatch[2])
    const textLines = lines.slice(2)

    let textEn = ''
    let textZh = ''
    if (textLines.length === 1) {
      textEn = textLines[0].trim()
    } else {
      const hasCJK = /[一-鿿]/.test(textLines[0])
      if (hasCJK) {
        textZh = textLines[0].trim()
        textEn = textLines.slice(1).join(' ').trim()
      } else {
        textEn = textLines[0].trim()
        textZh = textLines.slice(1).join(' ').trim()
      }
    }

    if (!textEn || textEn.toLowerCase().includes('vocscreen test')) continue
    result.push({ startTime, endTime, textEn, textZh })
  }

  return result
}

export function matchWordsAndBuildSegments(
  parsed: ParsedSrtSegment[],
  videoId: string,
  wordSet: Set<string>,
  bookId: WordBookId | null
): SubtitleSegment[] {
  return parsed.map((item, i) => {
    const words = item.textEn.toLowerCase().split(/[^a-z]+/).filter(Boolean)
    const uniqueWords = [...new Set(words)]
    const matched = bookId ? uniqueWords.filter(w => wordSet.has(w)) : []

    return {
      id: `srt-${String(i + 1).padStart(4, '0')}`,
      videoId,
      startTime: Math.round(item.startTime * 10) / 10,
      endTime: Math.round(item.endTime * 10) / 10,
      textEn: item.textEn,
      textZh: item.textZh,
      alignment: [],
      highlightedWords: matched.map(w => ({ word: w, lemma: w, matchedBookId: bookId || '' })),
    }
  })
}