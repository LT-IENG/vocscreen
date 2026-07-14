export interface AudioExtractionResult {
  audioBuffer: ArrayBuffer
  sampleRate: number
  duration: number
}

/**
 * 从视频文件提取音频数据。
 * 大多数 ASR API（如 OpenAI Whisper）支持直接接收视频文件，
 * 因此这里直接返回文件原始数据，由 ASR 服务端解码。
 */
export async function extractAudio(videoFile: File): Promise<AudioExtractionResult> {
  const audioBuffer = await videoFile.arrayBuffer()
  return {
    audioBuffer,
    sampleRate: 16000,
    duration: 0,
  }
}
