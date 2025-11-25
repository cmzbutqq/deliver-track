import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  Order,
  CreateOrderDto,
  UpdateOrderDto,
  LoginDto,
  RegisterDto,
  LoginResponse,
  Merchant,
  DeliveryZone,
  LogisticsCompany,
  StatisticsOverview,
  ZoneStatistics,
  LogisticsStatistics,
  Route,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// 创建 axios 实例
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 JWT Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('merchant');
      window.location.href = '/merchant/login';
    }
    return Promise.reject(error);
  }
);

// 认证 API
export const authApi = {
  login: (data: LoginDto): Promise<{ data: LoginResponse }> =>
    api.post('/auth/login', data),
  register: (data: RegisterDto): Promise<{ data: Merchant }> =>
    api.post('/auth/register', data),
};

// 商家 API
export const merchantApi = {
  getMe: (): Promise<{ data: Merchant }> => api.get('/merchants/me'),
  updateMe: (data: Partial<Merchant>): Promise<{ data: Merchant }> =>
    api.patch('/merchants/me', data),
};

// 订单 API
export const orderApi = {
  getList: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: Order[]; total?: number }> =>
    api.get('/orders', { params }),
  getById: (id: string): Promise<{ data: Order }> => api.get(`/orders/${id}`),
  create: (data: CreateOrderDto): Promise<{ data: Order }> =>
    api.post('/orders', data),
  update: (id: string, data: UpdateOrderDto): Promise<{ data: Order }> =>
    api.patch(`/orders/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/orders/${id}`),
  ship: (id: string): Promise<{ data: Order & { route: Route } }> =>
    api.post(`/orders/${id}/ship`),
  deliver: (id: string): Promise<{ data: Order }> =>
    api.post(`/orders/${id}/deliver`),
  batchShip: (ids: string[]): Promise<{ data: { shipped: number; failed: number } }> =>
    api.post('/orders/batch/ship', { orderIds: ids }),
  batchDelete: (ids: string[]): Promise<void> =>
    api.delete('/orders/batch', { data: { orderIds: ids } }),
};

// 配送区域 API
export const deliveryZoneApi = {
  getList: (): Promise<{ data: DeliveryZone[] }> => api.get('/delivery-zones'),
  create: (data: Omit<DeliveryZone, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>): Promise<{ data: DeliveryZone }> =>
    api.post('/delivery-zones', data),
  update: (id: string, data: Partial<DeliveryZone>): Promise<{ data: DeliveryZone }> =>
    api.patch(`/delivery-zones/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/delivery-zones/${id}`),
  getOrders: (id: string): Promise<{ data: Order[] }> =>
    api.get(`/delivery-zones/${id}/orders`),
};

// 物流公司 API
export const logisticsCompanyApi = {
  getList: (): Promise<{ data: LogisticsCompany[] }> =>
    api.get('/logistics-companies'),
};

// 统计 API
export const statisticsApi = {
  getOverview: async (): Promise<{ data: StatisticsOverview }> => {
    try {
      const response = await api.get('/statistics/overview');
      const data = response.data?.data || response.data;
      if (!data || typeof data !== 'object') {
        throw new Error('统计数据格式错误');
      }
      return { data };
    } catch (error: any) {
      console.error('获取统计数据失败:', error);
      // 返回默认值而不是抛出错误
      return {
        data: {
          todayOrders: 0,
          shippingOrders: 0,
          completedOrders: 0,
          todayAmount: 0,
        },
      };
    }
  },
  getZones: async (): Promise<{ data: ZoneStatistics[] }> => {
    try {
      const response = await api.get('/statistics/zones');
      const data = response.data?.data || response.data;
      if (!Array.isArray(data)) {
        return { data: [] };
      }
      return { data };
    } catch (error: any) {
      console.error('获取区域统计失败:', error);
      return { data: [] };
    }
  },
  getLogistics: async (): Promise<{ data: LogisticsStatistics[] }> => {
    try {
      const response = await api.get('/statistics/logistics');
      const data = response.data?.data || response.data;
      if (!Array.isArray(data)) {
        return { data: [] };
      }
      return { data };
    } catch (error: any) {
      console.error('获取物流统计失败:', error);
      return { data: [] };
    }
  },
};

// 追踪 API（公开接口）
export const trackingApi = {
  getByOrderNo: (orderNo: string): Promise<{ data: Order & { route: Route; timeline: any[] } }> =>
    api.get(`/tracking/${orderNo}`),
};

export default api;

