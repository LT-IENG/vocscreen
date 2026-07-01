import type { RawTranscriptionSegment, AsrEngineConfig } from '../../types'

/**
 * Cloud ASR engine stub.
 * Will call OpenAI Whisper API or compatible service.
 */
export async function transcribeCloud(
  _audioBuffer: ArrayBuffer,
  _config: AsrEngineConfig
): Promise<RawTranscriptionSegment[]> {
  // TODO: Integrate OpenAI Whisper API
  throw new Error('Cloud ASR is not yet available. Please set up an API key in settings.')
}