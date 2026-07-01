interface ProgressBarProps {
  progress: number
  label?: string
  className?: string
}

export function ProgressBar({ progress, label, className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, progress * 100))

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-ink-dim">{label}</span>
          <span className="text-[11px] text-ink-muted font-mono">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-purple transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}