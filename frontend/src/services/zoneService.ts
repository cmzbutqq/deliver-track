import api from './api'
import { DeliveryZone, Order } from '@/types'

export const zoneService = {
  // 获取配送区域列表
  async getZones(): Promise<DeliveryZone[]> {
    return api.get('/delivery-zones')
  },

  // 获取配送区域详情
  async getZone(id: string): Promise<DeliveryZone> {
    return api.get(`/delivery-zones/${id}`)
  },

  // 创建配送区域
  async createZone(data: {
    name: string
    boundary: {
      type: 'Polygon'
      coordinates: number[][][]
    }
    timeLimit?: number
  }): Promise<DeliveryZone> {
    return api.post('/delivery-zones', data)
  },

  // 更新配送区域
  async updateZone(
    id: string,
    data: {
      name?: string
      boundary?: {
        type: 'Polygon'
        coordinates: number[][][]
      }
      timeLimit?: number
    }
  ): Promise<DeliveryZone> {
    return api.patch(`/delivery-zones/${id}`, data)
  },

  // 删除配送区域
  async deleteZone(id: string): Promise<void> {
    return api.delete(`/delivery-zones/${id}`)
  },

  // 获取区域内订单
  async getZoneOrders(id: string): Promise<Order[]> {
    return api.get(`/delivery-zones/${id}/orders`)
  },
}

