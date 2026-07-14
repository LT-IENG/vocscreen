import { useMemo } from 'react'
import { Drawer } from '../ui/Drawer'
import { useUIStore } from '../../stores/useUIStore'
import { useVocabStore } from '../../stores/useVocabStore'
import { useReviewStore } from '../../stores/useReviewStore'
import { ChartBar, Clock, BookOpen, Target, Lightning } from '@phosphor-icons/react'

export function StatsPanel() {
  const activePanel = useUIStore((s) => s.activePanel)
  const closePanel = useUIStore((s) => s.closePanel)
  const capturedWords = useVocabStore((s) => s.capturedWords)
  const schedules = useReviewStore((s) => s.schedules)

  const stats = useMemo(() => {
    const total = capturedWords.length
    const mastered = capturedWords.filter(w => w.status === 'mastered').length
    const learning = capturedWords.filter(w => w.status === 'learning').length
    const newCount = capturedWords.filter(w => w.status === 'new').length
    const fuzzy = capturedWords.filter(w => w.status === 'fuzzy').length

    const totalReviews = [...schedules.values()].reduce((sum, s) => sum + s.reviewCount, 0)
    const masteredSchedules = [...schedules.values()].filter(s => s.status === 'mastered').length
    const activeSchedules = [...schedules.values()].filter(s => s.status === 'active').length

    // 计算真实连续学习天数：收集所有有复习记录的日期，从今天往前数连续天数
    const reviewDates = new Set<string>()
    const now = new Date()
    for (const s of schedules.values()) {
      if (s.lastReviewAt) {
        const d = new Date(s.lastReviewAt)
        const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        reviewDates.add(dateStr)
      }
    }
    let streak = 0
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // 如果今天没有复习记录，从昨天开始算
    const todayStr = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
    if (!reviewDates.has(todayStr)) {
      cursor.setDate(cursor.getDate() - 1)
    }
    while (true) {
      const dateStr = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
      if (reviewDates.has(dateStr)) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }

    return { total, mastered, learning, newCount, fuzzy, totalReviews, masteredSchedules, activeSchedules, streak }
  }, [capturedWords, schedules])

  const statusData = [
    { label: '已掌握', value: stats.mastered, color: '#4fa88b' },
    { label: '学习中', value: stats.learning, color: '#8b5cf6' },
    { label: '模糊', value: stats.fuzzy, color: '#f59e0b' },
    { label: '新词', value: stats.newCount, color: '#706878' },
  ].filter(d => d.value > 0)

  const totalForPie = statusData.reduce((s, d) => s + d.value, 0)
  let conicGradient = ''
  if (totalForPie > 0) {
    let cumulative = 0
    const segments = statusData.map((d) => {
      const start = (cumulative / totalForPie) * 100
      cumulative += d.value
      const end = (cumulative / totalForPie) * 100
      return `${d.color} ${start}% ${end}%`
    })
    conicGradient = `conic-gradient(${segments.join(', ')})`
  }

  return (
    <Drawer isOpen={activePanel === 'stats'} onClose={closePanel} width={400}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <ChartBar size={18} weight="fill" className="text-purple" />
            学习统计
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-2 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen size={14} className="text-purple" />
                <span className="text-[10px] text-ink-muted">捕获词汇</span>
              </div>
              <div className="text-xl font-bold text-ink">{stats.total}</div>
            </div>
            <div className="bg-surface-2 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target size={14} className="text-accent-green" />
                <span className="text-[10px] text-ink-muted">已掌握</span>
              </div>
              <div className="text-xl font-bold text-accent-green">{stats.mastered}</div>
            </div>
            <div className="bg-surface-2 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightning size={14} className="text-purple" />
                <span className="text-[10px] text-ink-muted">复习次数</span>
              </div>
              <div className="text-xl font-bold text-ink">{stats.totalReviews}</div>
            </div>
            <div className="bg-surface-2 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={14} className="text-accent-rose" />
                <span className="text-[10px] text-ink-muted">连续天数</span>
              </div>
              <div className="text-xl font-bold text-ink">{stats.streak}</div>
            </div>
          </div>

          {totalForPie > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-muted mb-3">掌握度分布</div>
              <div className="flex items-center gap-6">
                <div
                  className="w-28 h-28 rounded-full shrink-0"
                  style={{ background: conicGradient }}
                />
                <div className="space-y-2">
                  {statusData.map((d) => (
                    <div key={d.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-ink-dim">{d.label}</span>
                      <span className="text-xs text-ink-muted ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-muted mb-3">复习进度</div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-ink-dim">活跃复习计划</span>
                  <span className="text-xs text-ink-muted font-mono">{stats.activeSchedules}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple transition-all"
                    style={{ width: `${stats.total > 0 ? (stats.activeSchedules / Math.max(1, stats.total)) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-ink-dim">掌握率</span>
                  <span className="text-xs text-ink-muted font-mono">
                    {stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-green transition-all"
                    style={{ width: `${stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  )
}