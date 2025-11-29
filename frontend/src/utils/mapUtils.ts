import { OrderStatus } from '@/types'

// 创建状态图标
export const createStatusIcon = (status: OrderStatus, AMap: any) => {
  const colors = {
    PENDING: '#d9d9d9', // 灰色
    SHIPPING: '#1890ff', // 蓝色
    DELIVERED: '#52c41a', // 绿色
    CANCELLED: '#f5222d', // 红色
  }

  const color = colors[status] || '#d9d9d9'

  // 使用 Canvas 创建圆形图标
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 32
  canvas.height = 32

  // 绘制圆形
  ctx!.fillStyle = color
  ctx!.beginPath()
  ctx!.arc(16, 16, 14, 0, Math.PI * 2)
  ctx!.fill()

  // 绘制白色边框
  ctx!.strokeStyle = '#fff'
  ctx!.lineWidth = 2
  ctx!.stroke()

  return new AMap.Icon({
    image: canvas.toDataURL(),
    size: new AMap.Size(32, 32),
    imageSize: new AMap.Size(32, 32),
  })
}

// 创建起点图标
export const createOriginIcon = (AMap: any) => {
  return new AMap.Icon({
    image: 'https://webapi.amap.com/images/marker_red.png',
    size: new AMap.Size(32, 32),
    imageSize: new AMap.Size(32, 32),
  })
}

// 创建终点图标
export const createDestinationIcon = (AMap: any) => {
  return new AMap.Icon({
    image: 'https://webapi.amap.com/images/marker_blue.png',
    size: new AMap.Size(32, 32),
    imageSize: new AMap.Size(32, 32),
  })
}

// 创建车辆图标
export const createVehicleIcon = (AMap: any) => {
  return new AMap.Icon({
    image: 'https://webapi.amap.com/images/car.png',
    size: new AMap.Size(40, 40),
    imageSize: new AMap.Size(40, 40),
  })
}

// 创建路径线
export const createPolyline = (
  map: any,
  AMap: any,
  path: number[][],
  options?: {
    strokeColor?: string
    strokeWeight?: number
    strokeStyle?: string
    lineDash?: number[]
    zIndex?: number
  }
) => {
  return new AMap.Polyline({
    path,
    strokeColor: options?.strokeColor || '#1890ff',
    strokeWeight: options?.strokeWeight || 4,
    strokeStyle: options?.strokeStyle || 'solid',
    lineDash: options?.lineDash,
    zIndex: options?.zIndex || 10,
    map,
  })
}

// 创建多边形
export const createPolygon = (
  map: any,
  AMap: any,
  path: number[][],
  options?: {
    strokeColor?: string
    fillColor?: string
    fillOpacity?: number
  }
) => {
  return new AMap.Polygon({
    path,
    strokeColor: options?.strokeColor || '#1890ff',
    fillColor: options?.fillColor || '#1890ff',
    fillOpacity: options?.fillOpacity || 0.3,
    map,
  })
}

