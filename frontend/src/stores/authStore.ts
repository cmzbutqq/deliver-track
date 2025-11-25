import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Merchant } from '../types';

interface AuthState {
  token: string | null;
  merchant: Merchant | null;
  isAuthenticated: boolean;
  setAuth: (token: string, merchant: Merchant) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      merchant: null,
      isAuthenticated: false,
      setAuth: (token, merchant) => {
        // 先更新 state，persist middleware 会自动同步到 localStorage
        set({ token, merchant, isAuthenticated: true });
        // 同时手动设置 token 到 localStorage（用于 API 拦截器）
        localStorage.setItem('token', token);
      },
      clearAuth: () => {
        // 先更新 state
        set({ token: null, merchant: null, isAuthenticated: false });
        // 清理 localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('merchant');
      },
    }),
    {
      name: 'auth-storage',
      // 只持久化 token 和 merchant，isAuthenticated 由它们计算得出
      partialize: (state) => ({
        token: state.token,
        merchant: state.merchant,
      }),
      // 从 localStorage 恢复时重新计算 isAuthenticated
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!(state.token && state.merchant);
        }
      },
    }
  )
);

