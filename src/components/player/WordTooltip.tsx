import { useUIStore } from '../../stores/useUIStore'
import { motion, AnimatePresence } from 'motion/react'
import { BookmarkSimple } from '@phosphor-icons/react'

const TOOLTIP_W = 260
const TOOLTIP_OFFSET_Y = 16

export function WordTooltip() {
  const hw = useUIStore((s) => s.hoveredWord)

  const levelLabel = (lvl: string) => {
    const map: Record<string, string> = { CET4: '四级', CET6: '六级', IELTS: '雅思', TOEFL: '托福' }
    return map[lvl] || ''
  }

  let left = 0
  let top = 0
  if (hw) {
    left = Math.max(8, Math.min(hw.position.x - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - 8))
    top = Math.max(8, hw.position.y - TOOLTIP_OFFSET_Y)
  }

  return (
    <AnimatePresence>
      {hw && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.12 }}
          className="absolute z-40 bg-surface-1 border border-surface-border rounded-lg p-3 shadow-modal"
          style={{
            left,
            top,
            width: TOOLTIP_W,
            pointerEvents: 'none',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-display font-semibold text-ink">{hw.word}</span>
            <div className="flex items-center gap-1.5">
              {hw.level && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple/15 text-purple border border-purple/20">
                  {levelLabel(hw.level)}
                </span>
              )}
              {hw.isCaptured && (
                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-accent-green/15 text-accent-green border border-accent-green/20">
                  <BookmarkSimple size={10} weight="fill" />
                  已捕获
                </span>
              )}
            </div>
          </div>

          {hw.phonetics && (
            <p className="text-xs text-ink-muted font-mono mb-1.5">{hw.phonetics}</p>
          )}

          <p className="text-xs text-ink-dim leading-relaxed line-clamp-3">
            {hw.definition || (hw.isHighlighted ? '释义暂缺' : '不在当前词书中')}
          </p>

          {!hw.isCaptured && (
            <p className="text-[10px] text-purple/60 mt-2 pt-2 border-t border-surface-border">
              点击加入生词本
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
