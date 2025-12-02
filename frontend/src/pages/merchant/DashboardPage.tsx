import { useEffect, useState } from 'react'
import { Row, Col, DatePicker, Space, Button, Select, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { statisticsService } from '@/services/statisticsService'
import { OverviewStatistics, ZoneStatistics, LogisticsStatistics, OrderStatus } from '@/types'
import StatisticsCard from '@/components/merchant/StatisticsCard'
import TimeAnalysisChart from '@/components/merchant/TimeAnalysisChart'
import HeatmapChart from '@/components/merchant/HeatmapChart'
import OrderActivityList from '@/components/merchant/OrderActivityList'
import { orderService } from '@/services/orderService'
import { zoneService } from '@/services/zoneService'
import { Order, DeliveryZone } from '@/types'
import { isPointInPolygon } from '@/utils/mapUtils'
import { ShoppingOutlined, CarOutlined, CheckCircleOutlined, DollarOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'

const DashboardPage = () => {
  const [overview, setOverview] = useState<OverviewStatistics | null>(null)
  const [zoneStats, setZoneStats] = useState<ZoneStatistics[]>([])
  const [logisticsStats, setLogisticsStats] = useState<LogisticsStatistics[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs())
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>()

  useEffect(() => {
    loadData()
    // 30秒轮询
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [selectedDate, statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : undefined
      
      // 加载订单数据（根据状态筛选，用于图表和列表显示）
      const ordersData = await orderService.getOrders({ status: statusFilter })
      setOrders(ordersData)
      
      // 如果选择了状态筛选，需要基于筛选后的订单重新计算统计数据
      if (statusFilter) {
        // 加载所有订单（用于统计卡片，不受状态筛选影响）
        const allOrdersData = await orderService.getOrders()
        
        // 加载配送区域信息（用于计算区域统计）
        let zonesData = zones
        if (zones.length === 0) {
          const loadedZones = await zoneService.getZones()
          if (!Array.isArray(loadedZones)) {
            throw new Error(`配送区域数据格式错误: 期望数组，实际得到 ${typeof loadedZones}`)
          }
          zonesData = loadedZones
          setZones(loadedZones)
        }
        
        // 统计卡片使用所有订单计算（不受状态筛选影响）
        const filteredOverview = calculateFilteredOverview(allOrdersData, dateStr)
        setOverview(filteredOverview)
        
        // 区域和物流统计基于筛选后的订单（用于图表显示）
        const filteredZoneStats = await calculateFilteredZoneStats(ordersData, zonesData)
        const filteredLogisticsStats = calculateFilteredLogisticsStats(ordersData)
        setZoneStats(filteredZoneStats)
        setLogisticsStats(filteredLogisticsStats)
      } else {
        // 没有状态筛选，使用后端统计API
        const [overviewData, zoneData, logisticsData] = await Promise.all([
          statisticsService.getOverview(dateStr),
          statisticsService.getZoneStatistics(),
          statisticsService.getLogisticsStatistics(),
        ])
        setOverview(overviewData)
        setZoneStats(zoneData)
        setLogisticsStats(logisticsData)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载数据失败'
      message.error(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 基于筛选后的订单计算总览统计
  const calculateFilteredOverview = (filteredOrders: Order[], dateStr?: string): OverviewStatistics => {
    const selectedDateObj = dateStr ? dayjs(dateStr) : dayjs()
    const startOfDay = selectedDateObj.startOf('day').toDate()
    const endOfDay = selectedDateObj.endOf('day').toDate()

    const todayOrders = filteredOrders.filter((order) => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= startOfDay && orderDate <= endOfDay
    })

    const todayAmount = todayOrders.reduce((sum, order) => sum + order.amount, 0)
    const shippingOrders = filteredOrders.filter((order) => order.status === OrderStatus.SHIPPING).length
    const completedOrders = filteredOrders.filter((order) => order.status === OrderStatus.DELIVERED).length
    const pendingOrders = filteredOrders.filter((order) => order.status === OrderStatus.PENDING).length
    const cancelledOrders = filteredOrders.filter((order) => order.status === OrderStatus.CANCELLED).length

    return {
      todayOrders: todayOrders.length,
      todayAmount,
      shippingOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
    }
  }

  // 基于筛选后的订单计算区域统计
  const calculateFilteredZoneStats = async (filteredOrders: Order[], zonesData: DeliveryZone[]): Promise<ZoneStatistics[]> => {
    // 只统计已送达且有实际送达时间的订单
    const deliveredOrders = filteredOrders.filter(
      (order) => order.status === OrderStatus.DELIVERED && order.actualTime
    )
    
    if (deliveredOrders.length === 0 || zonesData.length === 0) {
      return []
    }

    const statistics: ZoneStatistics[] = []
    
    for (const zone of zonesData) {
      if (!zone.boundary || !zone.boundary.coordinates || !zone.boundary.coordinates[0]) {
        continue
      }
      
      const polygon = zone.boundary.coordinates[0] as number[][]
      
      // 使用射线法判断订单是否在配送区域内
      const zoneOrders = deliveredOrders.filter((order) => {
        const destination = order.destination as any
        if (!destination || typeof destination.lng !== 'number' || typeof destination.lat !== 'number') {
          return false
        }
        return isPointInPolygon(
          { lng: destination.lng, lat: destination.lat },
          polygon
        )
      })

      // 计算平均配送时长
      let totalTime = 0
      for (const order of zoneOrders) {
        if (order.actualTime && order.createdAt) {
          const time = new Date(order.actualTime).getTime() - new Date(order.createdAt).getTime()
          totalTime += time / (1000 * 60 * 60) // 转换为小时
        }
      }

      const avgDeliveryTime = zoneOrders.length > 0 ? totalTime / zoneOrders.length : 0

      statistics.push({
        zoneName: zone.name,
        orderCount: zoneOrders.length,
        avgDeliveryTime: parseFloat(avgDeliveryTime.toFixed(2)),
      })
    }

    return statistics
  }

  // 基于筛选后的订单计算物流公司统计
  const calculateFilteredLogisticsStats = (filteredOrders: Order[]): LogisticsStatistics[] => {
    const deliveredOrders = filteredOrders.filter((order) => order.status === OrderStatus.DELIVERED)
    
    // 按物流公司分组
    const logisticsMap = new Map<string, { orders: Order[]; totalTime: number }>()
    
    deliveredOrders.forEach((order) => {
      const company = order.logistics || '未知'
      if (!logisticsMap.has(company)) {
        logisticsMap.set(company, { orders: [], totalTime: 0 })
      }
      const stats = logisticsMap.get(company)!
      stats.orders.push(order)
      
      if (order.actualTime && order.createdAt) {
        const timeDiff = new Date(order.actualTime).getTime() - new Date(order.createdAt).getTime()
        stats.totalTime += timeDiff / (1000 * 60 * 60) // 转换为小时
      }
    })

    return Array.from(logisticsMap.entries()).map(([companyName, stats]) => {
      const avgDeliveryTime = stats.orders.length > 0 ? stats.totalTime / stats.orders.length : 0
      // 计算准时率（简化处理，假设24小时内送达为准时）
      const onTimeOrders = stats.orders.filter((order) => {
        if (!order.actualTime || !order.createdAt) return false
        const timeDiff = new Date(order.actualTime).getTime() - new Date(order.createdAt).getTime()
        return timeDiff <= 24 * 60 * 60 * 1000 // 24小时
      }).length
      const onTimeRate = stats.orders.length > 0 ? (onTimeOrders / stats.orders.length) * 100 : 0

      return {
        companyName,
        orderCount: stats.orders.length,
        avgDeliveryTime: parseFloat(avgDeliveryTime.toFixed(2)),
        onTimeRate: parseFloat(onTimeRate.toFixed(2)),
      }
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>数据看板</h1>
        <Space>
          <Select
            placeholder="筛选订单状态"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
          >
            <Select.Option value={OrderStatus.PENDING}>待发货</Select.Option>
            <Select.Option value={OrderStatus.SHIPPING}>运输中</Select.Option>
            <Select.Option value={OrderStatus.DELIVERED}>已完成</Select.Option>
            <Select.Option value={OrderStatus.CANCELLED}>已取消</Select.Option>
          </Select>
          <DatePicker
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            format="YYYY-MM-DD"
            placeholder="选择日期"
            allowClear
            style={{ width: 150 }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <StatisticsCard
            title="今日订单"
            value={overview?.todayOrders || 0}
            icon={<ShoppingOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <StatisticsCard
            title="待发货"
            value={overview?.pendingOrders || 0}
            icon={<ClockCircleOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <StatisticsCard
            title="运输中"
            value={overview?.shippingOrders || 0}
            icon={<CarOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <StatisticsCard
            title="已完成"
            value={overview?.completedOrders || 0}
            icon={<CheckCircleOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <StatisticsCard
            title="已取消"
            value={overview?.cancelledOrders || 0}
            icon={<CloseCircleOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <StatisticsCard
            title="今日金额"
            value={`¥${overview?.todayAmount?.toFixed(2) || '0.00'}`}
            icon={<DollarOutlined />}
            loading={loading}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={24}>
          {zoneStats.length > 0 || logisticsStats.length > 0 ? (
            <TimeAnalysisChart zoneData={zoneStats} logisticsData={logisticsStats} />
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
              暂无统计数据
            </div>
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={24}>
          {orders.length > 0 ? (
            <HeatmapChart orders={orders} />
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
              暂无订单数据
            </div>
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={24}>
          <OrderActivityList />
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
