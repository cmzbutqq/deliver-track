import { useState, useEffect } from 'react'
import { Table, Button, Space, Select, message, Row, Col, Tag, Tooltip } from 'antd'
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { orderService } from '@/services/orderService'
import { zoneService } from '@/services/zoneService'
import { Order, OrderStatus, DeliveryZone } from '@/types'
import OrderDetailModal from '@/components/merchant/OrderDetailModal'
import BatchActions from '@/components/merchant/BatchActions'
import OrderListMap from '@/components/map/OrderListMap'
import { isPointInPolygon } from '@/utils/mapUtils'
import type { ColumnsType } from 'antd/es/table'

const OrdersPage = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>()
  const [zoneFilter, setZoneFilter] = useState<string | undefined>()
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  // 加载配送区域列表
  useEffect(() => {
    const loadZones = async () => {
      const zonesData = await zoneService.getZones()
      if (!Array.isArray(zonesData)) {
        throw new Error(`配送区域数据格式错误: 期望数组，实际得到 ${typeof zonesData}`)
      }
      setZones(zonesData)
    }
    loadZones().catch((error) => {
      message.error(`加载配送区域失败: ${error instanceof Error ? error.message : String(error)}`)
    })
  }, [])

  useEffect(() => {
    loadOrders()
  }, [statusFilter, zoneFilter])

  // 订单状态排序优先级：运输中 > 待发货 > 已取消 > 已送达
  const getStatusPriority = (status: OrderStatus): number => {
    const priorityMap = {
      [OrderStatus.SHIPPING]: 1,    // 运输中 - 最高优先级
      [OrderStatus.PENDING]: 2,     // 待发货
      [OrderStatus.CANCELLED]: 3,   // 已取消
      [OrderStatus.DELIVERED]: 4,   // 已送达 - 最低优先级
    }
    return priorityMap[status] || 999
  }

  const loadOrders = async () => {
    setLoading(true)
    try {
      let data: Order[] = []
      
      // 如果选择了配送区域，使用区域筛选 API
      if (zoneFilter) {
        data = await zoneService.getZoneOrders(zoneFilter)
        // 如果同时有状态筛选，在前端进行二次筛选
        if (statusFilter) {
          data = data.filter((order) => order.status === statusFilter)
        }
      } else {
        // 没有选择区域，使用原来的订单列表 API
        data = await orderService.getOrders({ status: statusFilter })
      }
      
      if (!Array.isArray(data)) {
        throw new Error(`订单数据格式错误: 期望数组，实际得到 ${typeof data}. 数据: ${JSON.stringify(data)}`)
      }
      
      // 按状态优先级排序：运输中 > 待发货 > 已取消 > 已送达
      // 相同状态内按创建时间倒序（最新的在前）
      data.sort((a, b) => {
        const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status)
        if (priorityDiff !== 0) {
          return priorityDiff
        }
        // 相同状态，按创建时间倒序
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      
      setOrders(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载订单失败'
      message.error(errorMessage)
      setOrders([])
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleRowDoubleClick = (record: Order) => {
    setSelectedOrder(record)
    setModalVisible(true)
  }

  const handleShip = async (id: string) => {
    await orderService.shipOrder(id)
    message.success('发货成功')
    loadOrders()
  }

  // 查找订单所在的配送区域
  const findOrderZone = (order: Order): DeliveryZone | null => {
    if (!order.destination || !order.destination.lng || !order.destination.lat) {
      return null
    }

    const point = {
      lng: order.destination.lng,
      lat: order.destination.lat,
    }

    for (const zone of zones) {
      if (zone.boundary && zone.boundary.coordinates && zone.boundary.coordinates[0]) {
        const polygon = zone.boundary.coordinates[0] as number[][]
        if (isPointInPolygon(point, polygon)) {
          return zone
        }
      }
    }

    return null
  }

  // 格式化创建时间，使用更紧凑的格式
  const formatDateTime = (time: string): string => {
    const date = new Date(time)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}/${month}/${day} ${hours}:${minutes}`
  }

  const columns: ColumnsType<Order> = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: OrderStatus) => {
        const statusMap = {
          PENDING: '待发货',
          SHIPPING: '运输中',
          DELIVERED: '已送达',
          CANCELLED: '已取消',
        }
        return statusMap[status] || status
      },
    },
    {
      title: '可配送状态',
      key: 'deliveryStatus',
      width: 140,
      render: (_: any, record: Order) => {
        const zone = findOrderZone(record)
        if (zone) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              {zone.name}
            </Tag>
          )
        } else {
          return (
            <Tag color="error" icon={<CloseCircleOutlined />}>
              不可配送
            </Tag>
          )
        }
      },
    },
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 140,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          <span style={{ fontFamily: 'monospace' }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '收货人',
      dataIndex: 'receiverName',
      key: 'receiverName',
      width: 100,
      ellipsis: true,
    },
    {
      title: '收货地址',
      dataIndex: 'receiverAddress',
      key: 'receiverAddress',
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right',
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      ellipsis: {
        showTitle: false,
      },
      render: (time: string) => {
        const formatted = formatDateTime(time)
        return (
          <Tooltip placement="topLeft" title={new Date(time).toLocaleString()}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{formatted}</span>
          </Tooltip>
        )
      },
    },
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys)
    },
  }

  const selectedOrders = orders.filter((order) => selectedRowKeys.includes(order.id))

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Select
            placeholder="筛选配送区域"
            allowClear
            style={{ width: 180 }}
            value={zoneFilter}
            onChange={(value) => setZoneFilter(value)}
          >
            {zones.map((zone) => (
              <Select.Option key={zone.id} value={zone.id}>
                {zone.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
          >
            <Select.Option value={OrderStatus.PENDING}>待发货</Select.Option>
            <Select.Option value={OrderStatus.SHIPPING}>运输中</Select.Option>
            <Select.Option value={OrderStatus.DELIVERED}>已送达</Select.Option>
            <Select.Option value={OrderStatus.CANCELLED}>已取消</Select.Option>
          </Select>
          <BatchActions
            selectedOrderIds={selectedRowKeys as string[]}
            onSuccess={loadOrders}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/merchant/orders/new')}
        >
          新建订单
        </Button>
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <div style={{ marginBottom: 16 }}>
            <OrderListMap selectedOrders={selectedOrders} />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={orders}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            onRow={(record) => ({
              onDoubleClick: () => handleRowDoubleClick(record),
            })}
            pagination={{
              pageSize: 100,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
          />
        </Col>
      </Row>

      <OrderDetailModal
        order={selectedOrder}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false)
          setSelectedOrder(null)
        }}
        onShip={handleShip}
      />
    </div>
  )
}

export default OrdersPage
