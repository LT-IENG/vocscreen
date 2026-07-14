import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { checkPendingClear } from './db/database'

// 启动时检查是否需要清理数据库（在 React 挂载之前）
checkPendingClear()

// Set theme before first paint to avoid flash
try {
  const prefs = JSON.parse(localStorage.getItem('vocScreenV2Prefs') || '{}')
  document.documentElement.setAttribute('data-theme', prefs.theme || 'dark')
} catch { document.documentElement.setAttribute('data-theme', 'dark') }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)