import { useEffect, useRef, useState } from 'react'
import { Form, Input, Select, Button, Space, message } from 'antd'
import MapComponent from '@/components/map/MapComponent'
import { DeliveryZone, LogisticsCompany } from '@/types'
import { logisticsService } from '@/services/logisticsService'

interface ZoneEditorProps {
  zone?: DeliveryZone
  onSave: (data: {
    name: string
    boundary: {
      type: 'Polygon'
      coordinates: number[][][]
    }
    logistics: string
  }) => Promise<void>
  onCancel: () => void
}

const ZoneEditor = ({ zone, onSave, onCancel }: ZoneEditorProps) => {
  const [form] = Form.useForm()
  const mapRef = useRef<any>(null)
  const AMapRef = useRef<any>(null)
  const polygonRef = useRef<any>(null)
  const editorRef = useRef<any>(null)
  const clickHandlerRef = useRef<any>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [logisticsCompanies, setLogisticsCompanies] = useState<LogisticsCompany[]>([])

  useEffect(() => {
    const loadLogisticsCompanies = async () => {
      try {
        const data = await logisticsService.getLogisticsCompanies()
        if (!Array.isArray(data)) {
          throw new Error(`物流公司数据格式错误: 期望数组，实际得到 ${typeof data}`)
        }
        setLogisticsCompanies(data)
      } catch (error) {
        message.error(`加载物流公司失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    loadLogisticsCompanies()
  }, [])

  useEffect(() => {
    if (zone) {
      form.setFieldsValue({
        name: zone.name,
        logistics: zone.logistics || '顺丰速运',
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        logistics: '顺丰速运', // 设置默认值
      })
    }
  }, [zone, form])

  // 清理函数
  const cleanup = () => {
    // 移除地图点击事件监听
    if (mapRef.current && clickHandlerRef.current) {
      mapRef.current.off('click', clickHandlerRef.current)
      clickHandlerRef.current = null
    }

    // 关闭编辑器
    if (editorRef.current) {
      try {
        editorRef.current.close()
      } catch (e) {
        // 忽略关闭错误
      }
      editorRef.current = null
    }

    // 移除多边形
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }

    // 清除地图上的所有覆盖物
    if (mapRef.current) {
      mapRef.current.clearMap()
    }

    setIsDrawing(false)
  }

  // 聚焦到多边形
  const focusOnPolygon = (polygon: any) => {
    if (!mapRef.current || !polygon) return

    const path = polygon.getPath()
    if (!path || path.length === 0) return

    // 处理路径点：可能是 LngLat 对象或数组
    const points: [number, number][] = path.map((point: any) => {
      if (point && typeof point.getLng === 'function') {
        return [point.getLng(), point.getLat()]
      } else if (Array.isArray(point) && point.length === 2) {
        return point as [number, number]
      } else {
        return null
      }
    }).filter((p: any) => p !== null) as [number, number][]

    if (points.length === 0) return

    try {
      // 使用 setFitView 自动调整视野
      mapRef.current.setFitView([polygon], false, [50, 50, 50, 50])
    } catch (error) {
      // 如果 setFitView 失败，使用备用方案：计算边界
      if (points.length === 1) {
        // 只有一个点，设置合适的缩放级别
        mapRef.current.setCenter(points[0])
        mapRef.current.setZoom(14)
      } else {
        const lngs = points.map(p => p[0])
        const lats = points.map(p => p[1])
        const minLng = Math.min(...lngs)
        const maxLng = Math.max(...lngs)
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)

        const centerLng = (minLng + maxLng) / 2
        const centerLat = (minLat + maxLat) / 2
        const lngDiff = maxLng - minLng
        const latDiff = maxLat - minLat
        const maxDiff = Math.max(lngDiff, latDiff)

        mapRef.current.setCenter([centerLng, centerLat])
        
        // 根据范围设置合适的缩放级别
        let zoom: number
        if (maxDiff < 0.01) { // < 1公里
          zoom = 14
        } else if (maxDiff < 0.05) { // < 5公里
          zoom = 13
        } else if (maxDiff < 0.1) { // < 10公里
          zoom = 12
        } else if (maxDiff < 0.5) { // < 50公里
          zoom = 11
        } else if (maxDiff < 1) { // < 100公里
          zoom = 10
        } else if (maxDiff < 2) { // < 200公里
          zoom = 9
        } else if (maxDiff < 5) { // < 500公里
          zoom = 8
        } else if (maxDiff < 10) { // < 1000公里
          zoom = 7
        } else if (maxDiff < 20) { // < 2000公里
          zoom = 6
        } else if (maxDiff < 50) { // < 5000公里
          zoom = 5
        } else if (maxDiff < 100) { // < 10000公里
          zoom = 4
        } else if (maxDiff < 200) { // < 20000公里
          zoom = 3
        } else if (maxDiff < 500) { // < 50000公里
          zoom = 2
        } else { // >= 50000公里
          zoom = 1
        }
        zoom = Math.max(1, Math.min(18, zoom))
        mapRef.current.setZoom(zoom)
      }
    }
  }

  // 初始化或更新多边形
  const initializePolygon = (map: any, AMap: any) => {
    // 如果正在绘制，不清理（避免中断用户操作）
    if (isDrawing) {
      return
    }

    // 先清理之前的覆盖物
    // 移除地图点击事件监听
    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current)
      clickHandlerRef.current = null
    }

    // 关闭编辑器
    if (editorRef.current) {
      try {
        editorRef.current.close()
      } catch (e) {
        // 忽略关闭错误
      }
      editorRef.current = null
    }

    // 移除多边形
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }

    // 清除地图上的所有覆盖物
    map.clearMap()

    setIsDrawing(false)

    // 只有编辑已有区域时才创建多边形和编辑器
    if (zone) {
      AMap.plugin('AMap.PolygonEditor', () => {
        // 编辑已有区域
        const path = zone.boundary.coordinates[0].map((coord) => [coord[0], coord[1]])
        // 移除最后一个点（如果是闭合的）
        if (path.length > 0 && path[0][0] === path[path.length - 1][0] && path[0][1] === path[path.length - 1][1]) {
          path.pop()
        }

        polygonRef.current = new AMap.Polygon({
          path,
          strokeColor: '#1890ff',
          fillColor: '#1890ff',
          fillOpacity: 0.3,
          map,
        })

        editorRef.current = new AMap.PolygonEditor(map, polygonRef.current)
        
        // 聚焦到多边形
        setTimeout(() => {
          focusOnPolygon(polygonRef.current)
        }, 100)
      })
    }
    // 新建区域：不在初始化时创建多边形，等用户点击"开始绘制"时再创建
  }

  const handleMapReady = (map: any, AMap: any) => {
    mapRef.current = map
    AMapRef.current = AMap
    initializePolygon(map, AMap)
  }

  // 当 zone 变化时，重新初始化多边形
  useEffect(() => {
    if (mapRef.current && AMapRef.current && !isDrawing) {
      initializePolygon(mapRef.current, AMapRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const startDraw = () => {
    if (!mapRef.current || !AMapRef.current) {
      message.warning('地图未加载完成')
      return
    }

    if (zone) {
      // 编辑已有区域：使用 PolygonEditor
      if (editorRef.current && polygonRef.current) {
        editorRef.current.open()
        setIsDrawing(true)
        message.info('可以拖拽顶点调整位置，右键删除顶点')
      }
    } else {
      // 新建区域：使用地图点击事件添加顶点
      // 先移除之前的点击监听（如果存在）
      if (clickHandlerRef.current) {
        mapRef.current.off('click', clickHandlerRef.current)
        clickHandlerRef.current = null
      }

      // 监听地图点击事件
      const clickHandler = (e: any) => {
        const { lng, lat } = e.lnglat
        
        // 如果多边形不存在，在第一次点击时创建
        if (!polygonRef.current) {
          polygonRef.current = new AMapRef.current.Polygon({
            path: [[lng, lat]], // 第一个点
            strokeColor: '#1890ff',
            fillColor: '#1890ff',
            fillOpacity: 0.3,
            map: mapRef.current,
            zIndex: 10,
          })
        } else {
          // 获取当前路径（getPath 返回 LngLat 对象数组）
          const currentPath = polygonRef.current.getPath() || []
          
          // 将 LngLat 对象转换为 [lng, lat] 数组格式
          const pathArray: [number, number][] = currentPath.map((point: any) => {
            if (point && typeof point.getLng === 'function') {
              // LngLat 对象
              return [point.getLng(), point.getLat()]
            } else if (Array.isArray(point) && point.length === 2) {
              // 已经是数组格式
              return point as [number, number]
            } else {
              return null
            }
          }).filter((p: any) => p !== null) as [number, number][]
          
          // 添加新顶点
          pathArray.push([lng, lat])
          
          // 更新多边形路径（setPath 接受 [lng, lat] 数组格式）
          polygonRef.current.setPath(pathArray)
        }
      }

      clickHandlerRef.current = clickHandler
      mapRef.current.on('click', clickHandler)
      setIsDrawing(true)
      message.info('请在地图上点击添加顶点，至少需要3个顶点')
    }
  }

  const finishDraw = () => {
    if (zone) {
      // 编辑已有区域：关闭编辑器
      if (editorRef.current) {
        editorRef.current.close()
      }
    } else {
      // 新建区域：移除点击监听
      if (mapRef.current && clickHandlerRef.current) {
        mapRef.current.off('click', clickHandlerRef.current)
        clickHandlerRef.current = null
      }
    }
    setIsDrawing(false)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    
    if (!polygonRef.current) {
      message.warning('请先绘制配送区域')
      return
    }

    const path = polygonRef.current.getPath()
    if (!path || path.length < 3) {
      message.warning('多边形至少需要3个顶点')
      return
    }

    // 处理路径点：getPath 返回 LngLat 对象数组，需要转换为 [lng, lat] 数组
    const coords: [number, number][] = path.map((point: any) => {
      if (point && typeof point.getLng === 'function') {
        // LngLat 对象
        return [point.getLng(), point.getLat()]
      } else if (Array.isArray(point) && point.length === 2) {
        // 已经是数组格式
        return point as [number, number]
      } else {
        throw new Error(`无效的路径点格式: ${JSON.stringify(point)}`)
      }
    })
    
    // 验证坐标有效性
    for (const coord of coords) {
      if (typeof coord[0] !== 'number' || typeof coord[1] !== 'number' ||
          isNaN(coord[0]) || isNaN(coord[1]) ||
          !isFinite(coord[0]) || !isFinite(coord[1])) {
        message.error('多边形包含无效坐标，请重新绘制')
        return
      }
    }
    
    // 闭合多边形（确保首尾坐标相同）
    if (coords.length > 0 && 
        (coords[0][0] !== coords[coords.length - 1][0] ||
         coords[0][1] !== coords[coords.length - 1][1])) {
      coords.push([coords[0][0], coords[0][1]])
    }

    await onSave({
      name: values.name,
      boundary: {
        type: 'Polygon',
        coordinates: [coords],
      },
      logistics: values.logistics,
    })
  }

  return (
    <div>
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="区域名称"
          rules={[{ required: true, message: '请输入区域名称' }]}
        >
          <Input placeholder="请输入区域名称" />
        </Form.Item>

        <Form.Item
          name="logistics"
          label="物流公司"
          rules={[{ required: true, message: '请选择物流公司' }]}
        >
          <Select placeholder="请选择物流公司" style={{ width: '100%' }}>
            {logisticsCompanies.map((company) => (
              <Select.Option key={company.id} value={company.name}>
                {company.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button onClick={startDraw} disabled={isDrawing}>
              开始绘制
            </Button>
            <Button onClick={finishDraw} disabled={!isDrawing}>
              完成绘制
            </Button>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <div style={{ height: '500px', marginTop: 16 }}>
        <MapComponent
          id="zone-editor-map"
          onMapReady={handleMapReady}
        />
      </div>
    </div>
  )
}

export default ZoneEditor

