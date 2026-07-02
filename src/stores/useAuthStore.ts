import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  username: string | null
  pendingEmail: string | null
  loading: boolean
  error: string | null

  signUp: (email: string, password: string) => Promise<{ error: string | null; needsVerification?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  init: () => Promise<void>
  resendVerification: (email: string) => Promise<{ error: string | null }>
  clearError: () => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  username: null,
  pendingEmail: null,
  loading: false,
  error: null,

  init: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      const username = data.session.user.email?.split('@')[0] || '用户'
      set({ user: data.session.user, username })
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const username = session.user.email?.split('@')[0] || '用户'
        set({ user: session.user, username, pendingEmail: null })
      } else {
        set({ user: null, username: null })
      }
    })
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const cleanEmail = email.trim().toLowerCase()
      if (!EMAIL_REGEX.test(cleanEmail)) {
        set({ loading: false })
        return { error: '请输入有效的邮箱地址' }
      }
      if (password.length < 6) {
        set({ loading: false })
        return { error: '密码至少 6 位' }
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (error) {
        const msg = error.message.includes('already registered')
          ? '该邮箱已注册，请直接登录'
          : error.message
        set({ loading: false, error: msg })
        return { error: msg }
      }

      // 邮箱验证流程：session 为 null，需用户去邮箱点链接
      if (data.user && !data.session) {
        set({ loading: false, pendingEmail: cleanEmail })
        return { error: null, needsVerification: true }
      }

      if (data.session) {
        const username = data.user?.email?.split('@')[0] || '用户'
        set({ user: data.user, username, loading: false, pendingEmail: null })
        return { error: null }
      }

      set({ loading: false })
      return { error: '注册失败，请重试' }
    } catch {
      set({ loading: false, error: '网络错误' })
      return { error: '网络错误' }
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const cleanEmail = email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        let msg = error.message
        if (error.message.includes('Invalid login')) {
          msg = '邮箱或密码错误'
        } else if (error.message.includes('Email not confirmed')) {
          msg = '请先点击邮件中的链接完成验证'
        }
        set({ loading: false, error: msg })
        return { error: msg }
      }

      const username = data.user?.email?.split('@')[0] || '用户'
      set({ user: data.user, username, loading: false })
      return { error: null }
    } catch {
      set({ loading: false, error: '网络错误' })
      return { error: '网络错误' }
    }
  },

  resendVerification: async (email) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase.auth.resend({
        email: email.trim().toLowerCase(),
        type: 'signup',
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) {
        set({ loading: false, error: error.message })
        return { error: error.message }
      }
      set({ loading: false })
      return { error: null }
    } catch {
      set({ loading: false, error: '网络错误' })
      return { error: '网络错误' }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, username: null, pendingEmail: null })
  },

  clearError: () => set({ error: null }),
}))
