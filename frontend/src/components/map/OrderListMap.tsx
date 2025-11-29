import { useEffect, useRef, useCallback } from 'react'
import MapComponent from './MapComponent'
import { Order } from '@/types'
import { createStatusIcon, createPolyline } from '@/utils/mapUtils'

interface OrderListMapProps {
  selectedOrders: Order[]
}

const OrderListMap = ({ selectedOrders }: OrderListMapProps) => {
  const markersRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])
  const mapRef = useRef<any>(null)
  const AMapRef = useRef<any>(null)

  const updateMapMarkers = useCallback(() => {
    if (!mapRef.current || !AMapRef.current) return

    // 清除之前的标记和路径
    markersRef.current.forEach((marker) => marker.setMap(null))
    polylinesRef.current.forEach((polyline) => polyline.setMap(null))
    markersRef.current = []
    polylinesRef.current = []

    if (selectedOrders.length === 0) {
      // 没有选中订单时，重置到默认视野（北京）
      mapRef.current.setCenter([116.397428, 39.90923])
      mapRef.current.setZoom(10)
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
      })

      markersRef.current.push(marker)

      // 如果是运输中订单，显示路径和当前位置
      if (order.status === 'SHIPPING' && order.route) {
        const routePoints = order.route.points as number[][]
        
        // 创建路径线
        const polyline = createPolyline(mapRef.current, AMapRef.current, routePoints, {
          strokeColor: '#1890ff',
          strokeWeight: 3,
        })
        polylinesRef.current.push(polyline)

        // 显示当前位置
        if (order.currentLocation) {
          const currentLng = order.currentLocation.lng
          const currentLat = order.currentLocation.lat
          
          // 验证当前位置坐标有效性，无效则跳过
          if (typeof currentLng !== 'number' || typeof currentLat !== 'number') {
            console.warn(`订单 ${order.orderNo} 的当前位置坐标格式错误: lng=${currentLng} (${typeof currentLng}), lat=${currentLat} (${typeof currentLat})，跳过`)
            return
          }
          
          if (isNaN(currentLng) || isNaN(currentLat) || !isFinite(currentLng) || !isFinite(currentLat)) {
            console.warn(`订单 ${order.orderNo} 的当前位置坐标无效: lng=${currentLng}, lat=${currentLat}，跳过`)
            return
          }
          
          // 验证坐标范围（中国大致范围：经度 73-135，纬度 18-54）
          if (currentLng < 73 || currentLng > 135 || currentLat < 18 || currentLat > 54) {
            console.warn(`订单 ${order.orderNo} 的当前位置坐标超出中国范围: lng=${currentLng}, lat=${currentLat}，跳过`)
            return
          }
          
          const currentPos: [number, number] = [currentLng, currentLat]
          positions.push(currentPos)
          const currentMarker = new AMapRef.current.Marker({
            position: currentPos,
            icon: new AMapRef.current.Icon({
              image: 'https://webapi.amap.com/images/car.png',
              size: new AMapRef.current.Size(32, 32),
            }),
            map: mapRef.current,
          })
          markersRef.current.push(currentMarker)
        }
      }

      // 点击标记显示订单信息
      marker.on('click', () => {
        console.log('点击订单:', order.orderNo)
      })
    })

    // 调整视野以包含所有标记
    if (positions.length > 0) {
      if (positions.length === 1) {
        // 只有一个点，设置合适的缩放级别（12 级，显示街道级别）
        mapRef.current.setCenter(positions[0])
        mapRef.current.setZoom(12)
      } else {
        // 多个点，使用备用方案：计算中心点和范围（更可靠，避免 setFitView 的问题）
        // 去重，避免重复点导致问题
        const seen = new Set<string>()
        const uniquePositions = positions.filter(pos => {
          const key = `${pos[0]},${pos[1]}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        
        // 如果去重后只有一个点，使用单个点的逻辑
        if (uniquePositions.length === 1) {
          mapRef.current.setCenter(uniquePositions[0])
          mapRef.current.setZoom(12)
          return
        }
        
        // 计算所有点的最小/最大经纬度
        const minLng = Math.min(...uniquePositions.map(pos => pos[0]))
        const maxLng = Math.max(...uniquePositions.map(pos => pos[0]))
        const minLat = Math.min(...uniquePositions.map(pos => pos[1]))
        const maxLat = Math.max(...uniquePositions.map(pos => pos[1]))
        
        // 计算中心点
        const centerLng = (minLng + maxLng) / 2
        const centerLat = (minLat + maxLat) / 2
        const lngDiff = maxLng - minLng
        const latDiff = maxLat - minLat
        
        // 验证计算结果
        if (isNaN(centerLng) || isNaN(centerLat) || !isFinite(centerLng) || !isFinite(centerLat)) {
          console.error(`中心点计算失败: center=[${centerLng}, ${centerLat}]. 原始位置: ${JSON.stringify(uniquePositions)}`)
          // 使用第一个有效点作为中心
          mapRef.current.setCenter(uniquePositions[0])
          mapRef.current.setZoom(12)
          return
        }
        
        mapRef.current.setCenter([centerLng, centerLat])
        
        // 根据范围大小设置合适的缩放级别
        const maxDiff = Math.max(lngDiff, latDiff)
        const zoom = Math.max(8, Math.min(18, 
          maxDiff < 0.01 ? 14 :
          maxDiff < 0.05 ? 13 :
          maxDiff < 0.1 ? 12 :
          maxDiff < 0.5 ? 11 :
          maxDiff < 1 ? 10 :
          maxDiff < 2 ? 9 : 8
        ))
        
        mapRef.current.setZoom(zoom)
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

