import type { WordBook, SubtitleSegment, HighlightedWord } from '../../types'
import { lemmatize } from './Lemmatizer'

export function buildWordSet(book: WordBook): Set<string> {
  const set = new Set<string>()
  for (const entry of book.entries) {
    set.add(entry.lemma.toLowerCase())
    set.add(entry.spelling.toLowerCase())
  }
  return set
}

export function matchSegment(
  segment: SubtitleSegment,
  wordSet: Set<string>,
  bookId: string
): HighlightedWord[] {
  const words = segment.textEn.toLowerCase().split(/[^a-z']+/).filter(Boolean)
  const seen = new Set<string>()
  const result: HighlightedWord[] = []

  for (const word of words) {
    if (word.length <= 1) continue
    if (seen.has(word)) continue
    seen.add(word)

    const lemma = lemmatize(word)
    if (wordSet.has(word) || wordSet.has(lemma)) {
      result.push({ word, lemma: lemma !== word ? lemma : word, matchedBookId: bookId })
    }
  }

  return result
}

export function rematchAll(
  segments: SubtitleSegment[],
  wordSet: Set<string>,
  bookId: string
): SubtitleSegment[] {
  return segments.map((seg) => ({
    ...seg,
    highlightedWords: matchSegment(seg, wordSet, bookId),
  }))
}

export function getMatchList(segments: SubtitleSegment[]): string[] {
  const seen = new Set<string>()
  for (const seg of segments) {
    for (const hw of seg.highlightedWords) {
      seen.add(hw.lemma)
    }
  }
  return [...seen]
}