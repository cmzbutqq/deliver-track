import { Modal, Descriptions, Tag, Button, QRCode } from 'antd';
import type { Order } from '../types';
import { formatDateTime, formatAmount, formatOrderStatus, getOrderStatusColor } from '../utils/format';

interface OrderDetailModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onShip?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export default function OrderDetailModal({
  order,
  visible,
  onClose,
  onShip,
  onCancel,
}: OrderDetailModalProps) {
  if (!order) return null;

  const trackingUrl = `${window.location.origin}/track/${order.orderNo}`;
  const canShip = order.status === 'PENDING';
  const canCancel = order.status === 'PENDING' || order.status === 'SHIPPING';

  return (
    <Modal
      title="订单详情"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        canShip && onShip && (
          <Button key="ship" type="primary" onClick={() => onShip(order.id)}>
            模拟发货
          </Button>
        ),
        canCancel && onCancel && (
          <Button key="cancel" danger onClick={() => onCancel(order.id)}>
            取消订单
          </Button>
        ),
      ].filter(Boolean)}
      width={800}
    >
      <Descriptions column={2} bordered>
        <Descriptions.Item label="订单号">{order.orderNo}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={getOrderStatusColor(order.status)}>
            {formatOrderStatus(order.status)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="物流公司">{order.logistics}</Descriptions.Item>
        <Descriptions.Item label="订单金额">{formatAmount(order.amount)}</Descriptions.Item>
        <Descriptions.Item label="收货人">{order.receiverName}</Descriptions.Item>
        <Descriptions.Item label="收货电话">{order.receiverPhone}</Descriptions.Item>
        <Descriptions.Item label="收货地址" span={2}>
          {order.receiverAddress}
        </Descriptions.Item>
        <Descriptions.Item label="商品名称">{order.productName}</Descriptions.Item>
        <Descriptions.Item label="商品数量">{order.productQuantity}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{formatDateTime(order.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="预计送达">{formatDateTime(order.estimatedTime)}</Descriptions.Item>
        {order.actualTime ? (
          <>
            <Descriptions.Item label="实际送达">{formatDateTime(order.actualTime)}</Descriptions.Item>
            <Descriptions.Item label="" />
          </>
        ) : null}
        {order.currentLocation && (
          <Descriptions.Item label="当前位置" span={2}>
            {order.currentLocation.lng}, {order.currentLocation.lat}
          </Descriptions.Item>
        )}
      </Descriptions>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <p>订单追踪二维码</p>
        <QRCode value={trackingUrl} size={200} />
        <p style={{ marginTop: 8, color: '#666' }}>扫描二维码查看物流信息</p>
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8, color: '#666' }}>或直接访问链接：</p>
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              wordBreak: 'break-all',
              color: '#1890ff',
              textDecoration: 'none',
            }}
          >
            {trackingUrl}
          </a>
        </div>
      </div>
    </Modal>
  );
}

