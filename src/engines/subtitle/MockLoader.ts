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
    const subData: MockSubtitleFile = await subResp.json()

    return {
      segments: subData.segments,
      matchSummary: meta.matchSummary,
      title: meta.title,
      duration: meta.duration,
    }
  } catch {
    return null
  }
}