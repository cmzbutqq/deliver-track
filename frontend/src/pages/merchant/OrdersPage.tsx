import { useState, useEffect } from 'react'
import { Table, Button, Space, Select, message, Row, Col } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { orderService } from '@/services/orderService'
import { Order, OrderStatus } from '@/types'
import OrderDetailModal from '@/components/merchant/OrderDetailModal'
import BatchActions from '@/components/merchant/BatchActions'
import OrderListMap from '@/components/map/OrderListMap'
import type { ColumnsType } from 'antd/es/table'

const OrdersPage = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    setLoading(true)
    const data = await orderService.getOrders({ status: statusFilter })
    if (!Array.isArray(data)) {
      throw new Error(`订单数据格式错误: 期望数组，实际得到 ${typeof data}. 数据: ${JSON.stringify(data)}`)
    }
    setOrders(data)
    setLoading(false)
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

  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
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
      title: '收货人',
      dataIndex: 'receiverName',
      key: 'receiverName',
    },
    {
      title: '收货地址',
      dataIndex: 'receiverAddress',
      key: 'receiverAddress',
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => new Date(time).toLocaleString(),
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
            placeholder="筛选状态"
            allowClear
            style={{ width: 150 }}
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
        <Col xs={24} lg={8}>
          <div style={{ marginBottom: 16 }}>
            <OrderListMap selectedOrders={selectedOrders} />
          </div>
        </Col>
        <Col xs={24} lg={16}>
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={orders}
            rowKey="id"
            loading={loading}
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

