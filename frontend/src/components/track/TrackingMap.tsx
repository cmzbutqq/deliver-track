import { useEffect, useRef, useState, useCallback } from 'react'
import MapComponent from '@/components/map/MapComponent'
import { Order, LocationUpdateEvent, OrderStatus } from '@/types'
import { createOriginIcon, createDestinationIcon, createVehicleIcon, createPolyline } from '@/utils/mapUtils'
import { moveSmoothly } from '@/utils/animationUtils'
import { websocketService } from '@/services/websocketService'

interface TrackingMapProps {
  order: Order
  onLocationUpdate?: (data: LocationUpdateEvent) => void
  onStatusUpdate?: (status: string) => void
}

const TrackingMap = ({ order, onLocationUpdate, onStatusUpdate }: TrackingMapProps) => {
  const [map, setMap] = useState<any>(null)
  const [AMap, setAMap] = useState<any>(null)
  const originMarkerRef = useRef<any>(null)
  const destinationMarkerRef = useRef<any>(null)
  const vehicleMarkerRef = useRef<any>(null)
  const passedLineRef = useRef<any>(null)
  const remainingLineRef = useRef<any>(null)
  const orderRef = useRef<Order>(order)
  const subscribedOrderNoRef = useRef<string | null>(null)
  const onLocationUpdateRef = useRef(onLocationUpdate)
  const onStatusUpdateRef = useRef(onStatusUpdate)

  // 保持最新的 order 和回调函数引用
  useEffect(() => {
    orderRef.current = order
    onLocationUpdateRef.current = onLocationUpdate
    onStatusUpdateRef.current = onStatusUpdate
  }, [order, onLocationUpdate, onStatusUpdate])

  // 清理所有标记和路径线
  const clearAllMarkers = useCallback(() => {
    if (originMarkerRef.current) {
      originMarkerRef.current.setMap(null)
      originMarkerRef.current = null
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null)
      destinationMarkerRef.current = null
    }
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setMap(null)
      vehicleMarkerRef.current = null
    }
    if (passedLineRef.current) {
      passedLineRef.current.setMap(null)
      passedLineRef.current = null
    }
    if (remainingLineRef.current) {
      remainingLineRef.current.setMap(null)
      remainingLineRef.current = null
    }
  }, [])

  const handleMapReady = useCallback((mapInstance: any, AMapInstance: any) => {
    setMap(mapInstance)
    setAMap(AMapInstance)

    // 先清理旧的标记，避免重复创建
    clearAllMarkers()

    const origin = order.origin as { lng: number; lat: number }
    const destination = order.destination as { lng: number; lat: number }

    // 创建起点标记
    originMarkerRef.current = new AMapInstance.Marker({
      position: [origin.lng, origin.lat],
      icon: createOriginIcon(AMapInstance),
      title: '发货地址',
      map: mapInstance,
    })

    // 创建终点标记
    destinationMarkerRef.current = new AMapInstance.Marker({
      position: [destination.lng, destination.lat],
      icon: createDestinationIcon(AMapInstance),
      title: '收货地址',
      map: mapInstance,
    })

    // 如果有路径，绘制路径线
    if (order.route && order.route.points) {
      const routePoints = order.route.points as number[][]
      
      // 验证路径点有效性
      if (routePoints.length < 2) {
        console.warn(`订单 ${order.orderNo} 的路径点数量不足（${routePoints.length}），跳过路径绘制`)
      } else {
        // 计算已走过的路径和未走过的路径
        let passedPoints: number[][] = []
        let remainingPoints: number[][] = routePoints
        
        if (order.currentLocation && order.route.currentStep !== undefined) {
          const currentIndex = order.route.currentStep
          passedPoints = routePoints.slice(0, currentIndex + 1)
          remainingPoints = routePoints.slice(currentIndex)
        }
        
        // 已走过的路径（深蓝实线）- 至少需要2个点
        if (passedPoints.length >= 2) {
          passedLineRef.current = createPolyline(mapInstance, AMapInstance, passedPoints, {
            strokeColor: '#1890ff',
            strokeWeight: 4,
            strokeStyle: 'solid',
            zIndex: 10,
          })
        }
        
        // 未走过的路径（浅灰虚线）- 至少需要2个点
        if (remainingPoints.length >= 2) {
          remainingLineRef.current = createPolyline(mapInstance, AMapInstance, remainingPoints, {
            strokeColor: '#d9d9d9',
            strokeWeight: 3,
            strokeStyle: 'dashed',
            lineDash: [10, 5],
            zIndex: 9,
          })
        }
      }
    }

    // 如果有当前位置，创建车辆标记
    if (order.currentLocation && order.status === OrderStatus.SHIPPING) {
      vehicleMarkerRef.current = new AMapInstance.Marker({
        position: [order.currentLocation.lng, order.currentLocation.lat],
        icon: createVehicleIcon(AMapInstance),
        title: '当前位置',
        map: mapInstance,
      })
    }

    // 调整视野以包含起点和终点
    // setFitView 需要传入覆盖物对象数组，而不是坐标数组
    const overlays: any[] = [originMarkerRef.current, destinationMarkerRef.current]
    
    // 如果有路径线，也加入视野调整
    if (passedLineRef.current) {
      overlays.push(passedLineRef.current)
    }
    if (remainingLineRef.current) {
      overlays.push(remainingLineRef.current)
    }
    
    try {
      mapInstance.setFitView(overlays, false, [20, 20, 20, 20])
    } catch (error) {
      // 如果 setFitView 失败，使用备用方案：手动计算中心点和缩放级别
      const lngDiff = Math.abs(destination.lng - origin.lng)
      const latDiff = Math.abs(destination.lat - origin.lat)
      const maxDiff = Math.max(lngDiff, latDiff)
      
      const centerLng = (origin.lng + destination.lng) / 2
      const centerLat = (origin.lat + destination.lat) / 2
      
      mapInstance.setCenter([centerLng, centerLat])
      
      // 根据范围设置合适的缩放级别
      const zoom = Math.max(8, Math.min(18,
        maxDiff < 0.01 ? 14 :
        maxDiff < 0.05 ? 13 :
        maxDiff < 0.1 ? 12 :
        maxDiff < 0.5 ? 11 :
        maxDiff < 1 ? 10 :
        maxDiff < 2 ? 9 : 8
      ))
      
      mapInstance.setZoom(zoom)
    }
  }, [order, clearAllMarkers])

  // WebSocket 订阅和事件监听 - 只在 map、AMap 或 orderNo 改变时重新执行
  useEffect(() => {
    if (!map || !AMap || !order.orderNo) return

    const currentOrderNo = order.orderNo

    // 如果已经订阅了同一个订单，不需要重新订阅
    if (subscribedOrderNoRef.current === currentOrderNo) {
      return
    }

    // 如果之前订阅了其他订单，先取消订阅
    if (subscribedOrderNoRef.current) {
      websocketService.unsubscribe(subscribedOrderNoRef.current)
    }

    // 连接 WebSocket
    websocketService.connect()

    // 订阅订单
    websocketService.subscribe(currentOrderNo)
    subscribedOrderNoRef.current = currentOrderNo

    // 监听位置更新
    const handleLocationUpdate = (data: LocationUpdateEvent) => {
      // 使用 ref 获取最新的 order，避免闭包问题
      const currentOrder = orderRef.current
      if (data.orderNo !== currentOrder.orderNo) return

      if (data.location) {
        // 如果车辆标记不存在，创建它
        if (!vehicleMarkerRef.current && map && AMap) {
          vehicleMarkerRef.current = new AMap.Marker({
            position: [data.location.lng, data.location.lat],
            icon: createVehicleIcon(AMap),
            title: '当前位置',
            map: map,
          })
        } else if (vehicleMarkerRef.current) {
          // 如果已存在，平滑移动车辆
          const currentPos = vehicleMarkerRef.current.getPosition()
          const currentPosArray: [number, number] = [currentPos.getLng(), currentPos.getLat()]
          const newPos: [number, number] = [data.location.lng, data.location.lat]

          // 平滑移动车辆
          moveSmoothly(vehicleMarkerRef.current, currentPosArray, newPos, 2000)
        }
      }

      // 更新路径分段
      if (currentOrder.route && currentOrder.route.points) {
        const routePoints = currentOrder.route.points as number[][]
        
        // 使用 progress 计算当前索引，确保与后端同步
        const currentIndex = Math.floor((data.progress / 100) * routePoints.length)
        
        const passedPoints = routePoints.slice(0, currentIndex + 1)
        const remainingPoints = routePoints.slice(currentIndex)
        
        // 更新已走过的路径（至少需要2个点）
        if (passedPoints.length >= 2) {
          if (passedLineRef.current) {
            // 如果已存在，更新路径
            try {
              passedLineRef.current.setPath(passedPoints)
            } catch (error) {
              // 如果 setPath 失败，重新创建
              console.warn('setPath 失败，重新创建已走过路径:', error)
              passedLineRef.current.setMap(null)
              passedLineRef.current = createPolyline(map, AMap, passedPoints, {
                strokeColor: '#1890ff',
                strokeWeight: 4,
                strokeStyle: 'solid',
                zIndex: 10,
              })
            }
          } else if (map && AMap) {
            // 如果之前没有创建，现在创建
            passedLineRef.current = createPolyline(map, AMap, passedPoints, {
              strokeColor: '#1890ff',
              strokeWeight: 4,
              strokeStyle: 'solid',
              zIndex: 10,
            })
          }
        }
        
        // 更新未走过的路径（至少需要2个点）
        if (remainingPoints.length >= 2) {
          if (remainingLineRef.current) {
            // 如果已存在，更新路径
            try {
              remainingLineRef.current.setPath(remainingPoints)
            } catch (error) {
              // 如果 setPath 失败，重新创建
              console.warn('setPath 失败，重新创建未走过路径:', error)
              remainingLineRef.current.setMap(null)
              remainingLineRef.current = createPolyline(map, AMap, remainingPoints, {
                strokeColor: '#d9d9d9',
                strokeWeight: 3,
                strokeStyle: 'dashed',
                lineDash: [10, 5],
                zIndex: 9,
              })
            }
          } else if (map && AMap) {
            // 如果之前没有创建，现在创建
            remainingLineRef.current = createPolyline(map, AMap, remainingPoints, {
              strokeColor: '#d9d9d9',
              strokeWeight: 3,
              strokeStyle: 'dashed',
              lineDash: [10, 5],
              zIndex: 9,
            })
          }
        }
      }

      // 使用 ref 调用回调，避免依赖项问题
      onLocationUpdateRef.current?.(data)
    }

    // 监听状态更新
    const handleStatusUpdate = (data: { orderNo: string; status: string; message: string }) => {
      // 使用 ref 获取最新的 order，避免闭包问题
      const currentOrder = orderRef.current
      if (data.orderNo !== currentOrder.orderNo) return
      // 使用 ref 调用回调，避免依赖项问题
      onStatusUpdateRef.current?.(data.status)
    }

    websocketService.onLocationUpdate(handleLocationUpdate)
    websocketService.onStatusUpdate(handleStatusUpdate)

    return () => {
      websocketService.offLocationUpdate(handleLocationUpdate)
      websocketService.offStatusUpdate(handleStatusUpdate)
      if (subscribedOrderNoRef.current) {
        websocketService.unsubscribe(subscribedOrderNoRef.current)
        subscribedOrderNoRef.current = null
      }
    }
  }, [map, AMap, order.orderNo]) // 只依赖 map、AMap 和 orderNo，移除 order.route 和回调函数

  // 组件卸载时清理所有标记
  useEffect(() => {
    return () => {
      clearAllMarkers()
    }
  }, [clearAllMarkers])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapComponent
        id="tracking-map"
        onMapReady={handleMapReady}
        style={{ height: '100%' }}
      />
    </div>
  )
}

export default TrackingMap

