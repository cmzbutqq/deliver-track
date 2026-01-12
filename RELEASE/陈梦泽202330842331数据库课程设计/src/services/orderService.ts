import api from './api'
import { Order, CreateOrderRequest, OrderStatus } from '@/types'

export const orderService = {
  // 获取订单列表
  async getOrders(params?: {
    status?: OrderStatus
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<Order[]> {
    return api.get('/orders', { params })
  },

  // 获取订单详情
  async getOrder(id: string): Promise<Order> {
    return api.get(`/orders/${id}`)
  },

  // 创建订单
  async createOrder(data: CreateOrderRequest): Promise<Order> {
    return api.post('/orders', data)
  },

  // 更新订单
  async updateOrder(id: string, data: Partial<CreateOrderRequest>): Promise<Order> {
    return api.patch(`/orders/${id}`, data)
  },

  // 删除订单
  async deleteOrder(id: string): Promise<void> {
    return api.delete(`/orders/${id}`)
  },

  // 发货
  async shipOrder(id: string, interval?: number): Promise<Order> {
    return api.post(`/orders/${id}/ship`, interval ? { interval } : {})
  },

  // 确认送达
  async deliverOrder(id: string): Promise<Order> {
    return api.post(`/orders/${id}/deliver`)
  },

  // 批量发货
  async batchShip(orderIds: string[]): Promise<{
    shipped: number
    failed: number
    total: number
    errors?: string[]
  }> {
    const response = await api.post('/orders/batch/ship', { orderIds })
    return response.data || response
  },

  // 批量删除
  async batchDelete(orderIds: string[]): Promise<{
    deleted: number
    total: number
    failed: number
  }> {
    const response = await api.delete('/orders/batch', { data: { orderIds } })
    return response.data || response
  },

  // 获取最近的活动历史
  async getRecentActivities(limit: number = 100): Promise<any[]> {
    const response = await api.get('/orders/activities/recent', {
      params: { limit },
    })
    // 后端返回格式: { success: true, data: [...] }
    // api 拦截器已经返回 response.data，所以这里 response 就是 { success: true, data: [...] }
    return response.data || response
  },
}

