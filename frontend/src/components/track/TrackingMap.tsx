import { useEffect, useRef, useState, useCallback } from 'react'
import MapComponent from '@/components/map/MapComponent'
import { Order, LocationUpdateEvent, OrderStatus } from '@/types'
import { createOriginIcon, createDestinationIcon, createVehicleIcon, createPolyline, calculateVehicleAngle } from '@/utils/mapUtils'
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
  const [showTraffic, setShowTraffic] = useState(false)
  const originMarkerRef = useRef<any>(null)
  const destinationMarkerRef = useRef<any>(null)
  const vehicleMarkerRef = useRef<any>(null)
  const passedLineRef = useRef<any>(null)
  const remainingLineRef = useRef<any>(null)
  const trafficLayerRef = useRef<any>(null)
  const orderRef = useRef<Order>(order)
  const subscribedOrderNoRef = useRef<string | null>(null)
  const onLocationUpdateRef = useRef(onLocationUpdate)
  const onStatusUpdateRef = useRef(onStatusUpdate)
  const lastUpdateTimeRef = useRef<number | null>(null)

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
    if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null)
      trafficLayerRef.current = null
    }
  }, [])

  const initializedOrderNoRef = useRef<string | null>(null)

  const handleMapReady = useCallback((mapInstance: any, AMapInstance: any) => {
    setMap(mapInstance)
    setAMap(AMapInstance)

    // 先清理旧的标记，避免重复创建
    clearAllMarkers()

    const origin = order.origin as { lng: number; lat: number }
    const destination = order.destination as { lng: number; lat: number }
    const shouldFitView = initializedOrderNoRef.current !== order.orderNo
    initializedOrderNoRef.current = order.orderNo

    // 验证起点和终点数据
    const isValidCoordinate = (lng: any, lat: any): boolean => {
      return typeof lng === 'number' && typeof lat === 'number' &&
             !isNaN(lng) && !isNaN(lat) &&
             isFinite(lng) && isFinite(lat)
    }

    if (!origin || !isValidCoordinate(origin.lng, origin.lat)) {
      console.warn('订单起点数据无效，跳过起点标记创建', origin)
    } else {
      // 创建起点标记
      try {
        originMarkerRef.current = new AMapInstance.Marker({
          position: [origin.lng, origin.lat],
          icon: createOriginIcon(AMapInstance),
          title: '发货地址',
          map: mapInstance,
          anchor: 'center', // 设置锚点为中心，让图标中心在路径上
        })
      } catch (error) {
        console.error('创建起点标记失败:', error)
      }
    }

    if (!destination || !isValidCoordinate(destination.lng, destination.lat)) {
      console.warn('订单终点数据无效，跳过终点标记创建', destination)
    } else {
      // 创建终点标记
      try {
        destinationMarkerRef.current = new AMapInstance.Marker({
          position: [destination.lng, destination.lat],
          icon: createDestinationIcon(AMapInstance),
          title: '收货地址',
          map: mapInstance,
          anchor: 'center', // 设置锚点为中心，让图标中心在路径上
        })
      } catch (error) {
        console.error('创建终点标记失败:', error)
      }
    }

    // 创建交通路况图层（默认不显示）
    if (AMapInstance.TileLayer && AMapInstance.TileLayer.Traffic) {
      try {
        trafficLayerRef.current = new AMapInstance.TileLayer.Traffic({
          zIndex: 10,
          opacity: 0.7, // 透明度
          autoRefresh: true, // 自动刷新
          interval: 180, // 刷新间隔（秒），3分钟
        })
        // 默认不添加到地图，用户点击按钮后才显示
      } catch (error) {
        console.warn('创建交通路况图层失败:', error)
      }
    }

    // 如果有路径，绘制路径线
    if (order.route && order.route.points) {
      const routePoints = order.route.points as number[][]
      
      // 验证路径点的有效性
      const isValidPathPoint = (point: number[]): boolean => {
        return Array.isArray(point) && point.length >= 2 &&
               typeof point[0] === 'number' && typeof point[1] === 'number' &&
               !isNaN(point[0]) && !isNaN(point[1]) &&
               isFinite(point[0]) && isFinite(point[1])
      }
      
      // 过滤掉无效的路径点
      const validRoutePoints = routePoints.filter(isValidPathPoint)
      
      if (validRoutePoints.length < 2) {
        console.warn(`订单 ${order.orderNo} 的有效路径点数量不足（${validRoutePoints.length}/${routePoints.length}），跳过路径绘制`)
      } else {
        // 计算已走过的路径和未走过的路径
        let passedPoints: number[][] = []
        let remainingPoints: number[][] = validRoutePoints
        
        if (order.currentLocation && order.route.currentStep !== undefined) {
          const currentIndex = order.route.currentStep
          passedPoints = validRoutePoints.slice(0, currentIndex + 1)
          remainingPoints = validRoutePoints.slice(currentIndex)
        }
        
        // 已走过的路径（红色实线）- 至少需要2个点
        if (passedPoints.length >= 2) {
          passedLineRef.current = createPolyline(mapInstance, AMapInstance, passedPoints, {
            strokeColor: '#ff4d4f',
            strokeWeight: 4,
            strokeStyle: 'solid',
            zIndex: 10,
          })
        }
        
        // 未走过的路径（蓝色实线）- 至少需要2个点
        if (remainingPoints.length >= 2) {
          remainingLineRef.current = createPolyline(mapInstance, AMapInstance, remainingPoints, {
            strokeColor: '#1890ff',
            strokeWeight: 4,
            strokeStyle: 'solid',
            zIndex: 9,
          })
        }
      }
    }

    // 如果有路径和当前步骤，创建车辆标记（基于路径点而不是 currentLocation）
    if (order.route && order.route.points && order.route.currentStep !== undefined && order.status === OrderStatus.SHIPPING) {
      const routePoints = order.route.points as number[][]
      const validRoutePoints = routePoints.filter((point: number[]) => {
        return Array.isArray(point) && point.length >= 2 &&
               typeof point[0] === 'number' && typeof point[1] === 'number' &&
               !isNaN(point[0]) && !isNaN(point[1]) &&
               isFinite(point[0]) && isFinite(point[1])
      })
      
      if (validRoutePoints.length >= 2) {
        const currentStep = order.route.currentStep
        // 确保 currentStep 在有效范围内
        const validStep = Math.min(Math.max(0, currentStep), validRoutePoints.length - 1)
        const currentPoint = validRoutePoints[validStep]
        
        if (currentPoint && Array.isArray(currentPoint) && currentPoint.length >= 2) {
          const currentLng = currentPoint[0]
          const currentLat = currentPoint[1]
          
          if (isValidCoordinate(currentLng, currentLat)) {
            try {
              // 计算箭头角度（基于 currentStep）
              let angle = 0
              const progress = validStep >= validRoutePoints.length - 1
                ? 100
                : (validStep / (validRoutePoints.length - 1)) * 100
              const calculatedAngle = calculateVehicleAngle(
                validRoutePoints,
                progress
              )
              if (calculatedAngle !== null) {
                angle = calculatedAngle
              }
              
              vehicleMarkerRef.current = new AMapInstance.Marker({
                position: [currentLng, currentLat],
                icon: createVehicleIcon(AMapInstance, angle),
                title: '当前位置',
                map: mapInstance,
                anchor: 'center', // 设置锚点为中心，让图标中心在路径上
              })
            } catch (error) {
              console.error('创建车辆标记失败:', error)
            }
          } else {
            console.warn('路径点坐标无效，跳过车辆标记创建', currentPoint)
          }
        }
      }
    }

    // 调整视野以包含起点和终点
    // setFitView 需要传入覆盖物对象数组，而不是坐标数组
    const overlays: any[] = []
    if (originMarkerRef.current) {
      overlays.push(originMarkerRef.current)
    }
    if (destinationMarkerRef.current) {
      overlays.push(destinationMarkerRef.current)
    }
    
    // 如果有路径线，也加入视野调整
    if (passedLineRef.current) {
      overlays.push(passedLineRef.current)
    }
    if (remainingLineRef.current) {
      overlays.push(remainingLineRef.current)
    }
    
    // 如果有车辆标记，也加入视野调整
    if (vehicleMarkerRef.current) {
      overlays.push(vehicleMarkerRef.current)
    }
    
    // 只在首次加载或订单号变化时调整视野，状态刷新时不重新缩放
    if (shouldFitView) {
      try {
        if (overlays.length > 0) {
          mapInstance.setFitView(overlays, false, [20, 20, 20, 20])
        }
      } catch (error) {
        // setFitView 不可用时直接抛出错误
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`订单追踪地图视野调整失败: ${errorMessage}`)
      }
    }
  }, [order.orderNo, clearAllMarkers]) // 只在订单号变化时重新初始化地图和缩放

  // 切换交通路况图层显示
  const toggleTraffic = useCallback(() => {
    if (!trafficLayerRef.current || !map) return

    if (showTraffic) {
      // 隐藏交通图层：从地图移除
      trafficLayerRef.current.setMap(null)
      setShowTraffic(false)
    } else {
      // 显示交通图层：添加到地图
      trafficLayerRef.current.setMap(map)
      setShowTraffic(true)
    }
  }, [showTraffic, map])

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
    // 重置上次更新时间，避免不同订单之间的时间差影响
    lastUpdateTimeRef.current = null

    // 监听位置更新
    const handleLocationUpdate = (data: LocationUpdateEvent) => {
      // 使用 ref 获取最新的 order，避免闭包问题
      const currentOrder = orderRef.current
      if (data.orderNo !== currentOrder.orderNo) return

      // 计算动态动画时间：min(1000ms, 更新时间 - 上次更新时间)
      const currentTime = Date.now()
      let animationDuration = 2000 // 默认值
      if (lastUpdateTimeRef.current !== null) {
        const timeDiff = currentTime - lastUpdateTimeRef.current
        // 确保动画时间在合理范围内：最小50ms，最大1000ms
        animationDuration = Math.max(50, Math.min(1000, timeDiff))
      }
      lastUpdateTimeRef.current = currentTime

      // 基于路径点和 progress 计算箭头位置和角度
      if (currentOrder.route && currentOrder.route.points) {
        const routePoints = currentOrder.route.points as number[][]
        const isValidPathPoint = (point: number[]): boolean => {
          return Array.isArray(point) && point.length >= 2 &&
                 typeof point[0] === 'number' && typeof point[1] === 'number' &&
                 !isNaN(point[0]) && !isNaN(point[1]) &&
                 isFinite(point[0]) && isFinite(point[1])
        }
        const validRoutePoints = routePoints.filter(isValidPathPoint)
        
        if (validRoutePoints.length >= 2) {
          // 验证坐标有效性
          const isValidCoordinate = (lng: any, lat: any): boolean => {
            return typeof lng === 'number' && typeof lat === 'number' &&
                   !isNaN(lng) && !isNaN(lat) &&
                   isFinite(lng) && isFinite(lat)
          }
          
          // 直接使用 currentStep，如果 WebSocket 消息中有则使用，否则使用订单中的 currentStep
          // 对于多点配送组，progress 是基于时间计算的，不能用来反推 currentStep
          const currentStep = data.currentStep !== undefined 
            ? data.currentStep 
            : (currentOrder.route?.currentStep ?? 0)
          const validIndex = Math.min(Math.max(0, currentStep), validRoutePoints.length - 1)
          const currentPoint = validRoutePoints[validIndex]
          
          if (currentPoint && Array.isArray(currentPoint) && currentPoint.length >= 2) {
            const newLng = currentPoint[0]
            const newLat = currentPoint[1]
            
            if (!isValidCoordinate(newLng, newLat)) {
              console.warn('路径点坐标无效，跳过更新', currentPoint)
              return
            }
            
            // 计算箭头角度（基于 currentStep）
            let angle = 0
            const progress = validIndex >= validRoutePoints.length - 1
              ? 100
              : (validIndex / (validRoutePoints.length - 1)) * 100
            const calculatedAngle = calculateVehicleAngle(
              validRoutePoints,
              progress
            )
            if (calculatedAngle !== null) {
              angle = calculatedAngle
            }
            
            // 如果车辆标记不存在，创建它
            if (!vehicleMarkerRef.current && map && AMap) {
              try {
                vehicleMarkerRef.current = new AMap.Marker({
                  position: [newLng, newLat],
                  icon: createVehicleIcon(AMap, angle),
                  title: '当前位置',
                  map: map,
                  anchor: 'center', // 设置锚点为中心，让图标中心在路径上
                })
              } catch (error) {
                console.error('创建车辆标记失败:', error)
              }
            } else if (vehicleMarkerRef.current) {
              // 如果已存在，更新位置和角度
              try {
                const currentPos = vehicleMarkerRef.current.getPosition()
                const currentLng = currentPos.getLng()
                const currentLat = currentPos.getLat()
                
                // 验证当前位置的有效性
                if (!isValidCoordinate(currentLng, currentLat)) {
                  // 如果当前位置无效，直接设置新位置和角度
                  vehicleMarkerRef.current.setPosition([newLng, newLat])
                  vehicleMarkerRef.current.setIcon(createVehicleIcon(AMap, angle))
                } else {
                  const currentPosArray: [number, number] = [currentLng, currentLat]
                  const newPos: [number, number] = [newLng, newLat]

                  // 平滑移动车辆（包括角度更新），使用动态计算的动画时间
                  moveSmoothly(
                    vehicleMarkerRef.current,
                    currentPosArray,
                    newPos,
                    animationDuration,
                    angle,
                    AMap
                  )
                }
              } catch (error) {
                console.error('更新车辆位置失败:', error)
                // 如果更新失败，尝试直接设置位置和角度
                try {
                  vehicleMarkerRef.current.setPosition([newLng, newLat])
                  vehicleMarkerRef.current.setIcon(createVehicleIcon(AMap, angle))
                } catch (setError) {
                  console.error('直接设置车辆位置也失败:', setError)
                }
              }
            }
          }
        }
      }

      // 更新路径分段
      if (currentOrder.route && currentOrder.route.points) {
        const routePoints = currentOrder.route.points as number[][]
        
        // 验证路径点的有效性
        const isValidPathPoint = (point: number[]): boolean => {
          return Array.isArray(point) && point.length >= 2 &&
                 typeof point[0] === 'number' && typeof point[1] === 'number' &&
                 !isNaN(point[0]) && !isNaN(point[1]) &&
                 isFinite(point[0]) && isFinite(point[1])
        }
        
        // 过滤掉无效的路径点
        const validRoutePoints = routePoints.filter(isValidPathPoint)
        
        if (validRoutePoints.length < 2) {
          console.warn('有效路径点数量不足，跳过路径更新')
          return
        }
        
        // 直接使用 currentStep，如果 WebSocket 消息中有则使用，否则使用订单中的 currentStep
        // 对于多点配送组，progress 是基于时间计算的，不能用来反推 currentStep
        const currentStep = data.currentStep !== undefined 
          ? data.currentStep 
          : (currentOrder.route?.currentStep ?? 0)
        // 确保索引在有效范围内
        const validIndex = Math.min(Math.max(0, currentStep), validRoutePoints.length - 1)
        
        const passedPoints = validRoutePoints.slice(0, validIndex + 1)
        const remainingPoints = validRoutePoints.slice(validIndex)
        
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
                strokeColor: '#ff4d4f',
                strokeWeight: 4,
                strokeStyle: 'solid',
                zIndex: 10,
              })
            }
          } else if (map && AMap) {
            // 如果之前没有创建，现在创建
            passedLineRef.current = createPolyline(map, AMap, passedPoints, {
              strokeColor: '#ff4d4f',
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
                strokeColor: '#1890ff',
                strokeWeight: 4,
                strokeStyle: 'solid',
                zIndex: 9,
              })
            }
          } else if (map && AMap) {
            // 如果之前没有创建，现在创建
            remainingLineRef.current = createPolyline(map, AMap, remainingPoints, {
              strokeColor: '#1890ff',
              strokeWeight: 4,
              strokeStyle: 'solid',
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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapComponent
        id="tracking-map"
        onMapReady={handleMapReady}
        style={{ height: '100%' }}
      />
      
      {/* 交通路况控制按钮 */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        background: '#fff',
        padding: '8px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <button
          onClick={toggleTraffic}
          style={{
            padding: '6px 12px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            background: showTraffic ? '#1890ff' : '#fff',
            color: showTraffic ? '#fff' : '#333',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            if (!showTraffic) {
              e.currentTarget.style.background = '#f5f5f5'
            }
          }}
          onMouseLeave={(e) => {
            if (!showTraffic) {
              e.currentTarget.style.background = '#fff'
            }
          }}
        >
          {showTraffic ? '隐藏路况' : '显示路况'}
        </button>
      </div>
    </div>
  )
}

export default TrackingMap

