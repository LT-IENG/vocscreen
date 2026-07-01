import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, CheckCircle, WarningCircle, Info } from '@phosphor-icons/react'

type ToastType = 'success' | 'error' | 'info'

interface ToastState {
  id: string
  message: string
  type: ToastType
}

let addToastFn: ((message: string, type: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'info') {
  addToastFn?.(message, type)
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const icons = {
    success: <CheckCircle size={16} weight="fill" className="text-accent-green" />,
    error: <WarningCircle size={16} weight="fill" className="text-accent-rose" />,
    info: <Info size={16} weight="fill" className="text-purple" />,
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-1 border border-surface-border shadow-card text-xs text-ink"
          >
            {icons[t.type]}
            <span>{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="ml-1 p-0.5 rounded text-ink-muted hover:text-ink">
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}