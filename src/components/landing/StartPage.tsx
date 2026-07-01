import { useRef, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Plasma } from './Plasma'
import { useUIStore } from '../../stores/useUIStore'

export function StartPage() {
  const setAppScreen = useUIStore((s) => s.setAppScreen)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const enterWordBook = () => setAppScreen('wordbook-select')
  const reduceMotion = useReducedMotion()

  const isLight = theme === 'light'
  const plasmaColor = isLight ? '#c9a84c' : '#7C3AED'
  const plasmaOpacity = isLight ? 0.35 : 1.0
  const bgRgb = isLight ? '253, 250, 245' : '7, 6, 13'
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let rf1: number, rf2: number
    rf1 = requestAnimationFrame(() => {
      rf2 = requestAnimationFrame(() => setLoaded(true))
    })
    return () => { cancelAnimationFrame(rf1); cancelAnimationFrame(rf2) }
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'hidden' }
  }, [])

  const ease = [0.16, 1, 0.3, 1] as const

  const slideDown = (delay: number) =>
    reduceMotion ? {} : {
      initial: { opacity: 0, y: -16 },
      animate: loaded ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 },
      transition: { duration: 0.75, delay, ease },
    }

  const slideRight = (delay: number) =>
    reduceMotion ? {} : {
      initial: { opacity: 0, x: -28 },
      animate: loaded ? { opacity: 1, x: 0 } : { opacity: 0, x: -28 },
      transition: { duration: 0.75, delay, ease },
    }

  return (
    <div className="fixed inset-0 bg-surface-0 text-ink overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Plasma color={plasmaColor} speed={0.50} direction="forward" scale={1.0} opacity={plasmaOpacity} mouseInteractive={false} />
      </div>

      <div
        className={`absolute inset-0 z-[2] pointer-events-none transition-opacity duration-[1.2s] ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: isLight
            ? `radial-gradient(ellipse 85% 65% at 50% 42%, transparent 0%, rgba(${bgRgb},0.04) 60%, rgba(${bgRgb},0.15) 85%, rgba(${bgRgb},0.45) 100%)`
            : `radial-gradient(ellipse 85% 65% at 50% 42%, transparent 0%, rgba(${bgRgb},0.08) 50%, rgba(${bgRgb},0.30) 76%, rgba(${bgRgb},0.72) 100%)`,
        }}
      />

      <div
        className={`absolute bottom-0 left-0 right-0 h-[35vh] z-[3] pointer-events-none transition-opacity duration-[0.9s] delay-[0.25s] ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: isLight
            ? `linear-gradient(to top, rgba(${bgRgb},0.65) 0%, rgba(${bgRgb},0.15) 48%, transparent 100%)`
            : `linear-gradient(to top, rgba(${bgRgb},0.82) 0%, rgba(${bgRgb},0.22) 48%, transparent 100%)`,
        }}
      />

      <div className="absolute top-0 left-0 right-0 z-50 max-w-[clamp(80rem,88vw,120rem)] mx-auto px-[clamp(1rem,3.5vw,3rem)] py-5 md:py-6">
        <nav className="flex items-center justify-between">
          <motion.div className="flex items-baseline gap-2" {...slideDown(0.35)}>
            <span className="text-[clamp(1rem,1.4vw,1.375rem)] font-bold text-ink tracking-[0.03em]">
              词映
            </span>
            <span className="text-[clamp(0.5625rem,0.75vw,0.75rem)] font-normal text-purple-bright tracking-[0.14em] uppercase">
              VocScreen
            </span>
          </motion.div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              {...slideDown(0.38)}
              whileHover={reduceMotion ? {} : { scale: 1.1 }}
              whileTap={reduceMotion ? {} : { scale: 0.9 }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border border-surface-border/40 text-sm hover:border-purple/30 hover:bg-surface-1/50 transition-colors"
              title={theme === 'dark' ? '切换浅色主题' : '切换暗色主题'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </motion.button>
            <motion.button
              onClick={enterWordBook}
              {...slideDown(0.4)}
              whileHover={reduceMotion ? {} : { scale: 1.03 }}
              whileTap={reduceMotion ? {} : { scale: 0.97 }}
              className="px-4 py-[0.4rem] bg-transparent border border-purple/20 rounded-lg text-[clamp(0.6875rem,0.7vw,0.875rem)] font-medium text-purple-bright tracking-[0.03em] hover:border-purple-bright/50 hover:text-purple-bright hover:bg-purple/8 transition-colors"
            >
              进入应用
            </motion.button>
          </div>
        </nav>
      </div>

      <div className="absolute inset-0 z-20 flex flex-col justify-center max-w-[clamp(80rem,88vw,120rem)] mx-auto px-[clamp(1rem,3.5vw,3rem)]">
        <div className="max-w-[clamp(32rem,38vw,46rem)] ml-[clamp(0.25rem,0.4vw,0.5rem)]">
          <motion.p
            {...slideDown(0.55)}
            className="text-[clamp(0.6875rem,0.7vw,0.9375rem)] font-medium tracking-[0.09em] text-purple-bright mb-[clamp(0.5rem,0.8vh,0.875rem)]"
          >
            看剧学英语
          </motion.p>

          <motion.h1
            {...slideRight(0.6)}
            className="text-[clamp(2.25rem,4.5vw,5rem)] font-bold leading-[1.06] tracking-[-0.015em] text-ink"
            style={{ animationDuration: '0.9s' } as React.CSSProperties}
          >
            词映
            <span className="block font-light text-[clamp(1.125rem,1.8vw,2.25rem)] tracking-[0.15em] text-purple-bright mt-[0.1rem]">
              VocScreen
            </span>
          </motion.h1>

          <motion.p
            {...slideRight(0.7)}
            className="mt-[clamp(1rem,2vh,2rem)] text-[clamp(0.875rem,1vw,1.125rem)] leading-relaxed text-ink-dim max-w-[clamp(300px,26vw,400px)]"
          >
            拖入视频，点击单词，科学复习。<br />词汇量在观影中自然生长。
          </motion.p>

          <motion.div
            {...slideRight(0.8)}
            className="mt-[clamp(1.25rem,3vh,2.5rem)] flex items-center gap-[clamp(0.75rem,1.5vw,1.5rem)] flex-wrap"
          >
            <motion.button
              onClick={enterWordBook}
              whileHover={
                reduceMotion
                  ? {}
                  : { scale: 1.03, boxShadow: '0 0 48px rgba(139,92,246,0.30)' }
              }
              whileTap={reduceMotion ? {} : { scale: 0.975 }}
              className="relative px-[clamp(1.25rem,2vw,2.5rem)] py-[clamp(0.625rem,1.2vh,0.875rem)] rounded-[0.625rem] bg-purple text-white font-semibold text-[clamp(0.8125rem,0.8vw,1rem)] tracking-[0.02em] border-none cursor-pointer overflow-hidden isolate transition-[background,transform,box-shadow] duration-200 whitespace-nowrap"
              style={{
                boxShadow: '0 0 0 0 rgba(139,92,246,0)',
              }}
            >
              <span
                className="absolute inset-0 rounded-[inherit] -z-[1] pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 40%)',
                }}
              />
              开始使用
            </motion.button>
            <span className="hidden sm:block text-[clamp(0.625rem,0.6vw,0.8125rem)] text-ink-muted self-center whitespace-nowrap">
              支持 MP4 / M4V / MOV
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default StartPage