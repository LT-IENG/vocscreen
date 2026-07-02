import { useEffect, useRef, useCallback, useState } from 'react'
import { usePlayerStore } from '../../stores/usePlayerStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useUIStore } from '../../stores/useUIStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { SubtitleRenderer } from '../../engines/subtitle/SubtitleRenderer'
import { fetchWordFromApi } from '../../engines/dict/DictEngine'

const NULL_SEP = '\x00'

const CONTRACTIONS_API: Record<string, string> = {
  "didn't": 'did', "don't": 'do', "doesn't": 'does', "isn't": 'is', "aren't": 'are',
  "wasn't": 'was', "weren't": 'were', "haven't": 'have', "hasn't": 'has', "hadn't": 'had',
  "won't": 'will', "wouldn't": 'would', "shouldn't": 'should', "couldn't": 'could',
  "can't": 'can', "mightn't": 'might', "mustn't": 'must', "needn't": 'need',
  "it's": 'it', "he's": 'he', "she's": 'she', "that's": 'that', "there's": 'there',
  "here's": 'here', "what's": 'what', "who's": 'who', "where's": 'where', "when's": 'when',
  "they're": 'they', "we're": 'we', "you're": 'you', "i'm": 'i',
  "they've": 'they', "we've": 'we', "you've": 'you', "i've": 'i',
  "they'll": 'they', "we'll": 'we', "you'll": 'you', "i'll": 'i', "he'll": 'he', "she'll": 'she',
  "they'd": 'they', "we'd": 'we', "you'd": 'you', "i'd": 'i', "he'd": 'he', "she'd": 'she',
  "let's": 'let',
}

function expandForApi(word: string): string {
  const lower = word.toLowerCase()
  return CONTRACTIONS_API[lower] ?? word
}

interface HitEntry {
  spelling: string
  lemma: string
  segId: string
  box: { x: number; y: number; w: number; h: number }
}

export function SubtitleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number>(0)
  const hitMapRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map())
  const rendererRef = useRef<SubtitleRenderer>(new SubtitleRenderer())
  const currentTimeRef = useRef(0)
  const [cursorOverWord, setCursorOverWord] = useState(false)
  const [fontLoaded, setFontLoaded] = useState(false)

  const hasVideo = usePlayerStore((s) => s.hasVideo)
  const segments = useSubtitleStore((s) => s.segments)
  const subtitleDisplay = useUIStore((s) => s.subtitleDisplay)
  const subtitleFontSize = useUIStore((s) => s.subtitleFontSize)
  const theme = useUIStore((s) => s.theme)

  // Keep currentTimeRef in sync without re-running the draw effect (#8)
  useEffect(() => {
    currentTimeRef.current = usePlayerStore.getState().currentTime
    const unsub = usePlayerStore.subscribe((s) => {
      currentTimeRef.current = s.currentTime
    })
    return unsub
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) {
      setFontLoaded(true)
      return
    }
    let cancelled = false
    const checkFonts = async () => {
      try {
        await document.fonts.ready
        if (!cancelled) setFontLoaded(true)
      } catch {
        if (!cancelled) setFontLoaded(true)
      }
    }
    checkFonts()
    const onFontLoad = () => setFontLoaded(true)
    document.fonts.addEventListener('loadingdone', onFontLoad)
    return () => {
      cancelled = true
      document.fonts.removeEventListener('loadingdone', onFontLoad)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth || 1280
        canvas.height = parent.clientHeight || 720
      }
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw)
      if (!ctx || !canvas || canvas.width === 0 || canvas.height === 0) return
      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (!segments || segments.length === 0) return

        const hitMap = rendererRef.current.render(
          ctx,
          canvas.width,
          canvas.height,
          segments,
          currentTimeRef.current,
          subtitleDisplay,
          subtitleFontSize,
          theme === 'light',
        )
        hitMapRef.current = hitMap
      } catch (e) {
        console.warn('[SubtitleCanvas] draw error:', e)
      }
    }

    requestRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(requestRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [segments, subtitleDisplay, subtitleFontSize, theme, fontLoaded])

  const findHit = useCallback((clientX: number, clientY: number): HitEntry | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    // Scale from CSS display coords to canvas internal resolution
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    for (const [key, box] of hitMapRef.current) {
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        const parts = key.split(NULL_SEP)
        const spelling = parts[0]
        const lemma = parts[1]
        const segId = parts[2]
        if (!spelling || !segId) continue
        return { spelling, lemma: lemma || spelling, segId, box }
      }
    }
    return null
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const playerState = usePlayerStore.getState()
      if (playerState.isPlaying) {
        if (cursorOverWord) setCursorOverWord(false)
        return
      }
      const hit = findHit(e.clientX, e.clientY)
      setCursorOverWord(!!hit)
    },
    [findHit, cursorOverWord],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const playerState = usePlayerStore.getState()

      // Playing: click anywhere = pause
      if (playerState.isPlaying) {
        playerState.pause()
        useUIStore.getState().setMode('interact')
        return
      }

      // Paused: check if clicked on a word
      const hit = findHit(e.clientX, e.clientY)
      if (hit) {
        const vocabState = useVocabStore.getState()
        const entry = vocabState.lookupWord(hit.spelling)
        const uiState = useUIStore.getState()

        // Show card immediately with wordbook data (or loading state)
        uiState.showDefinition({
          word: hit.spelling,
          lemma: entry?.lemma ?? hit.lemma,
          spelling: hit.spelling,
          definition: entry?.definition ?? '',
          phonetics: entry?.phonetics ?? '',
          level: entry?.level ?? '',
          senses: entry?.senses,
          status: entry ? 'wordbook' : 'loading',
          position: { x: e.clientX, y: e.clientY },
          segmentId: hit.segId,
        })

        // If not in wordbook, fetch from free dictionary API
        if (!entry) {
          // For contractions (didn't, it's), the API won't find them — expand to base form
          const queryWord = expandForApi(hit.spelling)
          fetchWordFromApi(queryWord).then((apiResult) => {
            const current = useUIStore.getState().definitionCard
            if (!current || current.word !== hit.spelling) return
            if (apiResult) {
              useUIStore.getState().showDefinition({
                ...current,
                definition: apiResult.senses.map(s => `${s.pos ? s.pos + '. ' : ''}${s.definition}${s.example ? '；' + s.example : ''}`).join('；'),
                phonetics: apiResult.phonetics || current.phonetics,
                senses: apiResult.senses,
                status: 'api',
              })
            } else {
              useUIStore.getState().showDefinition({
                ...current,
                status: 'failed',
              })
            }
          })
        }
        return
      }

      // Paused, clicked empty space — resume play
      playerState.play()
      useUIStore.getState().setMode('play')
      useUIStore.getState().hideDefinition()
    },
    [findHit],
  )

  if (!hasVideo) return null

  const cursorStyle = cursorOverWord ? 'cursor-pointer' : 'cursor-default'

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      className={`absolute inset-0 z-10 ${cursorStyle}`}
    />
  )
}
