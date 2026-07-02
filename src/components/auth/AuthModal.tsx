import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useUIStore } from '../../stores/useUIStore'
import { Modal } from '../ui/Modal'
import { UserCircle, Spinner } from '@phosphor-icons/react'

export function AuthModal() {
  const isOpen = useUIStore((s) => s.authModal)
  const closeAuthModal = useUIStore((s) => s.closeAuthModal)
  const { signUp, signIn, loading, error, clearError } = useAuthStore()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (isOpen) {
      clearError()
      setUsername('')
      setPassword('')
    }
  }, [isOpen, clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    const fn = mode === 'login' ? signIn : signUp
    const { error } = await fn(username.trim(), password)
    if (!error) {
      closeAuthModal()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={closeAuthModal}>
      <div className="w-[340px] max-w-[90vw] p-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-purple/15 flex items-center justify-center">
            <UserCircle size={28} className="text-purple" weight="fill" />
          </div>
          <h2 className="text-lg font-display font-semibold text-ink">
            {mode === 'login' ? '登录同步数据' : '注册账号'}
          </h2>
          <p className="text-xs text-ink-muted">
            {mode === 'login'
              ? '登录后生词和进度跨端同步'
              : '用户名 + 密码即可注册'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-ink-muted mb-1.5 ml-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="2-20 个字符"
              maxLength={20}
              autoComplete="username"
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-purple/50 focus:bg-surface-3 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-muted mb-1.5 ml-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-purple/50 focus:bg-surface-3 transition-colors"
            />
          </div>

          {error && (
            <div className="text-xs text-accent-rose bg-accent-rose/10 border border-accent-rose/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full py-2.5 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Spinner size={14} className="animate-spin" />}
            {mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        {/* Switch mode */}
        <div className="text-center text-xs text-ink-muted">
          {mode === 'login' ? '没有账号？' : '已有账号？'}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              clearError()
            }}
            className="ml-1 text-purple-bright hover:underline"
          >
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
