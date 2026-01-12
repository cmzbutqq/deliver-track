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

  // 使用 Canvas 创建圆形图标（0.5倍大小）
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 16
  canvas.height = 16

  // 绘制圆形
  ctx!.fillStyle = color
  ctx!.beginPath()
  ctx!.arc(8, 8, 7, 0, Math.PI * 2)
  ctx!.fill()

  // 绘制白色边框
  ctx!.strokeStyle = '#fff'
  ctx!.lineWidth = 1
  ctx!.stroke()

  return new AMap.Icon({
    image: canvas.toDataURL(),
    size: new AMap.Size(16, 16),
    imageSize: new AMap.Size(16, 16),
  })
}

// 创建起点图标（红色）
export const createOriginIcon = (AMap: any) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 16
  canvas.height = 16

  // 绘制红色圆形（0.5倍大小）
  ctx!.fillStyle = '#ff4d4f'
  ctx!.beginPath()
  ctx!.arc(8, 8, 7, 0, Math.PI * 2)
  ctx!.fill()

  // 绘制白色边框
  ctx!.strokeStyle = '#fff'
  ctx!.lineWidth = 1
  ctx!.stroke()

  // 绘制起点标识（向上的箭头或字母 S）
  ctx!.fillStyle = '#fff'
  ctx!.font = 'bold 8px Arial'
  ctx!.textAlign = 'center'
  ctx!.textBaseline = 'middle'
  ctx!.fillText('起', 8, 8)

  return new AMap.Icon({
    image: canvas.toDataURL(),
    size: new AMap.Size(16, 16),
    imageSize: new AMap.Size(16, 16),
  })
}

// 创建终点图标（蓝色）
export const createDestinationIcon = (AMap: any) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 16
  canvas.height = 16

  // 绘制蓝色圆形（0.5倍大小）
  ctx!.fillStyle = '#1890ff'
  ctx!.beginPath()
  ctx!.arc(8, 8, 7, 0, Math.PI * 2)
  ctx!.fill()

  // 绘制白色边框
  ctx!.strokeStyle = '#fff'
  ctx!.lineWidth = 1
  ctx!.stroke()

  // 绘制终点标识（向下的箭头或字母 E）
  ctx!.fillStyle = '#fff'
  ctx!.font = 'bold 8px Arial'
  ctx!.textAlign = 'center'
  ctx!.textBaseline = 'middle'
  ctx!.fillText('终', 8, 8)

  return new AMap.Icon({
    image: canvas.toDataURL(),
    size: new AMap.Size(16, 16),
    imageSize: new AMap.Size(16, 16),
  })
}

/**
 * 计算两点之间的方位角（角度，0-360度，0度为北）
 * 考虑纬度影响：经度差需要乘以 cos(lat) 来校正
 * @param from 起点 [lng, lat]
 * @param to 终点 [lng, lat]
 * @returns 方位角（度），0度为北，顺时针增加
 */
export const calculateBearing = (from: [number, number], to: [number, number]): number => {
  const [fromLng, fromLat] = from
  const [toLng, toLat] = to
  
  // 转换为弧度
  const fromLatRad = (fromLat * Math.PI) / 180
  const toLatRad = (toLat * Math.PI) / 180
  const deltaLngRad = ((toLng - fromLng) * Math.PI) / 180
  
  // 计算经度差（考虑纬度影响）
  const x = Math.sin(deltaLngRad) * Math.cos(toLatRad)
  const y = Math.cos(fromLatRad) * Math.sin(toLatRad) - 
            Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLngRad)
  
  // 计算方位角（弧度）
  const bearingRad = Math.atan2(x, y)
  
  // 转换为度（0-360，0度为北）
  let bearingDeg = (bearingRad * 180) / Math.PI
  bearingDeg = (bearingDeg + 360) % 360
  
  return bearingDeg
}

/**
 * 根据路径点和进度计算箭头角度
 * @param routePoints 路径点数组 [[lng, lat], ...]
 * @param progress 进度百分比 (0-100)
 * @returns 角度（度），如果无法计算则返回 null
 */
export const calculateVehicleAngle = (
  routePoints: number[][],
  progress: number
): number | null => {
  if (!routePoints || routePoints.length < 2) {
    return null
  }
  
  // 根据 progress 计算当前在路径上的索引（不提前）
  const currentIndex = Math.floor((progress / 100) * routePoints.length)
  
  // 确保索引在有效范围内
  if (currentIndex < 0 || currentIndex >= routePoints.length - 1) {
    // 如果已经到达最后一个点，使用最后两个点计算角度
    if (currentIndex >= routePoints.length - 1 && routePoints.length >= 2) {
      const from = routePoints[routePoints.length - 2] as [number, number]
      const to = routePoints[routePoints.length - 1] as [number, number]
      return calculateBearing(from, to)
    }
    return null
  }
  
  // 获取当前点和下一个点
  const from = routePoints[currentIndex] as [number, number]
  const to = routePoints[currentIndex + 1] as [number, number]
  
  return calculateBearing(from, to)
}

// 创建车辆图标（使用箭头图标，支持角度旋转）
export const createVehicleIcon = (AMap: any, angle: number = 0) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 30
  canvas.height = 30

  // 将角度转换为弧度（地图角度：0度为北，顺时针；canvas角度：0度为右，逆时针）
  // 需要转换为 canvas 坐标系：0度为右，逆时针为正
  // 顺时针旋转90度：在原角度基础上加90度
  const angleRad = (angle * Math.PI) / 180

  // 保存上下文状态
  ctx!.save()

  // 移动到画布中心（0.75倍大小）
  ctx!.translate(15, 15)
  // 旋转画布
  ctx!.rotate(angleRad)

  // 绘制箭头主体（橙色，指向北/上）
  ctx!.fillStyle = '#ff7a00'
  ctx!.beginPath()
  // 箭头头部（向上的三角形，0.75倍缩放）
  ctx!.moveTo(0, -9)    // 顶部尖点（相对于中心，-12 * 0.75 = -9）
  ctx!.lineTo(-6, 0)    // 左下角（-8 * 0.75 = -6）
  ctx!.lineTo(-3, 0)    // 左肩（-4 * 0.75 = -3）
  ctx!.lineTo(-3, 9)    // 左底部（12 * 0.75 = 9）
  ctx!.lineTo(3, 9)     // 右底部（4 * 0.75 = 3）
  ctx!.lineTo(3, 0)     // 右肩（4 * 0.75 = 3）
  ctx!.lineTo(6, 0)     // 右下角（8 * 0.75 = 6）
  ctx!.closePath()
  ctx!.fill()

  // 绘制箭头边框（白色，增加对比度）
  ctx!.strokeStyle = '#fff'
  ctx!.lineWidth = 1.5  // 2 * 0.75 = 1.5
  ctx!.beginPath()
  ctx!.moveTo(0, -9)
  ctx!.lineTo(-6, 0)
  ctx!.lineTo(-3, 0)
  ctx!.lineTo(-3, 9)
  ctx!.lineTo(3, 9)
  ctx!.lineTo(3, 0)
  ctx!.lineTo(6, 0)
  ctx!.closePath()
  ctx!.stroke()

  // 绘制箭头内部高光（浅橙色，增加立体感）
  ctx!.fillStyle = '#ffa64d'
  ctx!.beginPath()
  ctx!.moveTo(0, -7.5)   // -10 * 0.75 = -7.5
  ctx!.lineTo(-4.5, 0)  // -6 * 0.75 = -4.5
  ctx!.lineTo(-1.5, 0)  // -2 * 0.75 = -1.5
  ctx!.lineTo(-1.5, 7.5) // 10 * 0.75 = 7.5
  ctx!.lineTo(1.5, 7.5)  // 2 * 0.75 = 1.5
  ctx!.lineTo(1.5, 0)    // 2 * 0.75 = 1.5
  ctx!.lineTo(4.5, 0)   // 6 * 0.75 = 4.5
  ctx!.closePath()
  ctx!.fill()

  // 恢复上下文状态
  ctx!.restore()

  return new AMap.Icon({
    image: canvas.toDataURL(),
    size: new AMap.Size(30, 30),
    imageSize: new AMap.Size(30, 30),
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

/**
 * 射线法判断点是否在多边形内
 * @param point 点坐标 { lng, lat }
 * @param polygon 多边形顶点数组 [[lng, lat], ...]
 * @returns 是否在多边形内
 */
export const isPointInPolygon = (
  point: { lng: number; lat: number },
  polygon: number[][]
): boolean => {
  const { lng, lat } = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }

  return inside
}

