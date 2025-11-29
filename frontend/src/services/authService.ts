import api from './api'
import { LoginRequest, LoginResponse, Merchant } from '@/types'

export const authService = {
  // 登录
  async login(data: LoginRequest): Promise<LoginResponse> {
    return api.post('/auth/login', data)
  },

  // 注册
  async register(data: { username: string; password: string; name?: string }): Promise<Merchant> {
    return api.post('/auth/register', data)
  },
}

