import type { RawTranscriptionSegment, AsrEngineConfig } from '../../types'

/**
 * 本地 Whisper WASM 引擎 — 尚未上线。
 * whisper-tiny 模型约 40-80MB，加载耗时较长，
 * 将在后续版本通过 Web Worker 集成。
 */
export async function transcribeLocal(
  _audioBuffer: ArrayBuffer,
  _config: AsrEngineConfig
): Promise<RawTranscriptionSegment[]> {
  throw new Error('LOCAL_ASR_NOT_AVAILABLE')
}
