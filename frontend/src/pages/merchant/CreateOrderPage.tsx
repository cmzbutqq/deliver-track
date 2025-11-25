import { useState, useEffect, useRef } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, App, AutoComplete } from 'antd';
import { useNavigate } from 'react-router-dom';
import AMapLoader from '@amap/amap-jsapi-loader';
import { orderApi, logisticsCompanyApi } from '../../services/api';
import MapComponent from '../../components/MapComponent';
import type { CreateOrderDto, LogisticsCompany, Location } from '../../types';

export default function CreateOrderPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [logisticsCompanies, setLogisticsCompanies] = useState<LogisticsCompany[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [addressOptions, setAddressOptions] = useState<Array<{ value: string; label: string; location?: Location }>>([]);
  const [searching, setSearching] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const placeSearchRef = useRef<any>(null);

  useEffect(() => {
    loadLogisticsCompanies();
    initPlaceSearch();
  }, []);

  const initPlaceSearch = async () => {
    try {
      const AMap = await AMapLoader.load({
        key: import.meta.env.VITE_AMAP_KEY || '',
        securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JSCODE || '',
        version: '2.0',
        plugins: ['AMap.PlaceSearch'],
      });

      placeSearchRef.current = new AMap.PlaceSearch({
        city: '北京',
        citylimit: true,
      });
    } catch (error) {
      console.error('地址搜索初始化失败:', error);
    }
  };

  const loadLogisticsCompanies = async () => {
    try {
      const response = await logisticsCompanyApi.getList();
      setLogisticsCompanies(response.data);
    } catch (error) {
      message.error('加载物流公司失败');
    }
  };

  const handleMapClick = (e: any) => {
    const { lng, lat } = e.lnglat;
    setSelectedLocation({ lng, lat });
    form.setFieldsValue({
      destinationLng: lng,
      destinationLat: lat,
    });
  };

  const handleMapReady = (map: any) => {
    mapInstanceRef.current = map;
    map.on('click', handleMapClick);
  };

  const handleAddressSearch = (value: string) => {
    if (!value || !placeSearchRef.current) {
      setAddressOptions([]);
      return;
    }

    setSearching(true);
    placeSearchRef.current.search(value, (status: string, result: any) => {
      setSearching(false);
      if (status === 'complete' && result.poiList) {
        const options = result.poiList.pois.map((poi: any) => ({
          value: poi.name,
          label: `${poi.name} - ${poi.address}`,
          location: {
            lng: poi.location.lng,
            lat: poi.location.lat,
            address: poi.address || poi.name,
          },
        }));
        setAddressOptions(options);
      } else {
        setAddressOptions([]);
      }
    });
  };

  const handleAddressSelect = (value: string, option: any) => {
    if (option.location) {
      setSelectedLocation(option.location);
      form.setFieldsValue({
        receiverAddress: option.label.split(' - ')[1] || option.value,
      });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter([option.location.lng, option.location.lat]);
        mapInstanceRef.current.setZoom(15);
      }
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const destination: Location = selectedLocation || {
        lng: values.destinationLng || 116.397428,
        lat: values.destinationLat || 39.90923,
        address: values.receiverAddress,
      };

      const createDto: CreateOrderDto = {
        logistics: values.logistics,
        receiverName: values.receiverName,
        receiverPhone: values.receiverPhone,
        receiverAddress: values.receiverAddress,
        destination,
        productName: values.productName,
        productQuantity: values.productQuantity,
        amount: values.amount,
      };
      await orderApi.create(createDto);
      message.success('创建订单成功');
      navigate('/merchant/orders');
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1>创建订单</h1>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ marginTop: 24 }}
      >
        <Form.Item
          name="logistics"
          label="物流公司"
          rules={[{ required: true, message: '请选择物流公司' }]}
        >
          <Select placeholder="选择物流公司">
            {logisticsCompanies.map((company) => (
              <Select.Option key={company.id} value={company.name}>
                {company.name} ({company.timeLimit}小时)
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="receiverName"
          label="收货人姓名"
          rules={[{ required: true, message: '请输入收货人姓名' }]}
        >
          <Input placeholder="收货人姓名" />
        </Form.Item>

        <Form.Item
          name="receiverPhone"
          label="收货人电话"
          rules={[{ required: true, message: '请输入收货人电话' }]}
        >
          <Input placeholder="收货人电话" />
        </Form.Item>

        <Form.Item
          name="receiverAddress"
          label="收货地址"
          rules={[{ required: true, message: '请输入收货地址' }]}
        >
          <AutoComplete
            options={addressOptions}
            onSearch={handleAddressSearch}
            onSelect={handleAddressSelect}
            placeholder="搜索地址或直接输入"
            notFoundContent={searching ? '搜索中...' : '未找到地址'}
          />
        </Form.Item>

        <Form.Item label="地图选点">
          <MapComponent
            center={selectedLocation || { lng: 116.397428, lat: 39.90923 }}
            markers={
              selectedLocation
                ? [
                    {
                      position: selectedLocation,
                      title: '收货地址',
                      color: 'red',
                    },
                  ]
                : []
            }
            onMapReady={handleMapReady}
            style={{ height: '400px' }}
          />
          <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
            点击地图选择收货地址位置
            {selectedLocation && (
              <span>
                {' '}
                已选择: {selectedLocation.lng.toFixed(6)}, {selectedLocation.lat.toFixed(6)}
              </span>
            )}
          </div>
        </Form.Item>

        <Form.Item
          name="productName"
          label="商品名称"
          rules={[{ required: true, message: '请输入商品名称' }]}
        >
          <Input placeholder="商品名称" />
        </Form.Item>

        <Form.Item
          name="productQuantity"
          label="商品数量"
          rules={[{ required: true, message: '请输入商品数量' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} placeholder="商品数量" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="订单金额"
          rules={[{ required: true, message: '请输入订单金额' }]}
        >
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="订单金额" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              创建订单
            </Button>
            <Button onClick={() => navigate('/merchant/orders')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}

