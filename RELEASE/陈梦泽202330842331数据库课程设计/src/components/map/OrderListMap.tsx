import { useEffect, useRef, useCallback } from 'react'
import MapComponent from './MapComponent'
import { Order } from '@/types'
import { createStatusIcon, createPolyline, createVehicleIcon, calculateVehicleAngle } from '@/utils/mapUtils'

interface OrderListMapProps {
  selectedOrders: Order[]
}

const OrderListMap = ({ selectedOrders }: OrderListMapProps) => {
  const markersRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])
  const mapRef = useRef<any>(null)
  const AMapRef = useRef<any>(null)
  const lastOrderIdsRef = useRef<string>('')

  const updateMapMarkers = useCallback(() => {
    if (!mapRef.current || !AMapRef.current) return

    // 检查订单列表是否真的发生了变化（比较订单ID列表）
    const currentOrderIds = selectedOrders.map(o => o.id).sort().join(',')
    const orderListChanged = lastOrderIdsRef.current !== currentOrderIds
    lastOrderIdsRef.current = currentOrderIds

    // 清除之前的标记和路径
    markersRef.current.forEach((marker) => marker.setMap(null))
    polylinesRef.current.forEach((polyline) => polyline.setMap(null))
    markersRef.current = []
    polylinesRef.current = []

    if (selectedOrders.length === 0) {
      // 没有选中订单时，只在订单列表变化时重置视野
      if (orderListChanged) {
        mapRef.current.setCenter([116.397428, 39.90923])
        mapRef.current.setZoom(10)
      }
      return
    }

    const positions: [number, number][] = []

    // 为每个选中的订单创建标记和路径
    selectedOrders.forEach((order) => {
      const dest = order.destination as { lng: number; lat: number }
      
      // 验证并跳过无效订单，而不是抛出错误导致整个组件崩溃
      if (!dest) {
        console.warn(`订单 ${order.orderNo} 的 destination 为空，跳过`)
        return
      }
      if (typeof dest.lng !== 'number' || typeof dest.lat !== 'number') {
        console.warn(`订单 ${order.orderNo} 的坐标格式错误: lng=${dest.lng} (${typeof dest.lng}), lat=${dest.lat} (${typeof dest.lat})，跳过`)
        return
      }
      
      // 验证坐标是否合理（中国大致范围：经度 73-135，纬度 18-54）
      if (dest.lng < 73 || dest.lng > 135 || dest.lat < 18 || dest.lat > 54) {
        console.warn(`订单 ${order.orderNo} 的坐标超出中国范围: lng=${dest.lng}, lat=${dest.lat}，跳过`)
        return
      }
      
      const position: [number, number] = [dest.lng, dest.lat]
      positions.push(position)
      
      // 创建终点标记
      const marker = new AMapRef.current.Marker({
        position,
        icon: createStatusIcon(order.status, AMapRef.current),
        title: order.orderNo,
        map: mapRef.current,
        anchor: 'center', // 设置锚点为中心，让图标中心在路径上
      })

      markersRef.current.push(marker)

      // 如果是运输中订单，显示路径和当前位置
      if (order.status === 'SHIPPING' && order.route) {
        const routePoints = order.route.points as number[][]
        
        if (routePoints && routePoints.length >= 2) {
          // 计算已走过的路径和未走过的路径
          let passedPoints: number[][] = []
          let remainingPoints: number[][] = routePoints
          
          if (order.currentLocation && order.route.currentStep !== undefined) {
            const currentIndex = order.route.currentStep
            passedPoints = routePoints.slice(0, currentIndex + 1)
            remainingPoints = routePoints.slice(currentIndex)
          }
          
          // 已走过的路径（红色实线）
          if (passedPoints.length >= 2) {
            const passedPolyline = createPolyline(mapRef.current, AMapRef.current, passedPoints, {
              strokeColor: '#ff4d4f',
              strokeWeight: 3,
              strokeStyle: 'solid',
            })
            polylinesRef.current.push(passedPolyline)
          }
          
          // 未走过的路径（蓝色实线）
          if (remainingPoints.length >= 2) {
            const remainingPolyline = createPolyline(mapRef.current, AMapRef.current, remainingPoints, {
              strokeColor: '#1890ff',
              strokeWeight: 3,
              strokeStyle: 'solid',
            })
            polylinesRef.current.push(remainingPolyline)
          }
        }

        // 显示当前位置（基于路径点而不是 currentLocation）
        if (order.route && order.route.points && order.route.currentStep !== undefined) {
          const routePoints = order.route.points as number[][]
          
          if (routePoints && routePoints.length >= 2) {
            const currentStep = order.route.currentStep
            // 确保 currentStep 在有效范围内
            const validStep = Math.min(Math.max(0, currentStep), routePoints.length - 1)
            const currentPoint = routePoints[validStep]
            
            if (currentPoint && Array.isArray(currentPoint) && currentPoint.length >= 2) {
              const currentLng = currentPoint[0]
              const currentLat = currentPoint[1]
              
              // 验证当前位置坐标有效性，无效则跳过
              if (typeof currentLng !== 'number' || typeof currentLat !== 'number') {
                console.warn(`订单 ${order.orderNo} 的路径点坐标格式错误: lng=${currentLng} (${typeof currentLng}), lat=${currentLat} (${typeof currentLat})，跳过`)
                return
              }
              
              if (isNaN(currentLng) || isNaN(currentLat) || !isFinite(currentLng) || !isFinite(currentLat)) {
                console.warn(`订单 ${order.orderNo} 的路径点坐标无效: lng=${currentLng}, lat=${currentLat}，跳过`)
                return
              }
              
              // 验证坐标范围（中国大致范围：经度 73-135，纬度 18-54）
              if (currentLng < 73 || currentLng > 135 || currentLat < 18 || currentLat > 54) {
                console.warn(`订单 ${order.orderNo} 的路径点坐标超出中国范围: lng=${currentLng}, lat=${currentLat}，跳过`)
                return
              }
              
              const currentPos: [number, number] = [currentLng, currentLat]
              positions.push(currentPos)
              
              // 计算箭头角度（基于 currentStep）
              let angle = 0
              const progress = validStep >= routePoints.length - 1
                ? 100
                : (validStep / (routePoints.length - 1)) * 100
              const calculatedAngle = calculateVehicleAngle(
                routePoints,
                progress
              )
              if (calculatedAngle !== null) {
                angle = calculatedAngle
              }
              
              const currentMarker = new AMapRef.current.Marker({
                position: currentPos,
                icon: createVehicleIcon(AMapRef.current, angle),
                title: '当前位置',
                map: mapRef.current,
                anchor: 'center', // 设置锚点为中心，让图标中心在路径上
              })
              markersRef.current.push(currentMarker)
            }
          }
        }
      }

      // 点击标记显示订单信息
      marker.on('click', () => {
        console.log('点击订单:', order.orderNo)
      })
    })

    // 只在订单列表变化时调整视野，状态刷新时不重新缩放
    if (orderListChanged && positions.length > 0) {
      try {
        // 使用 setFitView 自动调整视野
        const overlays = [...markersRef.current, ...polylinesRef.current].filter(Boolean)
        if (overlays.length > 0) {
          mapRef.current.setFitView(overlays, false, [50, 50, 50, 50])
        } else {
          // 如果没有覆盖物，使用第一个点作为中心并设置默认缩放级别
          mapRef.current.setCenter(positions[0])
          mapRef.current.setZoom(12)
        }
      } catch (error) {
        // setFitView 不可用时直接抛出错误
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`订单地图视野调整失败: ${errorMessage}`)
      }
    }
  }, [selectedOrders])

  const handleMapReady = (map: any, AMap: any) => {
    mapRef.current = map
    AMapRef.current = AMap
    updateMapMarkers()
  }

  // 当选中订单变化时，更新地图标记
  useEffect(() => {
    if (mapRef.current && AMapRef.current) {
      updateMapMarkers()
    }
  }, [selectedOrders, updateMapMarkers])

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <MapComponent
        id="order-list-map"
        onMapReady={handleMapReady}
        style={{ height: '100%' }}
      />
    </div>
  )
}

export default OrderListMap

