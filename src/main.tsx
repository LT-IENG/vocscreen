import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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