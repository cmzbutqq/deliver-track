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

    // 准备热力图数据：使用所有传入的订单（已根据状态筛选）
    // 过滤掉没有有效目的地的订单
    const validOrders = orders.filter((order) => {
      const dest = order.destination as { lng: number; lat: number }
      return dest && typeof dest.lng === 'number' && typeof dest.lat === 'number'
    })

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

    // 计算统计数据，用于调整 max 值
    const counts = heatmapData.map((d) => d.count)
    const maxCount = Math.max(...counts)
    
    // 调整 max 值：使用最大值和平均值的组合，让单个订单不会直接变红
    // 如果最大值很大，使用最大值；如果最大值较小，使用更大的倍数
    const adjustedMax = maxCount > 3 
      ? maxCount * 2
      : maxCount * 3

    // 创建热力图实例（注意：2.0 API 使用 AMap.HeatMap，不是 AMap.Heatmap）
    heatmapRef.current = new AMap.HeatMap(map, {
      radius: 60, // 增大半径，让热力图更平滑、更美观
      opacity: [0, 0.8], // 热力图的透明度范围
      gradient: {
        // 热力图的颜色渐变，调整阈值让红色更难达到
        0.0: 'rgba(0, 0, 255, 0)',      // 蓝色，完全透明
        0.3: 'rgba(0, 255, 0, 0.4)',    // 绿色，低密度
        0.6: 'rgba(255, 255, 0, 0.7)',  // 黄色，中等密度
        0.85: 'rgba(255, 165, 0, 0.85)', // 橙色，较高密度
        1.0: 'rgba(255, 0, 0, 1)',      // 红色，最高密度
      },
    })

    // 设置热力图数据集
    heatmapRef.current.setDataSet({
      data: heatmapData,
      max: adjustedMax,
    })

    // 调整地图视野以包含所有数据点
    if (heatmapData.length > 0) {
      try {
        // 为热力图数据点创建边界多边形，用于 setFitView
        const lngs = heatmapData.map((d) => d.lng)
        const lats = heatmapData.map((d) => d.lat)
        const minLng = Math.min(...lngs)
        const maxLng = Math.max(...lngs)
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)

        // 创建边界矩形多边形作为覆盖物
        const boundsPolygon = new AMap.Polygon({
          path: [
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
          ],
          strokeColor: 'transparent',
          fillColor: 'transparent',
          fillOpacity: 0,
          strokeOpacity: 0,
          map: null, // 不显示在地图上，仅用于 setFitView
        })

        // 使用 setFitView 自动调整视野
        map.setFitView([boundsPolygon], false, [50, 50, 50, 50])
        
        // 清理临时多边形
        boundsPolygon.setMap(null)
      } catch (error) {
        // setFitView 不可用时直接抛出错误
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`热力图视野调整失败: ${errorMessage}`)
      }
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
