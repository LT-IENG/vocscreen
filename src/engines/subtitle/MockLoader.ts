import type { SubtitleSegment, MockSubtitleFile } from '../../types'

export async function loadMockSubtitles(
  videoPath: string
): Promise<{
  segments: SubtitleSegment[]
  matchSummary: { bookId: string; bookName: string; totalMatches: number; matchList: string[] }
  title: string
  duration: number
} | null> {
  try {
    // 用时间戳破缓存，避免浏览器返回旧的缓存版本
    const ts = Date.now()
    const metaResp = await fetch(`${videoPath}/metadata.json?t=${ts}`)
    if (!metaResp.ok) return null
    const meta = await metaResp.json()

    const subResp = await fetch(`${videoPath}/subtitles.json?t=${ts}`)
    if (!subResp.ok) return null
    const rawSub: unknown = await subResp.json()
    // 兼容两种格式：纯数组 [seg, ...] 或对象 { segments: [...] }
    const segments = Array.isArray(rawSub)
      ? rawSub as SubtitleSegment[]
      : (rawSub as MockSubtitleFile).segments ?? []

    return {
      segments,
      matchSummary: meta.matchSummary,
      title: meta.title,
      duration: meta.duration,
    }
  } catch {
    return null
  }
}