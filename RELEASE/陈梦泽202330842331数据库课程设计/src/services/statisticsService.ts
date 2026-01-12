import api from './api'
import { OverviewStatistics, ZoneStatistics, LogisticsStatistics } from '@/types'

export const statisticsService = {
  // 获取总览统计
  async getOverview(dateStr?: string): Promise<OverviewStatistics> {
    const response = await api.get('/statistics/overview', { params: { date: dateStr } })
    // 后端返回格式: { success: true, data: {...} }
    return response.data || response
  },

  // 获取配送区域统计
  async getZoneStatistics(): Promise<ZoneStatistics[]> {
    const response = await api.get('/statistics/zones')
    // 后端返回格式: { success: true, data: [...] }
    return response.data || response
  },

  // 获取物流公司统计
  async getLogisticsStatistics(): Promise<LogisticsStatistics[]> {
    const response = await api.get('/statistics/logistics')
    // 后端返回格式: { success: true, data: [...] }
    return response.data || response
  },
}

