import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Space, Tag, Select, Row, Col, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { orderApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { Order, OrderStatus } from '../../types';
import { formatDateTime, formatAmount, formatOrderStatus, getOrderStatusColor } from '../../utils/format';
import { exportOrdersToCSV } from '../../utils/export';
import MapComponent from '../../components/MapComponent';
import OrderDetailModal from '../../components/OrderDetailModal';

export default function OrdersPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 100, total: 0 });
  const [filters, setFilters] = useState({ status: '', sortBy: 'createdAt', sortOrder: 'desc' as 'asc' | 'desc' });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated, pagination.current, pagination.pageSize, filters]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await orderApi.getList({
        page: pagination.current,
        limit: pagination.pageSize,
        status: filters.status || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });
      setOrders(response.data);
      if (response.total) {
        setPagination((prev) => ({ ...prev, total: response.total! }));
      }
    } catch (error: any) {
      message.error('加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchShip = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要发货的订单');
      return;
    }
    try {
      await orderApi.batchShip(selectedRowKeys as string[]);
      message.success('批量发货成功');
      setSelectedRowKeys([]);
      loadOrders();
    } catch (error: any) {
      message.error('批量发货失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的订单');
      return;
    }
    try {
      await orderApi.batchDelete(selectedRowKeys as string[]);
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      loadOrders();
    } catch (error: any) {
      message.error('批量删除失败');
    }
  };

  const handleExport = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要导出的订单');
      return;
    }
    const selectedOrders = orders.filter((order) => selectedRowKeys.includes(order.id));
    exportOrdersToCSV(selectedOrders);
    message.success('导出成功');
  };

  const handleRowClick = (record: Order) => {
    setSelectedOrder(record);
    setDetailModalVisible(true);
  };

  const handleShip = async (id: string) => {
    try {
      await orderApi.ship(id);
      message.success('发货成功');
      setDetailModalVisible(false);
      loadOrders();
    } catch (error: any) {
      message.error('发货失败');
    }
  };

  // 计算地图数据
  const mapData = useMemo(() => {
    const selectedOrders = orders.filter((order) => selectedRowKeys.includes(order.id));
    if (selectedOrders.length === 0) return { markers: [], polylines: [] };

    const markers: any[] = [];
    const polylines: any[] = [];

    selectedOrders.forEach((order) => {
      // 终点标记
      if (order.destination && typeof order.destination === 'object') {
        const dest = order.destination as any;
        markers.push({
          position: dest,
          title: order.orderNo,
          color: order.status === 'DELIVERED' ? 'green' : order.status === 'SHIPPING' ? 'blue' : 'red',
        });
      }

      // 当前位置标记（运输中）
      if (order.status === 'SHIPPING' && order.currentLocation && typeof order.currentLocation === 'object') {
        const current = order.currentLocation as any;
        markers.push({
          position: current,
          title: `当前位置 - ${order.orderNo}`,
          color: 'blue',
        });
      }

      // 路径线
      if (order.route?.points && order.route.points.length > 0) {
        const path = order.route.points;
        const passedPath = path.slice(0, order.route.currentStep + 1);
        const remainingPath = path.slice(order.route.currentStep + 1);

        if (passedPath.length > 1) {
          polylines.push({
            path: passedPath,
            color: '#3366FF',
            strokeWeight: 3,
          });
        }
        if (remainingPath.length > 1) {
          polylines.push({
            path: remainingPath,
            color: '#CCCCCC',
            strokeWeight: 2,
          });
        }
      } else if (
        order.origin &&
        order.destination &&
        typeof order.origin === 'object' &&
        typeof order.destination === 'object'
      ) {
        // 没有路径时显示直线
        const origin = order.origin as any;
        const dest = order.destination as any;
        polylines.push({
          path: [
            [origin.lng, origin.lat],
            [dest.lng, dest.lat],
          ],
          color: '#CCCCCC',
          strokeWeight: 2,
        });
      }
    });

    return { markers, polylines };
  }, [orders, selectedRowKeys]);

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text: string, record: Order) => (
        <a onClick={() => handleRowClick(record)}>{text}</a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus) => (
        <Tag color={getOrderStatusColor(status)}>{formatOrderStatus(status)}</Tag>
      ),
    },
    {
      title: '收货人',
      dataIndex: 'receiverName',
      key: 'receiverName',
    },
    {
      title: '商品',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatAmount(amount),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>订单管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/merchant/orders/new')}>
          创建订单
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          style={{ width: 150 }}
          placeholder="状态筛选"
          allowClear
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value || '' })}
        >
          <Select.Option value="PENDING">待发货</Select.Option>
          <Select.Option value="SHIPPING">运输中</Select.Option>
          <Select.Option value="DELIVERED">已送达</Select.Option>
          <Select.Option value="CANCELLED">已取消</Select.Option>
        </Select>
        <Button onClick={handleBatchShip}>批量发货</Button>
        <Button danger onClick={handleBatchDelete}>批量删除</Button>
        <Button onClick={handleExport}>导出 CSV</Button>
      </Space>

      <Row gutter={16}>
        <Col xs={24} lg={10}>
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={orders}
            loading={loading}
            rowKey="id"
            onRow={(record) => ({
              onDoubleClick: () => handleRowClick(record),
            })}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (page, pageSize) => {
                setPagination({ current: page, pageSize, total: pagination.total });
              },
            }}
          />
        </Col>
        <Col xs={24} lg={14}>
          <MapComponent
            markers={mapData.markers}
            polylines={mapData.polylines}
            style={{ height: '600px' }}
          />
        </Col>
      </Row>

      <OrderDetailModal
        order={selectedOrder}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        onShip={handleShip}
      />
    </div>
  );
}

