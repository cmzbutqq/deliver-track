import { useEffect, useState } from 'react'
import { List, Alert, Card, Spin, Empty } from 'antd'
import { websocketService } from '@/services/websocketService'
import { orderService } from '@/services/orderService'
import { StatusUpdateEvent } from '@/types'

interface ActivityItem {
  id: string
  orderNo: string
  message: string
  timestamp: Date
  status?: string
  location?: string
}

const OrderActivityList = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  // 格式化时间显示（相对时间）
  const formatTime = (timestamp: Date): string => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}天前`
    } else if (hours > 0) {
      return `${hours}小时前`
    } else if (minutes > 0) {
      return `${minutes}分钟前`
    } else {
      return '刚刚'
    }
  }

  // 加载历史数据
  const loadHistory = async () => {
    setLoading(true)
    try {
      const history = await orderService.getRecentActivities(100)
      
      // 转换历史数据格式
      const historyActivities: ActivityItem[] = history.map((item: any) => ({
        id: item.id,
        orderNo: item.order?.orderNo || '未知订单',
        message: `${item.status}: ${item.description}`,
        timestamp: new Date(item.timestamp),
        status: item.status,
        location: item.location,
      }))

      // 合并历史数据和实时数据，去重（按 orderNo + timestamp）
      setActivities((prev) => {
        const combined = [...historyActivities, ...prev]
        const unique = new Map<string, ActivityItem>()
        
        for (const item of combined) {
          const key = `${item.orderNo}-${item.timestamp.getTime()}`
          if (!unique.has(key)) {
            unique.set(key, item)
          }
        }
        
        return Array.from(unique.values())
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 100) // 只保留最近100条
      })
    } catch (error) {
      console.error('加载活动历史失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 加载历史数据
    loadHistory()

    // 确保 WebSocket 已连接
    if (!websocketService.isConnected()) {
      websocketService.connect()
    }

    // 检查连接状态
    const checkConnection = () => {
      setConnected(websocketService.isConnected())
    }
    
    // 立即检查一次
    checkConnection()
    
    // 定期检查连接状态
    const connectionCheckInterval = setInterval(checkConnection, 2000)

    const handleStatusUpdate = (data: StatusUpdateEvent) => {
      const newActivity: ActivityItem = {
        id: `realtime-${Date.now()}-${Math.random()}`,
        orderNo: data.orderNo,
        message: data.message,
        timestamp: new Date(),
        status: data.status,
      }

      setActivities((prev) => {
        // 避免重复添加
        const exists = prev.some(
          (item) =>
            item.orderNo === data.orderNo &&
            item.message === data.message &&
            Math.abs(item.timestamp.getTime() - newActivity.timestamp.getTime()) < 1000
        )
        
        if (exists) {
          return prev
        }

        // 将新活动添加到最前面，并限制总数
        return [newActivity, ...prev].slice(0, 100)
      })
    }

    // 监听连接事件
    const socket = websocketService.getSocket()
    if (socket) {
      socket.on('connect', () => {
        console.log('WebSocket 已连接')
        setConnected(true)
      })
      
      socket.on('disconnect', () => {
        console.log('WebSocket 已断开')
        setConnected(false)
      })
    }

    websocketService.onStatusUpdate(handleStatusUpdate)

    return () => {
      clearInterval(connectionCheckInterval)
      websocketService.offStatusUpdate(handleStatusUpdate)
    }
  }, [])

  return (
    <Card title="最新订单动态">
      {!connected && (
        <Alert
          message="WebSocket 未连接"
          description="无法接收实时订单状态更新，请检查网络连接"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Spin spinning={loading}>
        {activities.length === 0 ? (
          <Empty description="暂无订单动态" />
        ) : (
          <List
            size="small"
            dataSource={activities}
            renderItem={(item) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>订单 {item.orderNo}</strong>
                      {item.status && (
                        <span style={{ marginLeft: 8, color: '#1890ff' }}>
                          [{item.status}]
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {formatTime(item.timestamp)}
                    </div>
                  </div>
                  <div style={{ marginTop: 4, color: '#666' }}>
                    {item.message}
                  </div>
                  {item.location && (
                    <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
                      📍 {item.location}
                    </div>
                  )}
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
                    {item.timestamp.toLocaleString('zh-CN')}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Spin>
    </Card>
  )
}

export default OrderActivityList
