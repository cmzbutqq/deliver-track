import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Spin, Progress, Descriptions, Tag, Tabs, App } from 'antd';
import { trackingApi } from '../../services/api';
import { socketService } from '../../services/socket';
import MapComponent from '../../components/MapComponent';
import type { Order, LocationUpdate, StatusUpdate } from '../../types';
import { formatDateTime, formatOrderStatus, getOrderStatusColor } from '../../utils/format';

declare global {
  interface Window {
    AMap: any;
  }
}

export default function TrackingPage() {
  const { message } = App.useApp();
  const { orderNo } = useParams<{ orderNo: string }>();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const vehicleMarkerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const moveAlongRef = useRef<any>(null);

  useEffect(() => {
    if (orderNo) {
      loadOrder();
      subscribeTracking();
    }
    return () => {
      if (orderNo) {
        socketService.unsubscribe(orderNo);
      }
      if (moveAlongRef.current) {
        moveAlongRef.current.stop();
      }
    };
  }, [orderNo]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const response = await trackingApi.getByOrderNo(orderNo!);
      setOrder(response.data);
      if (response.data.timeline) {
        setTimeline(response.data.timeline);
      }
    } catch (error: any) {
      message.error('加载订单信息失败');
    } finally {
      setLoading(false);
    }
  };

  const subscribeTracking = () => {
    if (!orderNo) return;

    socketService.connect();
    socketService.subscribe(orderNo, {
      onLocationUpdate: (data: LocationUpdate) => {
        // 使用函数式更新避免竞态条件
        setOrder((prevOrder) => {
          if (!prevOrder) return prevOrder;
          const updatedOrder = {
            ...prevOrder,
            currentLocation: data.location,
          };
          // 在下一个事件循环中执行动画，确保状态已更新
          setTimeout(() => {
            animateVehicle(data.location, data.progress);
          }, 0);
          return updatedOrder;
        });
      },
      onStatusUpdate: (data: StatusUpdate) => {
        setOrder((prevOrder) => {
          if (!prevOrder) return prevOrder;
          return {
            ...prevOrder,
            status: data.status,
          };
        });
        loadOrder(); // 重新加载获取最新时间线
      },
      onDeliveryComplete: () => {
        message.success('订单已送达');
        if (moveAlongRef.current) {
          moveAlongRef.current.stop();
        }
        loadOrder();
      },
    });
  };

  const animateVehicle = (location: { lng: number; lat: number }, progress: number) => {
    if (!mapInstanceRef.current || !window.AMap) return;

    const targetPosition = [location.lng, location.lat];

    // 如果车辆标记不存在，创建它
    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = new window.AMap.Marker({
        position: targetPosition,
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(40, 40),
          image: 'https://webapi.amap.com/theme/v1.3/markers/n/mid.png',
          imageOffset: new window.AMap.Pixel(0, 0),
          imageSize: new window.AMap.Size(40, 40),
        }),
        title: '车辆位置',
      });
      mapInstanceRef.current.add(vehicleMarkerRef.current);
    }

    // 停止之前的动画
    if (moveAlongRef.current) {
      moveAlongRef.current.stop();
    }

    // 获取当前路径
    if (order?.route?.points && order.route.points.length > 0) {
      const currentStep = Math.floor((progress / 100) * (order.route.points.length - 1));
      const remainingPath = order.route.points.slice(currentStep);

      if (remainingPath.length > 1) {
        // 使用 moveAlong 沿路径移动
        moveAlongRef.current = vehicleMarkerRef.current.moveAlong(remainingPath, {
          duration: 2000,
          autoRotation: true,
        });
      } else {
        // 直接移动到目标位置
        vehicleMarkerRef.current.setPosition(targetPosition);
      }
    } else {
      // 没有路径时直接移动
      vehicleMarkerRef.current.setPosition(targetPosition);
    }

    // 调整地图视野
    mapInstanceRef.current.setCenter(targetPosition);
  };

  const handleMapReady = (map: any) => {
    mapInstanceRef.current = map;
    // 延迟初始化，确保 order 数据已加载
    setTimeout(() => {
      if (order) {
        initializeMap();
      }
    }, 100);
  };

  const initializeMap = () => {
    if (!mapInstanceRef.current || !order || !window.AMap) return;

    // 调整视野以显示起点和终点
    const bounds = new window.AMap.Bounds();
    if (order.origin && typeof order.origin === 'object') {
      const origin = order.origin as any;
      bounds.extend([origin.lng, origin.lat]);
    }
    if (order.destination && typeof order.destination === 'object') {
      const dest = order.destination as any;
      bounds.extend([dest.lng, dest.lat]);
    }
    if (order.currentLocation && typeof order.currentLocation === 'object') {
      const current = order.currentLocation as any;
      bounds.extend([current.lng, current.lat]);
    }

    try {
      if (bounds.getSouthWest() && bounds.getNorthEast()) {
        mapInstanceRef.current.setBounds(bounds);
      } else {
        // 如果没有有效的边界，使用默认中心
        const dest = order.destination as any;
        if (dest) {
          mapInstanceRef.current.setCenter([dest.lng, dest.lat]);
          mapInstanceRef.current.setZoom(12);
        }
      }
    } catch (error) {
      // 如果调整失败，回退到默认缩放级别
      const dest = order.destination as any;
      if (dest) {
        mapInstanceRef.current.setZoom(12);
        mapInstanceRef.current.setCenter([dest.lng, dest.lat]);
      }
    }
  };

  useEffect(() => {
    if (order && mapInstanceRef.current && window.AMap) {
      initializeMap();
      if (order.status === 'SHIPPING' && order.currentLocation) {
        const current = order.currentLocation as any;
        animateVehicle(current, 0);
      }
    }
  }, [order]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return <div style={{ padding: 24 }}>订单不存在</div>;
  }

  const progress = order.route
    ? Math.round(((order.route.currentStep + 1) / order.route.totalSteps) * 100)
    : 0;

  // 地图数据
  const mapMarkers: any[] = [];
  const mapPolylines: any[] = [];

  // 起点标记
  if (order.origin && typeof order.origin === 'object') {
    const origin = order.origin as any;
    mapMarkers.push({
      position: origin,
      title: '起点',
      color: 'red',
    });
  }

  // 终点标记
  if (order.destination && typeof order.destination === 'object') {
    const dest = order.destination as any;
    mapMarkers.push({
      position: dest,
      title: '终点',
      color: 'green',
    });
  }

  // 路径线
  if (order.route?.points && order.route.points.length > 0) {
    const path = order.route.points;
    const passedPath = path.slice(0, order.route.currentStep + 1);
    const remainingPath = path.slice(order.route.currentStep + 1);

    if (passedPath.length > 1) {
      mapPolylines.push({
        path: passedPath,
        color: '#3366FF',
        strokeWeight: 4,
      });
    }
    if (remainingPath.length > 1) {
      mapPolylines.push({
        path: remainingPath,
        color: '#CCCCCC',
        strokeWeight: 2,
      });
    }
  } else if (order.origin && order.destination && typeof order.origin === 'object' && typeof order.destination === 'object') {
    const origin = order.origin as any;
    const dest = order.destination as any;
    mapPolylines.push({
      path: [
        [origin.lng, origin.lat],
        [dest.lng, dest.lat],
      ],
      color: '#CCCCCC',
      strokeWeight: 2,
    });
  }

  const tabItems = [
    {
      key: 'map',
      label: '地图',
      children: (
        <MapComponent
          center={
            (order.destination && typeof order.destination === 'object'
              ? (order.destination as any)
              : order.origin && typeof order.origin === 'object'
              ? (order.origin as any)
              : { lng: 116.397428, lat: 39.90923 }) as any
          }
          markers={mapMarkers}
          polylines={mapPolylines}
          onMapReady={handleMapReady}
          style={{ height: '500px', minHeight: '375px' }}
        />
      ),
    },
    {
      key: 'timeline',
      label: '物流时间线',
      children: (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {timeline.length > 0 ? (
            <div style={{ padding: '16px 0' }}>
              {timeline.map((item, index) => (
                <div
                  key={index}
                  style={{
                    borderLeft: '2px solid #1890ff',
                    paddingLeft: 16,
                    marginBottom: 24,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: -6,
                      top: 0,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#1890ff',
                    }}
                  />
                  <div style={{ marginBottom: 8 }}>
                    <Tag color={getOrderStatusColor(item.status)}>{item.status}</Tag>
                    <span style={{ marginLeft: 8, color: '#666' }}>
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>
                  <div style={{ marginBottom: 4, fontWeight: 500 }}>{item.description}</div>
                  {item.location && (
                    <div style={{ color: '#999', fontSize: 12 }}>
                      位置: {item.location.lng}, {item.location.lat}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              暂无物流信息
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="订单号">{order.orderNo}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={getOrderStatusColor(order.status)}>{formatOrderStatus(order.status)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="物流公司">{order.logistics}</Descriptions.Item>
          <Descriptions.Item label="预计送达">{formatDateTime(order.estimatedTime)}</Descriptions.Item>
          {order.actualTime ? (
            <>
              <Descriptions.Item label="实际送达">{formatDateTime(order.actualTime)}</Descriptions.Item>
              <Descriptions.Item label="" />
            </>
          ) : null}
        </Descriptions>

        {order.status === 'SHIPPING' && (
          <div style={{ marginTop: 24 }}>
            <div style={{ marginBottom: 8 }}>配送进度</div>
            <Progress percent={progress} status="active" />
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          items={tabItems}
          defaultActiveKey="map"
          style={{ minHeight: '500px' }}
        />
      </Card>
    </div>
  );
}
