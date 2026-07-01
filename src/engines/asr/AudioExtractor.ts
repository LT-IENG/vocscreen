export interface AudioExtractionResult {
  audioBuffer: ArrayBuffer
  sampleRate: number
  duration: number
}

/**
 * Extract audio from a video file.
 * Currently a stub — FFmpeg WASM integration planned.
 */
export async function extractAudio(videoFile: File): Promise<AudioExtractionResult> {
  // TODO: Integrate FFmpeg WASM in Web Worker for audio extraction
  throw new Error('Audio extraction via FFmpeg WASM is not yet available. Please use preset subtitles or upload an SRT file.')
}