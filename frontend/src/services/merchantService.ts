import api from './api'
import { Merchant, Location } from '@/types'

export const merchantService = {
  // 获取商家信息
  async getMerchantInfo(): Promise<Merchant> {
    return api.get('/merchants/me')
  },

  // 更新商家信息
  async updateMerchantInfo(data: {
    name?: string
    phone?: string
    address?: Location
  }): Promise<Merchant> {
    return api.patch('/merchants/me', data)
  },
}

