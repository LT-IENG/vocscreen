import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  username: string | null
  loading: boolean
  error: string | null

  signUp: (username: string, password: string) => Promise<{ error: string | null }>
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  init: () => Promise<void>
  clearError: () => void
}

// 用户名转假邮箱（Supabase auth 需要邮箱格式）
function usernameToEmail(username: string): string {
  const clean = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
  return `${clean}@vocscreen.local`
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  username: null,
  loading: false,
  error: null,

  init: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      const username = data.session.user.user_metadata?.username || data.session.user.email?.split('@')[0] || '用户'
      set({ user: data.session.user, username })
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || '用户'
        set({ user: session.user, username })
      } else {
        set({ user: null, username: null })
      }
    })
  },

  signUp: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const clean = username.trim()
      if (clean.length < 2) {
        set({ loading: false })
        return { error: '用户名至少 2 个字符' }
      }
      if (clean.length > 20) {
        set({ loading: false })
        return { error: '用户名最多 20 个字符' }
      }
      if (password.length < 6) {
        set({ loading: false })
        return { error: '密码至少 6 位' }
      }

      const email = usernameToEmail(clean)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: clean } },
      })

      if (error) {
        const msg = error.message.includes('already registered')
          ? '用户名已存在，请直接登录'
          : error.message
        set({ loading: false, error: msg })
        return { error: msg }
      }

      if (data.user) {
        set({ user: data.user, username: clean, loading: false })
        return { error: null }
      }

      set({ loading: false })
      return { error: '注册失败，请重试' }
    } catch (e) {
      set({ loading: false, error: '网络错误' })
      return { error: '网络错误' }
    }
  },

  signIn: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const email = usernameToEmail(username)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const msg = error.message.includes('Invalid login')
          ? '用户名或密码错误'
          : error.message
        set({ loading: false, error: msg })
        return { error: msg }
      }

      set({ user: data.user, username: username.trim(), loading: false })
      return { error: null }
    } catch (e) {
      set({ loading: false, error: '网络错误' })
      return { error: '网络错误' }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, username: null })
  },

  clearError: () => set({ error: null }),
}))
