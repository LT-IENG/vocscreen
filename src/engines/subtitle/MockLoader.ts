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
    const metaResp = await fetch(`${videoPath}/metadata.json`)
    if (!metaResp.ok) return null
    const meta = await metaResp.json()

    const subResp = await fetch(`${videoPath}/subtitles.json`)
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