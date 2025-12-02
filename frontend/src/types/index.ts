// 订单状态枚举
export enum OrderStatus {
  PENDING = 'PENDING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// 地理位置类型
export interface Location {
  lng: number
  lat: number
  address: string
}

// 订单类型
export interface Order {
  id: string
  orderNo: string
  status: OrderStatus
  merchantId: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  productName: string
  productQuantity: number
  amount: number
  origin: Location
  destination: Location
  currentLocation?: Location
  estimatedTime?: string
  actualTime?: string
  logistics: string
  createdAt: string
  updatedAt: string
  route?: Route
  timeline?: LogisticsTimeline[]
  merchant?: {
    id: string
    name: string
    phone: string
  }
}

// 路径类型
export interface Route {
  id: string
  orderId: string
  points: number[][] // [[lng, lat], ...]
  timeArray?: number[] // t_real数组，单位：秒
  currentStep: number
  totalSteps: number
  interval: number
}

// 物流时间线类型
export interface LogisticsTimeline {
  id: string
  orderId: string
  status: string
  description: string
  location?: string
  timestamp: string
}

// 商家类型
export interface Merchant {
  id: string
  username: string
  name?: string
  phone?: string
  address?: Location
  createdAt: string
  updatedAt: string
}

// 配送区域类型
export interface DeliveryZone {
  id: string
  name: string
  merchantId: string
  boundary: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  logistics: string
  createdAt: string
  updatedAt: string
}

// 物流公司类型
export interface LogisticsCompany {
  id: string
  name: string
  speed: number // 配送速度系数 (0 < speed <= 1)
  createdAt: string
  updatedAt: string
}

// API 响应类型
export interface ApiResponse<T = any> {
  success?: boolean
  data?: T
  message?: string
}

// 登录请求类型
export interface LoginRequest {
  username: string
  password: string
}

// 登录响应类型
export interface LoginResponse {
  access_token: string
  user: {
    id: string
    username: string
    name?: string
  }
}

// 创建订单请求类型
export interface CreateOrderRequest {
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  productName: string
  productQuantity: number
  amount: number
  destination: Location
  origin?: Location
  logistics?: string
}

// WebSocket 事件类型
export interface LocationUpdateEvent {
  orderNo: string
  location: {
    lng: number
    lat: number
  }
  progress: number
  status?: OrderStatus
  estimatedTime?: string
}

export interface StatusUpdateEvent {
  orderNo: string
  status: OrderStatus
  message: string
}

export interface DeliveryCompleteEvent {
  orderNo: string
  status: OrderStatus
  actualTime: string
}

// 统计数据类型
export interface OverviewStatistics {
  todayOrders: number
  todayAmount: number
  shippingOrders: number
  completedOrders: number
  pendingOrders: number
  cancelledOrders: number
}

export interface ZoneStatistics {
  zoneName: string
  orderCount: number
  avgDeliveryTime: number
}

export interface LogisticsStatistics {
  companyName: string
  orderCount: number
  avgDeliveryTime: number
  onTimeRate: number
}

