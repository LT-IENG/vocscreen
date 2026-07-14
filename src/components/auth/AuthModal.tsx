import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useUIStore } from '../../stores/useUIStore'
import { Modal } from '../ui/Modal'
import { UserCircle, Spinner, EnvelopeSimple, ArrowLeft } from '@phosphor-icons/react'

export function AuthModal() {
  const isOpen = useUIStore((s) => s.authModal)
  const closeAuthModal = useUIStore((s) => s.closeAuthModal)
  const { signUp, signIn, resendVerification, loading, error, clearError, pendingEmail } = useAuthStore()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [view, setView] = useState<'form' | 'awaiting-verify'>('form')
  const [resendSent, setResendSent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      clearError()
      setEmail('')
      setPassword('')
      setView('form')
      setResendSent(false)
    }
  }, [isOpen, clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    if (mode === 'register') {
      const { error, needsVerification } = await signUp(email, password)
      if (!error && needsVerification) {
        setView('awaiting-verify')
      }
    } else {
      const { error } = await signIn(email, password)
      if (!error) {
        closeAuthModal()
      }
    }
  }

  const handleResend = async () => {
    if (!pendingEmail) return
    const { error } = await resendVerification(pendingEmail)
    if (!error) setResendSent(true)
  }

  // 验证提示视图
  if (view === 'awaiting-verify') {
    return (
      <Modal isOpen={isOpen} onClose={closeAuthModal}>
        <div className="w-[340px] max-w-[90vw] p-6 space-y-5 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-purple/15 flex items-center justify-center">
            <EnvelopeSimple size={28} className="text-purple" weight="fill" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-display font-semibold text-ink">验证邮件已发送</h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              我们已向 <span className="text-purple-bright font-medium">{pendingEmail}</span> 发送了验证邮件，
              请点击邮件中的链接完成注册。
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleResend}
              disabled={loading || resendSent}
              className="w-full py-2.5 rounded-lg bg-surface-2 text-sm text-ink-dim hover:text-ink hover:bg-surface-3 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size={14} className="animate-spin" />}
              {resendSent ? '已重新发送' : '重新发送验证邮件'}
            </button>
            <button
              onClick={() => {
                setView('form')
                setMode('login')
                clearError()
              }}
              className="w-full py-2 flex items-center justify-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <ArrowLeft size={12} />
              已验证，去登录
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // 表单视图
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
              : '邮箱注册，验证后即可同步'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-ink-muted mb-1.5 ml-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
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
            disabled={loading || !email.trim() || !password}
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

        {/* Skip login */}
        {mode === 'login' && (
          <button
            onClick={closeAuthModal}
            className="w-full py-2 text-center text-xs text-ink-muted hover:text-ink transition-colors border-t border-surface-border/30 pt-3"
          >
            跳过，先体验
          </button>
        )}
      </div>
    </Modal>
  )
}
