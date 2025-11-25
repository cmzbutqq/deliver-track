import { useEffect, useState, useRef } from 'react';
import { Card, Statistic, Row, Col, Spin, Tabs, App } from 'antd';
import ReactECharts from 'echarts-for-react';
import { statisticsApi, orderApi } from '../../services/api';
import MapComponent from '../../components/MapComponent';
import type { StatisticsOverview, ZoneStatistics, LogisticsStatistics, Order } from '../../types';
import { formatAmount } from '../../utils/format';

export default function DashboardPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<StatisticsOverview | null>(null);
  const [zoneStats, setZoneStats] = useState<ZoneStatistics[]>([]);
  const [logisticsStats, setLogisticsStats] = useState<LogisticsStatistics[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mapTab, setMapTab] = useState<'count' | 'time'>('count');
  const heatmapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30秒轮询
    return () => {
      clearInterval(interval);
      // 清理热力图
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
      }
    };
  }, []);

  const loadData = async () => {
    try {
      const [overviewRes, zonesRes, logisticsRes, ordersRes] = await Promise.all([
        statisticsApi.getOverview(),
        statisticsApi.getZones(),
        statisticsApi.getLogistics(),
        orderApi.getList({ limit: 1000 }), // 获取订单用于热力图
      ]);
      setOverview(overviewRes.data);
      // 确保数据是数组
      setZoneStats(Array.isArray(zonesRes.data) ? zonesRes.data : []);
      setLogisticsStats(Array.isArray(logisticsRes.data) ? logisticsRes.data : []);
      setOrders(ordersRes.data || []);
    } catch (error: any) {
      message.error('加载数据失败');
      // 出错时设置为空数组
      setZoneStats([]);
      setLogisticsStats([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // 生成热力图数据点（高德地图热力图需要数组格式：[lng, lat, count]）
  const heatmapData = orders
    .filter((order) => order.destination && typeof order.destination === 'object')
    .map((order) => {
      const dest = order.destination as any;
      // 高德地图热力图数据格式：[经度, 纬度, 权重]
      return [dest.lng, dest.lat, 1];
    });

  // 当热力图数据或标签页变化时，更新热力图
  useEffect(() => {
    if (mapTab === 'count' && mapInstanceRef.current && window.AMap && heatmapData.length > 0) {
      // 检查 Heatmap 插件是否已加载
      if (!window.AMap.Heatmap) {
        console.error('热力图插件未加载，请检查 AMap.Heatmap 插件配置');
        return;
      }

      // 清理旧的热力图
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
      }

      // 创建新的热力图
      const heatmap = new window.AMap.Heatmap(mapInstanceRef.current, {
        radius: 25,
        opacity: [0, 0.8],
      });
      
      // 高德地图热力图数据格式：[[lng, lat, count], ...]
      heatmap.setDataSet({
        data: heatmapData,
        max: 100,
      });
      
      heatmapRef.current = heatmap;

      // 调整视野
      const bounds = new window.AMap.Bounds();
      heatmapData.forEach((point) => {
        bounds.extend([point[0], point[1]]);
      });
      if (bounds.getSouthWest() && bounds.getNorthEast()) {
        mapInstanceRef.current.setBounds(bounds);
      }
    } else if (mapTab !== 'count' && heatmapRef.current) {
      // 切换到其他标签页时清理热力图
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }
  }, [heatmapData, mapTab]);

  // 物流公司柱状图配置
  const logisticsChartOption = {
    title: {
      text: '物流公司配送时效对比',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = `${params[0].name}<br/>`;
        params.forEach((param: any) => {
          result += `${param.seriesName}: ${param.value.toFixed(2)} 小时<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ['平均配送时长', '准点率'],
      top: 30,
    },
    xAxis: {
      type: 'category',
      data: Array.isArray(logisticsStats) ? logisticsStats.map((l) => l.companyName) : [],
    },
    yAxis: [
      {
        type: 'value',
        name: '小时',
        position: 'left',
      },
      {
        type: 'value',
        name: '准点率',
        position: 'right',
        max: 100,
        axisLabel: {
          formatter: '{value}%',
        },
      },
    ],
    series: [
      {
        name: '平均配送时长',
        type: 'bar',
        data: Array.isArray(logisticsStats) ? logisticsStats.map((l) => l.avgDeliveryTime) : [],
        itemStyle: {
          color: '#1890ff',
        },
      },
      {
        name: '准点率',
        type: 'line',
        yAxisIndex: 1,
        data: Array.isArray(logisticsStats) ? logisticsStats.map((l) => l.onTimeRate * 100) : [],
        itemStyle: {
          color: '#52c41a',
        },
      },
    ],
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>数据看板</h1>
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日订单"
              value={overview?.todayOrders || 0}
              styles={{ content: { color: '#3f8600' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="运输中订单"
              value={overview?.shippingOrders || 0}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成订单"
              value={overview?.completedOrders || 0}
              styles={{ content: { color: '#cf1322' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日金额"
              value={formatAmount(overview?.todayAmount || 0)}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card>
            <Tabs
              activeKey={mapTab}
              onChange={(key) => setMapTab(key as 'count' | 'time')}
              items={[
                {
                  key: 'count',
                  label: '订单数',
                  children: (
                    <div style={{ height: '400px' }}>
                      <MapComponent
                        center={{ lng: 116.397428, lat: 39.90923 }}
                        zoom={10}
                        style={{ height: '100%' }}
                        onMapReady={(map) => {
                          // 保存地图实例引用
                          mapInstanceRef.current = map;
                          
                          // 如果当前是热力图标签页且有数据，立即创建热力图
                          if (mapTab === 'count' && window.AMap && heatmapData.length > 0) {
                            // 检查 Heatmap 插件是否已加载
                            if (!window.AMap.Heatmap) {
                              console.error('热力图插件未加载，请检查 AMap.Heatmap 插件配置');
                              return;
                            }
                            
                            const heatmap = new window.AMap.Heatmap(map, {
                              radius: 25,
                              opacity: [0, 0.8],
                            });
                            
                            // 高德地图热力图数据格式：[[lng, lat, count], ...]
                            heatmap.setDataSet({
                              data: heatmapData,
                              max: 100,
                            });
                            
                            heatmapRef.current = heatmap;

                            // 调整视野以显示所有数据点
                            const bounds = new window.AMap.Bounds();
                            heatmapData.forEach((point) => {
                              // point 现在是数组格式 [lng, lat, count]
                              bounds.extend([point[0], point[1]]);
                            });
                            if (bounds.getSouthWest() && bounds.getNorthEast()) {
                              map.setBounds(bounds);
                            }
                          }
                        }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'time',
                  label: '平均时效',
                  children: (
                    <div style={{ height: '400px' }}>
                      <MapComponent
                        center={{ lng: 116.397428, lat: 39.90923 }}
                        zoom={10}
                        style={{ height: '100%' }}
                        onMapReady={(map) => {
                          // 显示配送区域和时效信息
                          if (window.AMap && zoneStats.length > 0) {
                            // TODO: 可以在这里添加区域标记显示时效
                            map.setFitView();
                          }
                        }}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts
              key="logistics-chart"
              option={logisticsChartOption}
              style={{ height: '400px' }}
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
