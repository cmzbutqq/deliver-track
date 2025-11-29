import { useEffect, useState } from 'react'
import { Row, Col, DatePicker, Space, Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { statisticsService } from '@/services/statisticsService'
import { OverviewStatistics, ZoneStatistics, LogisticsStatistics } from '@/types'
import StatisticsCard from '@/components/merchant/StatisticsCard'
import TimeAnalysisChart from '@/components/merchant/TimeAnalysisChart'
import HeatmapChart from '@/components/merchant/HeatmapChart'
import OrderActivityList from '@/components/merchant/OrderActivityList'
import { orderService } from '@/services/orderService'
import { Order } from '@/types'
import { ShoppingOutlined, CarOutlined, CheckCircleOutlined, DollarOutlined } from '@ant-design/icons'

const { RangePicker } = DatePicker

const DashboardPage = () => {
  const [overview, setOverview] = useState<OverviewStatistics | null>(null)
  const [zoneStats, setZoneStats] = useState<ZoneStatistics[]>([])
  const [logisticsStats, setLogisticsStats] = useState<LogisticsStatistics[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs())

  useEffect(() => {
    loadData()
    // 30秒轮询
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [selectedDate])

  const loadData = async () => {
    setLoading(true)
    const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : undefined
    const [overviewData, zoneData, logisticsData, ordersData] = await Promise.all([
      statisticsService.getOverview(dateStr),
      statisticsService.getZoneStatistics(),
      statisticsService.getLogisticsStatistics(),
      orderService.getOrders(),
    ])
    setOverview(overviewData)
    setZoneStats(zoneData)
    setLogisticsStats(logisticsData)
    setOrders(ordersData)
    setLoading(false)
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>数据看板</h1>
        <Space>
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
        <Col xs={24} sm={12} lg={6}>
          <StatisticsCard
            title="今日订单"
            value={overview?.todayOrders || 0}
            icon={<ShoppingOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticsCard
            title="运输中"
            value={overview?.shippingOrders || 0}
            icon={<CarOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticsCard
            title="已完成"
            value={overview?.completedOrders || 0}
            icon={<CheckCircleOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
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

