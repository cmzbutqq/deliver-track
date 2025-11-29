import { useEffect, useRef, useState } from 'react'
import { Card, Alert } from 'antd'
import { Order } from '@/types'
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

    // 准备热力图数据
    const deliveredOrders = orders.filter((order) => order.status === 'DELIVERED')

    if (deliveredOrders.length === 0) {
      setError('暂无已完成订单数据')
      return
    }

    setError(null)

    // 准备热力图数据点
    const heatmapData: Array<{ lng: number; lat: number; count: number }> = []

    // 聚合相同位置的订单
    const locationMap = new Map<string, number>()
    for (const order of deliveredOrders) {
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

      map.setCenter([centerLng, centerLat])

      // 根据范围设置合适的缩放级别
      const zoom = Math.max(8, Math.min(18,
        maxDiff < 0.01 ? 14 :
        maxDiff < 0.05 ? 13 :
        maxDiff < 0.1 ? 12 :
        maxDiff < 0.5 ? 11 :
        maxDiff < 1 ? 10 :
        maxDiff < 2 ? 9 : 8
      ))

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
