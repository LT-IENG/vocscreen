import type { RawTranscriptionSegment, AsrEngineConfig, AsrProgress } from '../../types'
import { extractAudio } from './AudioExtractor'
import { transcribeLocal } from './WhisperLocal'
import { transcribeCloud } from './CloudAsr'

/**
 * Unified ASR Engine — facade pattern.
 * Routes to local Whisper WASM or cloud API based on config and network availability.
 */
export async function runAsr(
  videoFile: File,
  config: AsrEngineConfig
): Promise<RawTranscriptionSegment[]> {
  config.onProgress({ status: 'processing', progress: 0, channel: null })

  try {
    config.onProgress({ status: 'processing', progress: 0.1, channel: null })

    // Step 1: Extract audio
    config.onProgress({ status: 'processing', progress: 0.2, channel: null })
    const { audioBuffer } = await extractAudio(videoFile)

    config.onProgress({ status: 'processing', progress: 0.4, channel: null })

    // Step 2: Transcribe based on provider preference
    let segments: RawTranscriptionSegment[]

    if (config.provider === 'local') {
      config.onProgress({ status: 'processing', progress: 0.5, channel: 'local' })
      segments = await transcribeLocal(audioBuffer, config)
      config.onProgress({ status: 'done', progress: 1, channel: 'local' })
    } else if (config.provider === 'cloud') {
      config.onProgress({ status: 'processing', progress: 0.5, channel: 'cloud' })
      segments = await transcribeCloud(audioBuffer, config)
      config.onProgress({ status: 'done', progress: 1, channel: 'cloud' })
    } else {
      // Auto: try cloud first, fall back to local
      config.onProgress({ status: 'processing', progress: 0.5, channel: 'cloud' })
      try {
        segments = await transcribeCloud(audioBuffer, config)
        config.onProgress({ status: 'done', progress: 1, channel: 'cloud' })
      } catch {
        config.onProgress({ status: 'processing', progress: 0.5, channel: 'local' })
        segments = await transcribeLocal(audioBuffer, config)
        config.onProgress({ status: 'done', progress: 1, channel: 'local' })
      }
    }

    return segments
  } catch (err) {
    config.onProgress({ status: 'error', progress: 0, channel: null })
    throw err
  }
}