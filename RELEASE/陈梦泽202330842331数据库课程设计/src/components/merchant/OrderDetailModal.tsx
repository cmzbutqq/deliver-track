import { Modal, Descriptions, Button, Input, Space, message } from 'antd'
import { CopyOutlined, LinkOutlined } from '@ant-design/icons'
import { Order, OrderStatus } from '@/types'
import QRCodeGenerator from '@/components/common/QRCodeGenerator'

interface OrderDetailModalProps {
  order: Order | null
  visible: boolean
  onClose: () => void
  onShip?: (id: string) => void
}

const OrderDetailModal = ({ order, visible, onClose, onShip }: OrderDetailModalProps) => {
  if (!order) return null

  const getStatusText = (status: OrderStatus) => {
    const statusMap = {
      PENDING: '待发货',
      SHIPPING: '运输中',
      DELIVERED: '已送达',
      CANCELLED: '已取消',
    }
    return statusMap[status] || status
  }

  const calculateProgress = () => {
    if (!order.route) return 0
    return ((order.route.currentStep + 1) / order.route.totalSteps) * 100
  }

  const trackingUrl = `${window.location.origin}/track/${order.orderNo}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl)
      message.success('链接已复制到剪贴板')
    } catch (err) {
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea')
      textArea.value = trackingUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        message.success('链接已复制到剪贴板')
      } catch (e) {
        message.error('复制失败，请手动复制')
      }
      document.body.removeChild(textArea)
    }
  }

  const handleOpenLink = () => {
    window.open(trackingUrl, '_blank')
  }

  return (
    <Modal
      title="订单详情"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        order.status === OrderStatus.PENDING && onShip ? (
          <Button
            key="ship"
            type="primary"
            onClick={() => {
              onShip(order.id)
              onClose()
            }}
          >
            模拟发货
          </Button>
        ) : null,
      ].filter(Boolean)}
      width={600}
    >
      <Descriptions column={1} bordered>
        <Descriptions.Item label="订单号">{order.orderNo}</Descriptions.Item>
        <Descriptions.Item label="状态">
          {getStatusText(order.status)}
          {order.status === OrderStatus.SHIPPING && (
            <span style={{ marginLeft: 8 }}>
              (进度: {calculateProgress().toFixed(0)}%)
            </span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="物流公司">{order.logistics}</Descriptions.Item>
        <Descriptions.Item label="收货人">
          {order.receiverName?.replace(/(.{1}).*(.{1})/, '$1**$2')}
        </Descriptions.Item>
        <Descriptions.Item label="收货地址">{order.receiverAddress}</Descriptions.Item>
        <Descriptions.Item label="商品名称">{order.productName}</Descriptions.Item>
        <Descriptions.Item label="商品数量">{order.productQuantity}</Descriptions.Item>
        <Descriptions.Item label="订单金额">¥{order.amount.toFixed(2)}</Descriptions.Item>
        {order.estimatedTime && (
          <Descriptions.Item label="预计送达">
            {new Date(order.estimatedTime).toLocaleString()}
          </Descriptions.Item>
        )}
        {order.actualTime && (
          <Descriptions.Item label="实际送达">
            {new Date(order.actualTime).toLocaleString()}
          </Descriptions.Item>
        )}
      </Descriptions>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <QRCodeGenerator value={trackingUrl} />
        <div style={{ marginTop: 8, fontSize: 12, color: '#999', marginBottom: 16 }}>
          扫描二维码查看物流追踪
        </div>
        
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>
            追踪链接：
          </div>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={trackingUrl}
              readOnly
              style={{ flex: 1 }}
              onFocus={(e) => e.target.select()}
            />
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyLink}
              title="复制链接"
            >
              复制
            </Button>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={handleOpenLink}
              title="在新窗口打开"
            >
              打开
            </Button>
          </Space.Compact>
        </div>
      </div>
    </Modal>
  )
}

export default OrderDetailModal

