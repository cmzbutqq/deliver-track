import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// 格式化金额
export const formatAmount = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

// 格式化日期时间
export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

// 格式化日期
export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

// 格式化时间
export const formatTime = (date: string | Date): string => {
  return dayjs(date).format('HH:mm:ss');
};

// 格式化相对时间
export const formatRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow();
};

// 格式化订单状态
export const formatOrderStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    PENDING: '待发货',
    SHIPPING: '运输中',
    DELIVERED: '已送达',
    CANCELLED: '已取消',
  };
  return statusMap[status] || status;
};

// 格式化订单状态颜色
export const getOrderStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    PENDING: 'default',
    SHIPPING: 'processing',
    DELIVERED: 'success',
    CANCELLED: 'error',
  };
  return colorMap[status] || 'default';
};

