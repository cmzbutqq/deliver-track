// 订单状态
export type OrderStatus = 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

// 地理位置
export interface Location {
  lng: number;
  lat: number;
  address?: string;
}

// 商家
export interface Merchant {
  id: string;
  username: string;
  name: string;
  phone: string;
  address?: Location;
}

// 订单
export interface Order {
  id: string;
  orderNo: string;
  status: OrderStatus;
  merchantId: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  productName: string;
  productQuantity: number;
  amount: number;
  logistics: string;
  origin: Location;
  destination: Location;
  currentLocation?: Location;
  estimatedTime: string;
  actualTime?: string;
  createdAt: string;
  updatedAt: string;
  route?: Route;
}

// 路径
export interface Route {
  id: string;
  orderId: string;
  points: number[][]; // [[lng, lat], ...]
  currentStep: number;
  totalSteps: number;
  interval: number;
}

// 物流时间线
export interface LogisticsTimeline {
  id: string;
  orderId: string;
  status: string;
  description: string;
  location?: Location;
  timestamp: string;
}

// 配送区域
export interface DeliveryZone {
  id: string;
  name: string;
  merchantId: string;
  boundary: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  timeLimit: number;
  createdAt: string;
  updatedAt: string;
}

// 物流公司
export interface LogisticsCompany {
  id: string;
  name: string;
  timeLimit: number;
}

// 创建订单 DTO
export interface CreateOrderDto {
  logistics: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  destination: Location;
  productName: string;
  productQuantity: number;
  amount: number;
  origin?: Location;
}

// 更新订单 DTO
export interface UpdateOrderDto {
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  destination?: Location;
  productName?: string;
  productQuantity?: number;
  amount?: number;
}

// 登录 DTO
export interface LoginDto {
  username: string;
  password: string;
}

// 注册 DTO
export interface RegisterDto {
  username: string;
  password: string;
  name: string;
  phone: string;
}

// 登录响应
export interface LoginResponse {
  access_token: string;
  merchant: Merchant;
}

// 统计数据
export interface StatisticsOverview {
  todayOrders: number;
  shippingOrders: number;
  completedOrders: number;
  todayAmount: number;
}

export interface ZoneStatistics {
  zoneId: string;
  zoneName: string;
  orderCount: number;
  avgDeliveryTime: number;
}

export interface LogisticsStatistics {
  companyId: string;
  companyName: string;
  orderCount: number;
  avgDeliveryTime: number;
  onTimeRate: number;
}

// WebSocket 事件
export interface LocationUpdate {
  orderNo: string;
  location: Location;
  progress: number;
  estimatedTime: string;
}

export interface StatusUpdate {
  orderNo: string;
  status: OrderStatus;
  description: string;
}

export interface DeliveryComplete {
  orderNo: string;
  status: OrderStatus;
  actualTime: string;
}

