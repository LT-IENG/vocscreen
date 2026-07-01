import { create } from 'zustand'
import type { SubtitleSegment, AsrStatus, AsrChannel, SubtitleSource } from '../types'
import { rematchAll as engineRematchAll, getMatchList } from '../engines/matching/MatcherEngine'

interface SubtitleState {
  segments: SubtitleSegment[]
  currentSegmentIndex: number
  asrStatus: AsrStatus
  asrProgress: number
  asrChannel: AsrChannel
  subtitleSource: SubtitleSource
  videoId: string | null
  matchSummary: { bookId: string; bookName: string; totalMatches: number; matchList: string[] } | null

  loadMock: (data: { segments: SubtitleSegment[]; matchSummary: SubtitleState['matchSummary']; title: string; duration: number }) => void
  loadFromSrt: (segments: SubtitleSegment[], videoId: string) => void
  loadFromAsr: (segments: SubtitleSegment[], videoId: string) => void
  setCurrentSegmentIndex: (index: number) => void
  setAsrStatus: (status: AsrStatus) => void
  setAsrProgress: (progress: number) => void
  setAsrChannel: (channel: AsrChannel) => void
  rematchWords: (wordSet: Set<string>, bookId: string, bookName: string) => void
  reset: () => void
}

export const useSubtitleStore = create<SubtitleState>((set) => ({
  segments: [],
  currentSegmentIndex: -1,
  asrStatus: 'idle',
  asrProgress: 0,
  asrChannel: null,
  subtitleSource: null,
  videoId: null,
  matchSummary: null,

  loadMock: (data) =>
    set({
      segments: data.segments,
      subtitleSource: 'mock',
      matchSummary: data.matchSummary,
      currentSegmentIndex: 0,
    }),

  loadFromSrt: (segments, videoId) =>
    set({
      segments,
      subtitleSource: 'external',
      videoId,
      currentSegmentIndex: 0,
    }),

  loadFromAsr: (segments, videoId) =>
    set({
      segments,
      subtitleSource: 'asr',
      videoId,
      currentSegmentIndex: 0,
    }),

  setCurrentSegmentIndex: (index) => set({ currentSegmentIndex: index }),
  setAsrStatus: (status) => set({ asrStatus: status }),
  setAsrProgress: (progress) => set({ asrProgress: progress }),
  setAsrChannel: (channel) => set({ asrChannel: channel }),

  rematchWords: (wordSet, bookId, bookName) =>
    set((s) => {
      const newSegments = engineRematchAll(s.segments, wordSet, bookId)
      const matchList = getMatchList(newSegments)
      return {
        segments: newSegments,
        matchSummary: { bookId, bookName, totalMatches: matchList.length, matchList },
      }
    }),

  reset: () =>
    set({
      segments: [],
      currentSegmentIndex: -1,
      asrStatus: 'idle',
      asrProgress: 0,
      asrChannel: null,
      subtitleSource: null,
      videoId: null,
      matchSummary: null,
    }),
}))