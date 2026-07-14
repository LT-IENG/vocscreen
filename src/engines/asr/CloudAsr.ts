import type { RawTranscriptionSegment, AsrEngineConfig } from '../../types'
import { getAsrSettings } from '../../lib/asrSettings'

interface OpenAiSegment {
  id: number
  start: number
  end: number
  text: string
}

interface OpenAiResponse {
  text?: string
  segments?: OpenAiSegment[]
}

/**
 * 云端 ASR 转录。
 * 兼容 OpenAI Whisper API 格式：
 *   POST {apiUrl}
 *   Headers: Authorization: Bearer {apiKey}
 *   Body: multipart/form-data with file + model + language
 */
export async function transcribeCloud(
  audioBuffer: ArrayBuffer,
  _config: AsrEngineConfig
): Promise<RawTranscriptionSegment[]> {
  const settings = getAsrSettings()
  if (!settings.apiUrl || !settings.apiKey) {
    throw new Error('请先配置 ASR API 地址和密钥')
  }

  const blob = new Blob([audioBuffer])
  const formData = new FormData()
  formData.append('file', blob, 'audio.mp4')
  formData.append('model', settings.model || 'whisper-1')
  if (settings.language) {
    formData.append('language', settings.language)
  }
  formData.append('response_format', 'verbose_json')

  const response = await fetch(settings.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`ASR API 请求失败 (${response.status}): ${errText.slice(0, 200)}`)
  }

  const data: OpenAiResponse = await response.json()

  if (data.segments && data.segments.length > 0) {
    return data.segments.map(seg => ({
      startTime: seg.start,
      endTime: seg.end,
      text: seg.text.trim(),
    }))
  }

  if (data.text) {
    return [{ startTime: 0, endTime: 0, text: data.text.trim() }]
  }

  throw new Error('ASR API 返回了空结果')
}
