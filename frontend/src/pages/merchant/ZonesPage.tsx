import { useState, useEffect, useRef } from 'react';
import {
  Card,
  App,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Popconfirm,
  message as antdMessage,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import AMapLoader from '@amap/amap-jsapi-loader';
import { deliveryZoneApi } from '../../services/api';
import type { DeliveryZone } from '../../types';
import { formatDateTime } from '../../utils/format';

declare global {
  interface Window {
    AMap: any;
  }
}

export default function ZonesPage() {
  const { message } = App.useApp();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const polygonsRef = useRef<any[]>([]);

  useEffect(() => {
    loadZones();
    initMap();
    return () => {
      if (editorRef.current) {
        editorRef.current.close();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }
    };
  }, []);

  const initMap = async () => {
    if (!mapRef.current) return;

    try {
      const AMap = await AMapLoader.load({
        key: import.meta.env.VITE_AMAP_KEY || '',
        securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JSCODE || '',
        version: '2.0',
        plugins: [
          'AMap.Polygon',
          'AMap.PolygonEditor',
          'AMap.ToolBar',
          'AMap.Scale',
          'AMap.Geolocation',
        ],
      });

      const map = new AMap.Map(mapRef.current, {
        zoom: 10,
        center: [116.397428, 39.90923],
        viewMode: '3D',
      });

      map.addControl(new AMap.ToolBar());
      map.addControl(new AMap.Scale());

      mapInstanceRef.current = map;
      setMapLoading(false);

      // 加载现有区域
      renderZones();
    } catch (error) {
      console.error('地图加载失败:', error);
      setMapLoading(false);
    }
  };

  const loadZones = async () => {
    try {
      const response = await deliveryZoneApi.getList();
      setZones(response.data);
      renderZones();
    } catch (error) {
      message.error('加载配送区域失败');
    }
  };

  const renderZones = () => {
    if (!mapInstanceRef.current || !window.AMap) return;

    // 清除旧多边形
    polygonsRef.current.forEach((polygon) => {
      mapInstanceRef.current.remove(polygon);
    });
    polygonsRef.current = [];

    // 渲染所有区域
    zones.forEach((zone) => {
      if (
        zone.boundary &&
        typeof zone.boundary === 'object' &&
        'coordinates' in zone.boundary &&
        Array.isArray(zone.boundary.coordinates) &&
        Array.isArray(zone.boundary.coordinates[0]) &&
        zone.boundary.coordinates[0].length > 0
      ) {
        const boundary = zone.boundary as any;
        const path = boundary.coordinates[0].map((coord: number[]) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            return [coord[0], coord[1]];
          }
          return null;
        }).filter((p: any) => p !== null);
        
        if (path.length >= 3) {
          const polygon = new window.AMap.Polygon({
            path,
            strokeColor: '#FF33FF',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            fillColor: '#FF33FF',
            fillOpacity: 0.2,
          });
          mapInstanceRef.current.add(polygon);
          polygonsRef.current.push(polygon);

          // 添加点击事件
          polygon.on('click', () => {
            antdMessage.info(`区域: ${zone.name}`);
          });
        }
      }
    });
  };

  useEffect(() => {
    renderZones();
  }, [zones]);

  const startDrawing = () => {
    if (!mapInstanceRef.current || !window.AMap) return;

    setDrawing(true);
    const polygon = new window.AMap.Polygon({
      strokeColor: '#FF33FF',
      strokeWeight: 2,
      strokeOpacity: 0.8,
      fillColor: '#FF33FF',
      fillOpacity: 0.2,
    });

    mapInstanceRef.current.add(polygon);
    polygonRef.current = polygon;

    const editor = new window.AMap.PolygonEditor(mapInstanceRef.current, polygon);
    editor.open();
    editorRef.current = editor;

    // 监听编辑完成
    editor.on('adjust', () => {
      const path = polygon.getPath();
      if (path && path.length >= 3) {
        // 可以在这里实时更新预览
      }
    });

    // 监听编辑器关闭事件（用户完成编辑）
    editor.on('end', () => {
      const path = polygon.getPath();
      if (path && path.length >= 3) {
        finishDrawing();
      }
    });
  };

  const finishDrawing = () => {
    if (!polygonRef.current || !editorRef.current) return;

    const path = polygonRef.current.getPath();
    if (!path || path.length < 3) {
      message.warning('至少需要3个顶点才能创建区域');
      return;
    }

    setDrawing(false);
    editorRef.current.close();
    setModalVisible(true);

    // 将路径转换为 GeoJSON 格式
    const coordinates = [[path.map((p: any) => [p.lng, p.lat])]];
    form.setFieldsValue({
      boundary: {
        type: 'Polygon',
        coordinates,
      },
    });
  };

  const handleCreate = async (values: any) => {
    try {
      const createData = {
        name: values.name,
        boundary: values.boundary,
        timeLimit: values.timeLimit,
      };
      await deliveryZoneApi.create(createData);
      message.success('创建配送区域成功');
      setModalVisible(false);
      form.resetFields();
      if (polygonRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.remove(polygonRef.current);
        polygonRef.current = null;
      }
      loadZones();
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    form.setFieldsValue({
      name: zone.name,
      timeLimit: zone.timeLimit,
    });
    setModalVisible(true);
  };

  const handleUpdate = async (values: any) => {
    if (!editingZone) return;

    try {
      await deliveryZoneApi.update(editingZone.id, values);
      message.success('更新配送区域成功');
      setModalVisible(false);
      setEditingZone(null);
      form.resetFields();
      loadZones();
    } catch (error: any) {
      message.error(error.response?.data?.message || '更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deliveryZoneApi.delete(id);
      message.success('删除配送区域成功');
      loadZones();
    } catch (error: any) {
      message.error('删除失败');
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingZone(null);
    form.resetFields();
    if (polygonRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.remove(polygonRef.current);
      polygonRef.current = null;
    }
    if (editorRef.current) {
      editorRef.current.close();
    }
    setDrawing(false);
  };

  const columns = [
    {
      title: '区域名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '配送时效（小时）',
      dataIndex: 'timeLimit',
      key: 'timeLimit',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DeliveryZone) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个配送区域吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>配送区域管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={startDrawing}
          disabled={drawing}
        >
          绘制新区域
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card style={{ flex: 1 }}>
          <div style={{ marginBottom: 16 }}>
            <p>在地图上绘制配送区域：</p>
            <ol>
              <li>点击"绘制新区域"按钮</li>
              <li>在地图上点击添加顶点</li>
              <li>拖拽顶点调整形状</li>
              <li>点击编辑器外部或按ESC完成绘制</li>
              <li>填写区域信息并保存</li>
            </ol>
            {drawing && (
              <div style={{ marginTop: 8 }}>
                <p style={{ color: '#1890ff' }}>
                  正在绘制中... 点击编辑器外部完成绘制
                </p>
                <Button
                  type="primary"
                  size="small"
                  onClick={finishDrawing}
                  style={{ marginTop: 8 }}
                >
                  完成绘制
                </Button>
              </div>
            )}
          </div>
          <div
            ref={mapRef}
            style={{ width: '100%', height: '600px', border: '1px solid #d9d9d9' }}
          />
        </Card>

        <Card style={{ width: 400 }}>
          <h3>配送区域列表</h3>
          <Table
            columns={columns}
            dataSource={zones}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      </div>

      <Modal
        title={editingZone ? '编辑配送区域' : '创建配送区域'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingZone ? handleUpdate : handleCreate}
        >
          <Form.Item
            name="name"
            label="区域名称"
            rules={[{ required: true, message: '请输入区域名称' }]}
          >
            <Input placeholder="区域名称" />
          </Form.Item>

          <Form.Item
            name="timeLimit"
            label="配送时效（小时）"
            rules={[{ required: true, message: '请输入配送时效' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="配送时效" />
          </Form.Item>

          {!editingZone && (
            <Form.Item name="boundary" hidden>
              <Input />
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingZone ? '更新' : '创建'}
              </Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
