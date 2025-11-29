import api from './api'
import { Order } from '@/types'

export const trackingService = {
  // 获取追踪信息
  async getTrackingInfo(orderNo: string): Promise<{
    success: boolean
    data?: Order
    message?: string
  }> {
    return api.get(`/tracking/${orderNo}`)
  },
}

