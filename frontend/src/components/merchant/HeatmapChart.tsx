import { useEffect, useRef, useState } from 'react'
import { Card, Alert } from 'antd'
import { Order, OrderStatus } from '@/types'
import MapComponent from '@/components/map/MapComponent'

interface HeatmapChartProps {
  orders: Order[]
}

const HeatmapChart = ({ orders }: HeatmapChartProps) => {
  const mapRef = useRef<any>(null)
  const AMapRef = useRef<any>(null)
  const heatmapRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleMapReady = (map: any, AMap: any) => {
    mapRef.current = map
    AMapRef.current = AMap

    // 加载热力图插件（注意：2.0 API 使用 AMap.HeatMap，不是 AMap.Heatmap）
    AMap.plugin('AMap.HeatMap', () => {
      updateHeatmap(map, AMap)
    })
  }

  const updateHeatmap = (map: any, AMap: any) => {
    if (!map || !AMap) return

    // 清除之前的热力图
    if (heatmapRef.current) {
      // 高德地图 2.0 API 中，热力图使用 hide() 方法隐藏，或直接销毁
      if (typeof heatmapRef.current.hide === 'function') {
        heatmapRef.current.hide()
      }
      heatmapRef.current = null
    }

    // 准备热力图数据：包含待发货、运输中、已送达，排除已取消
    const validOrders = orders.filter((order) => order.status !== OrderStatus.CANCELLED)

    if (validOrders.length === 0) {
      setError('暂无订单数据')
      return
    }

    setError(null)

    // 准备热力图数据点
    const heatmapData: Array<{ lng: number; lat: number; count: number }> = []

    // 聚合相同位置的订单
    const locationMap = new Map<string, number>()
    for (const order of validOrders) {
      const dest = order.destination as { lng: number; lat: number }
      if (!dest || typeof dest.lng !== 'number' || typeof dest.lat !== 'number') {
        continue
      }

      // 将坐标四舍五入到小数点后3位，用于聚合（约100米精度）
      const key = `${Math.round(dest.lng * 1000) / 1000},${Math.round(dest.lat * 1000) / 1000}`
      locationMap.set(key, (locationMap.get(key) || 0) + 1)
    }

    // 转换为热力图数据格式
    for (const [key, count] of locationMap.entries()) {
      const [lng, lat] = key.split(',').map(Number)
      heatmapData.push({ lng, lat, count })
    }

    if (heatmapData.length === 0) {
      setError('无法生成热力图数据')
      return
    }

    // 创建热力图实例（注意：2.0 API 使用 AMap.HeatMap，不是 AMap.Heatmap）
    heatmapRef.current = new AMap.HeatMap(map, {
      radius: 25, // 热力图的半径（像素）
      opacity: [0, 0.8], // 热力图的透明度范围
      gradient: {
        // 热力图的颜色渐变
        0.2: 'rgba(0, 0, 255, 0)',
        0.5: 'rgba(0, 255, 0, 1)',
        0.8: 'rgba(255, 255, 0, 1)',
        1.0: 'rgba(255, 0, 0, 1)',
      },
    })

    // 设置热力图数据集
    heatmapRef.current.setDataSet({
      data: heatmapData,
      max: Math.max(...heatmapData.map((d) => d.count)),
    })

    // 调整地图视野以包含所有数据点
    if (heatmapData.length > 0) {
      const lngs = heatmapData.map((d) => d.lng)
      const lats = heatmapData.map((d) => d.lat)
      const minLng = Math.min(...lngs)
      const maxLng = Math.max(...lngs)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)

      const centerLng = (minLng + maxLng) / 2
      const centerLat = (minLat + maxLat) / 2
      const lngDiff = maxLng - minLng
      const latDiff = maxLat - minLat
      const maxDiff = Math.max(lngDiff, latDiff)

      // 设置地图中心点
      map.setCenter([centerLng, centerLat])
      
      // 改进的缩放级别计算：确保不会放得太大，能显示整张图
      // 添加边距系数，确保数据点不会贴边显示
      const paddingFactor = 1.2 // 20% 的边距
      const adjustedMaxDiff = maxDiff * paddingFactor
      
      let zoom: number
      if (adjustedMaxDiff < 0.001) {
        // 范围极小（< 100米），使用适中的缩放级别，不要放太大
        zoom = 12
      } else if (adjustedMaxDiff < 0.01) {
        // 范围很小（< 1公里），使用适中的缩放级别
        zoom = 11
      } else if (adjustedMaxDiff < 0.05) {
        zoom = 10
      } else if (adjustedMaxDiff < 0.1) {
        zoom = 9
      } else if (adjustedMaxDiff < 0.5) {
        zoom = 8
      } else if (adjustedMaxDiff < 1) {
        zoom = 7
      } else if (adjustedMaxDiff < 2) {
        zoom = 6
      } else if (adjustedMaxDiff < 5) {
        zoom = 5
      } else if (adjustedMaxDiff < 10) {
        zoom = 4
      } else if (adjustedMaxDiff < 20) {
        zoom = 3
      } else if (adjustedMaxDiff < 50) {
        zoom = 2
      } else {
        // 范围极大（跨洲或全球），使用最小缩放级别
        zoom = 1
      }
      
      // 确保缩放级别在合理范围内（1-12），支持更大范围的显示
      zoom = Math.max(1, Math.min(12, zoom))
      map.setZoom(zoom)
    }
  }

  // 当订单数据变化时，更新热力图
  useEffect(() => {
    if (mapRef.current && AMapRef.current && orders.length > 0) {
      AMapRef.current.plugin('AMap.HeatMap', () => {
        updateHeatmap(mapRef.current, AMapRef.current)
      })
    }
  }, [orders])

  return (
    <Card title="订单目的地分布热力图">
      {error && (
        <Alert
          message={error}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <div style={{ width: '100%', height: '500px' }}>
        <MapComponent
          id="heatmap-chart-map"
          plugins={['AMap.HeatMap']}
          onMapReady={handleMapReady}
        />
      </div>
    </Card>
  )
}

export default HeatmapChart
