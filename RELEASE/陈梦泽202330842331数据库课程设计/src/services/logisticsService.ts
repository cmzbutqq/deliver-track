import api from './api'
import { LogisticsCompany } from '@/types'

export const logisticsService = {
  // 获取物流公司列表
  async getLogisticsCompanies(): Promise<LogisticsCompany[]> {
    const response = await api.get('/logistics-companies')
    // 后端返回格式: { success: true, data: [...] }
    return response.data || response
  },
}

