import type { SubtitleSegment } from '../../types'

export function detectLanguage(text: string): 'en' | 'zh' | 'mixed' {
  const cjkCount = (text.match(/[一-鿿㐀-䶿]/g) || []).length
  const enCount = (text.match(/[a-zA-Z]+/g) || []).length
  if (cjkCount > enCount * 2) return 'zh'
  if (enCount > cjkCount * 2) return 'en'
  if (cjkCount > 0 && enCount > 0) return 'mixed'
  return 'en'
}

export async function translateBatch(
  texts: string[],
  from: 'en' | 'zh',
  to: 'en' | 'zh'
): Promise<string[]> {
  const langPair = from === 'en' ? 'en|zh' : 'zh|en'
  const results: string[] = []

  const chunkSize = 50
  for (let i = 0; i < texts.length; i += chunkSize) {
    const chunk = texts.slice(i, i + chunkSize)
    try {
      const params = new URLSearchParams()
      params.append('q', chunk.join(' ||| '))
      params.append('langpair', langPair)
      params.append('de', 'vocscreen@example.com')

      const resp = await fetch(
        `https://api.mymemory.translated.net/get?${params.toString()}`
      )
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()
      const translated = (data.responseData?.translatedText || '')
        .split(' ||| ')
        .map((s: string) => s.trim())

      while (translated.length < chunk.length) translated.push('')
      results.push(...translated)
    } catch {
      results.push(...chunk.map(() => ''))
    }
  }

  return results
}

export async function fillMissingTranslations(
  segments: SubtitleSegment[]
): Promise<SubtitleSegment[]> {
  const hasEn = segments.some((s) => s.textEn && /[a-zA-Z]{3,}/.test(s.textEn))
  const hasZh = segments.some((s) => s.textZh && /[一-鿿]/.test(s.textZh))

  if (hasEn && hasZh) return segments
  if (!hasEn && !hasZh) return segments

  if (hasEn && !hasZh) {
    const texts = segments.map((s) => s.textEn)
    const translations = await translateBatch(texts, 'en', 'zh')
    return segments.map((s, i) => ({ ...s, textZh: translations[i] || '' }))
  }

  if (!hasEn && hasZh) {
    const texts = segments.map((s) => s.textZh)
    const translations = await translateBatch(texts, 'zh', 'en')
    return segments.map((s, i) => ({ ...s, textEn: translations[i] || '' }))
  }

  return segments
}