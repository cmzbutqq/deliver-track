import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Merchant } from '@/types'
import { authService } from '@/services/authService'

interface AuthState {
  token: string | null
  user: Merchant | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: Merchant) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      
      login: async (username: string, password: string) => {
        const response = await authService.login({ username, password })
        set({
          token: response.access_token,
          user: response.user as Merchant,
          isAuthenticated: true,
        })
        // 同时存储到 localStorage（用于 API 拦截器）
        localStorage.setItem('token', response.access_token)
      },
      
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        })
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      },
      
      setUser: (user: Merchant) => {
        set({ user })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

