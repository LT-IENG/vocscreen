import type { SubtitleSegment, HighlightedWord, SubtitleDisplay } from '../../types'

const FONT_SIZES = {
  s: { en: 20, zh: 16 },
  m: { en: 24, zh: 19 },
  l: { en: 30, zh: 24 },
} as const

const LINE_HEIGHT_RATIO = 1.2
const ZH_LINE_HEIGHT_RATIO = 1.15
const SIDE_PAD = 80
const BOTTOM_PAD = 80
const BG_PAD_X = 24
const BG_PAD_Y = 10
const EN_ZH_GAP = 4
const WORD_SPACING = 1.5
const NULL_SEP = '\x00'

const FONT_EN_STACK = "'Geist', 'Inter', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
const FONT_ZH_STACK = "'Geist', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif"

export interface HitBox {
  x: number
  y: number
  w: number
  h: number
}

export class SubtitleRenderer {
  private hitMap: Map<string, HitBox> = new Map()

  static findCurrentSegment(segments: SubtitleSegment[], time: number): number {
    if (!segments || segments.length === 0) return -1
    let lo = 0
    let hi = segments.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const seg = segments[mid]
      if (!seg) break
      if (time >= seg.startTime && time <= seg.endTime) return mid
      if (time < seg.startTime) hi = mid - 1
      else lo = mid + 1
    }
    return -1
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    segments: SubtitleSegment[],
    currentTime: number,
    subtitleDisplay: SubtitleDisplay,
    fontSize: 's' | 'm' | 'l',
    isLight: boolean
  ): Map<string, HitBox> {
    this.hitMap.clear()

    const idx = SubtitleRenderer.findCurrentSegment(segments, currentTime)
    if (idx < 0) return this.hitMap

    const seg = segments[idx]
    if (!seg) return this.hitMap

    const fs = FONT_SIZES[fontSize]
    const LINE_H = Math.round(fs.en * LINE_HEIGHT_RATIO)
    const ZH_LINE_H = Math.round(fs.zh * ZH_LINE_HEIGHT_RATIO)
    const FONT_EN = `500 ${fs.en}px ${FONT_EN_STACK}`
    const FONT_ZH = `400 ${fs.zh}px ${FONT_ZH_STACK}`

    const purple = isLight ? '#b8962c' : '#8b5cf6'
    const textColor = isLight ? 'rgba(45, 36, 22, 0.95)' : 'rgba(243, 240, 252, 0.95)'
    const textZhColor = isLight ? 'rgba(45, 36, 22, 0.6)' : 'rgba(243, 240, 252, 0.65)'
    const bgColor = isLight ? 'rgba(246, 241, 232, 0.85)' : 'rgba(7, 6, 13, 0.85)'

    const showEn = subtitleDisplay === 'bilingual' || subtitleDisplay === 'en'
    const showZh = subtitleDisplay === 'bilingual' || subtitleDisplay === 'zh'
    const hwSet: HighlightedWord[] = seg.highlightedWords || []
    const maxWidth = width - SIDE_PAD * 2

    ctx.save()
    ctx.font = FONT_EN
    ctx.textBaseline = 'middle'
    const enLines = showEn && seg.textEn ? wrapText(ctx, seg.textEn, maxWidth, WORD_SPACING) : []
    ctx.font = FONT_ZH
    ctx.textBaseline = 'middle'
    const zhLines = showZh && seg.textZh ? wrapText(ctx, seg.textZh, maxWidth, 0) : []
    ctx.restore()

    const totalLines = enLines.length + zhLines.length
    if (totalLines === 0) return this.hitMap

    ctx.font = FONT_EN
    ctx.textBaseline = 'middle'
    let maxLineWidth = 0
    for (const l of enLines) {
      const w = measureLine(ctx, l, WORD_SPACING)
      if (w > maxLineWidth) maxLineWidth = w
    }
    ctx.font = FONT_ZH
    ctx.textBaseline = 'middle'
    for (const l of zhLines) {
      const w = measureLine(ctx, l, 0)
      if (w > maxLineWidth) maxLineWidth = w
    }

    const bgW = Math.min(maxLineWidth + BG_PAD_X * 2, width - 16)
    const zhGap = (enLines.length > 0 && zhLines.length > 0) ? EN_ZH_GAP : 0
    const totalH = enLines.length * LINE_H + zhLines.length * ZH_LINE_H + zhGap + BG_PAD_Y * 2
    const bgX = (width - bgW) / 2
    const bgY = height - BOTTOM_PAD - totalH

    const r = 12
    ctx.fillStyle = bgColor
    ctx.beginPath()
    ctx.moveTo(bgX + r, bgY)
    ctx.lineTo(bgX + bgW - r, bgY)
    ctx.arcTo(bgX + bgW, bgY, bgX + bgW, bgY + r, r)
    ctx.lineTo(bgX + bgW, bgY + totalH - r)
    ctx.arcTo(bgX + bgW, bgY + totalH, bgX + bgW - r, bgY + totalH, r)
    ctx.lineTo(bgX + r, bgY + totalH)
    ctx.arcTo(bgX, bgY + totalH, bgX, bgY + totalH - r, r)
    ctx.lineTo(bgX, bgY + r)
    ctx.arcTo(bgX, bgY, bgX + r, bgY, r)
    ctx.closePath()
    ctx.fill()

    const cx = width / 2
    let cy = bgY + BG_PAD_Y + LINE_H / 2

    ctx.font = FONT_EN
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    for (const line of enLines) {
      this.drawWordLine(ctx, line, seg.id, cx, cy, hwSet, purple, textColor, LINE_H, WORD_SPACING)
      cy += LINE_H
    }

    if (zhLines.length > 0) {
      // After English loop, cy is at LINE_H/2 past the last English line's bottom
      // Move to: English bottom + EN_ZH_GAP + ZH_LINE_H/2 (center of first Chinese line)
      cy = cy - LINE_H / 2 + EN_ZH_GAP + ZH_LINE_H / 2
      ctx.font = FONT_ZH
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillStyle = textZhColor
      for (const line of zhLines) {
        ctx.fillText(line, width / 2, cy)
        cy += ZH_LINE_H
      }
    }

    return this.hitMap
  }

  private drawWordLine(
    ctx: CanvasRenderingContext2D,
    line: string,
    segId: string,
    cx: number,
    cy: number,
    hwSet: HighlightedWord[],
    purple: string,
    textColor: string,
    lineH: number,
    wordSpacing: number,
  ) {
    const tokens = line.split(/(\s+)/)
    const totalW = tokens.reduce((s, t) => {
      const w = ctx.measureText(t).width
      return s + w + (/^\s+$/.test(t) ? wordSpacing : 0)
    }, 0)
    let x = cx - totalW / 2

    let wordIndex = 0
    for (const token of tokens) {
      const tw = ctx.measureText(token).width
      if (/^\s+$/.test(token)) {
        x += tw + wordSpacing
        continue
      }
      const clean = token.replace(/^[.,!?;:'"()\[\]]+|[.,!?;:'"()\[\]]+$/g, '')
      if (!clean) {
        x += tw
        continue
      }

      const highlighted = hwSet.some(h => h.word.toLowerCase() === clean.toLowerCase())
      ctx.fillStyle = highlighted ? purple : textColor
      ctx.fillText(token, x, cy)

      // Fix #9: Include wordIndex in key so duplicate words in same segment don't overwrite
      this.hitMap.set(`${clean}${NULL_SEP}${clean}${NULL_SEP}${segId}${NULL_SEP}${wordIndex}`, {
        x,
        y: cy - lineH / 2,
        w: tw,
        h: lineH,
      })
      wordIndex++
      x += tw
    }
  }
}

function measureLine(ctx: CanvasRenderingContext2D, line: string, wordSpacing: number): number {
  const tokens = line.split(/(\s+)/)
  return tokens.reduce((s, t) => {
    const w = ctx.measureText(t).width
    return s + w + (/^\s+$/.test(t) ? wordSpacing : 0)
  }, 0)
}

function isCJK(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) ||
         (code >= 0x3000 && code <= 0x303f) || (code >= 0xff00 && code <= 0xffef)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, wordSpacing: number): string[] {
  // For CJK-heavy text (Chinese), split into individual characters for per-char wrapping
  const hasCJK = [...text].some(isCJK)
  if (hasCJK) {
    const chars = [...text]
    const lines: string[] = []
    let current = ''
    let currentW = 0
    for (const ch of chars) {
      const cw = ctx.measureText(ch).width
      if (currentW + cw > maxWidth && current.length > 0) {
        lines.push(current)
        current = ch
        currentW = cw
      } else {
        current += ch
        currentW += cw
      }
    }
    if (current) lines.push(current)
    return lines.length > 0 ? lines : [text]
  }

  // Latin text: word-based wrapping
  const tokens = text.split(/(\s+)/)
  const lines: string[] = []
  let current = ''
  let currentW = 0
  for (const token of tokens) {
    const tw = ctx.measureText(token).width
    const spaceAdd = /^\s+$/.test(token) ? wordSpacing : 0
    if (currentW + tw + spaceAdd > maxWidth && current.trim().length > 0) {
      lines.push(current)
      current = token.replace(/^\s+/, '')
      currentW = ctx.measureText(current).width
    } else {
      current += token
      currentW += tw + spaceAdd
    }
  }
  if (current.trim()) lines.push(current)
  return lines.length > 0 ? lines : [text]
}