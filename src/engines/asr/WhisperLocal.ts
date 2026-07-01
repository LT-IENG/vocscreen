import type { RawTranscriptionSegment, AsrEngineConfig } from '../../types'

/**
 * Local Whisper WASM engine stub.
 * Will load whisper-tiny model and run inference in a Web Worker.
 */
export async function transcribeLocal(
  _audioBuffer: ArrayBuffer,
  _config: AsrEngineConfig
): Promise<RawTranscriptionSegment[]> {
  // TODO: Integrate whisper.cpp WASM
  throw new Error('Local Whisper ASR is not yet available. Please use preset subtitles or upload an SRT file.')
}