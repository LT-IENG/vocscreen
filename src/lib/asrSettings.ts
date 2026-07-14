const STORAGE_KEY = 'vocscreen_asr_settings'

export interface AsrSettings {
  apiUrl: string
  apiKey: string
  model: string
  language: string
}

const DEFAULT_SETTINGS: AsrSettings = {
  apiUrl: '',
  apiKey: '',
  model: 'whisper-1',
  language: 'en',
}

export function getAsrSettings(): AsrSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveAsrSettings(settings: AsrSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function hasAsrConfig(): boolean {
  const s = getAsrSettings()
  return s.apiUrl.trim().length > 0 && s.apiKey.trim().length > 0
}
