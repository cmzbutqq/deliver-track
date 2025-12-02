import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Progress, Timeline } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { trackingService } from '@/services/trackingService'
import { Order, LogisticsTimeline, OrderStatus, LocationUpdateEvent } from '@/types'
import TrackingMap from '@/components/track/TrackingMap'
import ConnectionStatus from '@/components/track/ConnectionStatus'
import './TrackingPage.css'

const TrackingPage = () => {
  const { orderNo } = useParams<{ orderNo: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (orderNo) {
      loadTrackingInfo()
    }
  }, [orderNo])

  const loadTrackingInfo = async () => {
    if (!orderNo) return
    
    setLoading(true)
    const response = await trackingService.getTrackingInfo(orderNo)
    if (response.success && response.data) {
      setOrder(response.data)
      if (response.data.route) {
        const route = response.data.route
        setProgress(((route.currentStep + 1) / route.totalSteps) * 100)
      }
    } else {
      throw new Error(response.message || '订单不存在')
    }
    setLoading(false)
  }

  const handleLocationUpdate = useCallback((data: LocationUpdateEvent) => {
    setProgress(data.progress)
    setOrder((prevOrder) => {
      if (!prevOrder || !data.location) return prevOrder
      
      // 更新订单信息，包括 route.currentStep
      const updatedOrder = {
        ...prevOrder,
        currentLocation: {
          lng: data.location.lng,
          lat: data.location.lat,
          address: prevOrder.currentLocation?.address || '',
        },
      }
      
      // 如果有 route，更新 currentStep
      // 后端发送的 progress = (currentStep + 1) / points.length * 100
      // 所以 currentStep = Math.floor((progress / 100) * routePoints.length) - 1
      if (updatedOrder.route && updatedOrder.route.points) {
        const routePoints = updatedOrder.route.points as number[][]
        // 根据 progress 计算 currentStep（不提前）
        const calculatedStep = Math.floor((data.progress / 100) * routePoints.length) - 1
        const currentStep = Math.max(0, Math.min(calculatedStep, routePoints.length - 1))
        updatedOrder.route = {
          ...updatedOrder.route,
          currentStep,
        }
      }
      
      return updatedOrder
    })
  }, [])

  const handleStatusUpdate = useCallback((status: string) => {
    setOrder((prevOrder) => {
      if (!prevOrder) return prevOrder
      return {
        ...prevOrder,
        status: status as OrderStatus,
      }
    })
  }, [])

  const getStatusText = (status: OrderStatus) => {
    const statusMap = {
      PENDING: '待发货',
      SHIPPING: '运输中',
      DELIVERED: '已送达',
      CANCELLED: '已取消',
    }
    return statusMap[status] || status
  }

  return (
    <div className="tracking-page">
      <div className="tracking-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/track')}
        >
          返回
        </Button>
      </div>

      <ConnectionStatus />

      {loading ? (
        <div>加载中...</div>
      ) : order ? (
        <div className="tracking-content">
          <div className="tracking-map-container">
            <TrackingMap
              order={order}
              onLocationUpdate={handleLocationUpdate}
              onStatusUpdate={handleStatusUpdate}
            />
          </div>

          <div className="tracking-info-container">
            <Card className="order-info-card" title="订单信息">
              <div className="order-info">
                <div>订单号: {order.orderNo}</div>
                <div>状态: {getStatusText(order.status)}</div>
                {order.route && (
                  <div>
                    <div>进度: {progress.toFixed(0)}%</div>
                    <Progress percent={progress} />
                  </div>
                )}
                <div>物流公司: {order.logistics}</div>
                {order.estimatedTime && (
                  <div>预计送达: {new Date(order.estimatedTime).toLocaleString()}</div>
                )}
              </div>
            </Card>

            <Card className="timeline-card" title="物流时间线">
              {order.timeline && order.timeline.length > 0 ? (
                <Timeline
                  items={order.timeline
                    .slice()
                    .reverse()
                    .map((item: LogisticsTimeline) => ({
                      color: 'green',
                      children: (
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{item.status}</div>
                          <div>{item.description}</div>
                          {item.location && <div>位置: {item.location}</div>}
                          <div style={{ color: '#999', fontSize: '12px' }}>
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ),
                    }))}
                />
              ) : (
                <div>暂无物流信息</div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div>订单不存在</div>
      )}
    </div>
  )
}

export default TrackingPage

