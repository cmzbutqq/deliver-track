import type { Order } from '../types';
import { formatDateTime, formatAmount, formatOrderStatus } from './format';

// 导出订单为 CSV
export const exportOrdersToCSV = (orders: Order[]): void => {
  const headers = [
    '订单号',
    '状态',
    '创建时间',
    '物流公司',
    '收货人',
    '收货电话',
    '收货地址',
    '商品名称',
    '数量',
    '金额',
    '预计送达',
    '实际送达',
  ];

  const rows = orders.map((order) => [
    order.orderNo,
    formatOrderStatus(order.status),
    formatDateTime(order.createdAt),
    order.logistics,
    order.receiverName,
    order.receiverPhone,
    order.receiverAddress,
    order.productName,
    order.productQuantity.toString(),
    formatAmount(order.amount),
    formatDateTime(order.estimatedTime),
    order.actualTime ? formatDateTime(order.actualTime) : '-',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  // 添加 BOM 以支持中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `订单列表_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

