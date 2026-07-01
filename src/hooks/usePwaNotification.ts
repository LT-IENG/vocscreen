import { useEffect, useRef } from 'react'
import { useReviewStore } from '../stores/useReviewStore'

export function usePwaNotification() {
  const intervalRef = useRef<number>(0)

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const checkDueWords = async () => {
      if (Notification.permission !== 'granted') return
      const dueCount = useReviewStore.getState().dueCount
      if (dueCount > 0) {
        new Notification('词映 VocScreen', {
          body: `你有 ${dueCount} 个单词需要复习`,
          icon: '/favicon.svg',
          tag: 'vocscreen-review',
          requireInteraction: false,
        })
      }
    }

    // Check once on mount, then every 4 hours
    checkDueWords()
    intervalRef.current = window.setInterval(checkDueWords, 4 * 60 * 60 * 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])
}