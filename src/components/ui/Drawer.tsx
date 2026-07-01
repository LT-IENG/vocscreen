import { useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  width?: number
}

export function Drawer({ isOpen, onClose, children, width = 380 }: DrawerProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: width }}
            animate={{ x: 0 }}
            exit={{ x: width }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="panel-glass fixed top-0 right-0 z-40 h-full overflow-y-auto"
            style={{ width }}
          >
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}