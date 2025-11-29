import { useState, useEffect, useRef } from 'react'
import { Form, Input, InputNumber, Select, Button, message, Row, Col, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { orderService } from '@/services/orderService'
import { logisticsService } from '@/services/logisticsService'
import { LogisticsCompany, Location } from '@/types'
import AddressPicker from '@/components/merchant/AddressPicker'
import MapComponent from '@/components/map/MapComponent'

const CreateOrderPage = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [logisticsCompanies, setLogisticsCompanies] = useState<LogisticsCompany[]>([])
  const [destination, setDestination] = useState<Location | undefined>()
  const mapRef = useRef<any>(null)
  const AMapRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const clickHandlerRef = useRef<any>(null)

  useEffect(() => {
    loadLogisticsCompanies()
  }, [])

  const loadLogisticsCompanies = async () => {
    const data = await logisticsService.getLogisticsCompanies()
    if (!Array.isArray(data)) {
      throw new Error(`物流公司数据格式错误: 期望数组，实际得到 ${typeof data}. 数据: ${JSON.stringify(data)}`)
    }
    setLogisticsCompanies(data)
  }

  const handleMapReady = (map: any, AMap: any) => {
    mapRef.current = map
    AMapRef.current = AMap

    // 加载 Geocoder 插件
    AMap.plugin('AMap.Geocoder', () => {
      geocoderRef.current = new AMap.Geocoder()

      // 监听地图点击事件
      const clickHandler = (e: any) => {
        const { lng, lat } = e.lnglat

        // 清除之前的标记
        if (markerRef.current) {
          markerRef.current.setMap(null)
          markerRef.current = null
        }

        // 创建新标记
        markerRef.current = new AMap.Marker({
          position: [lng, lat],
          map: map,
          draggable: true,
          title: '选中位置',
        })

        // 逆地理编码获取地址
        geocoderRef.current.getAddress([lng, lat], (status: string, result: any) => {
          if (status === 'complete' && result.info === 'OK') {
            const location: Location = {
              lng,
              lat,
              address: result.regeocode.formattedAddress,
            }
            setDestination(location)
            message.success('地址选择成功')
          } else {
            // 记录详细的错误信息，便于调试
            console.error('逆地理编码失败:', {
              status,
              result,
              coordinates: { lng, lat },
              errorInfo: result?.info || '未知错误',
            })
            
            const location: Location = {
              lng,
              lat,
              address: `${lng.toFixed(6)}, ${lat.toFixed(6)}`,
            }
            setDestination(location)
            const errorMsg = result?.info || '未知错误'
            message.warning(`无法获取详细地址 (${errorMsg})，已使用坐标`)
          }
        })

        // 标记拖拽事件
        markerRef.current.on('dragend', (e: any) => {
          const pos = markerRef.current.getPosition()
          const newLng = pos.getLng()
          const newLat = pos.getLat()

          // 重新进行逆地理编码
          geocoderRef.current.getAddress([newLng, newLat], (status: string, result: any) => {
            if (status === 'complete' && result.info === 'OK') {
              const location: Location = {
                lng: newLng,
                lat: newLat,
                address: result.regeocode.formattedAddress,
              }
              setDestination(location)
            } else {
              // 记录详细的错误信息
              console.error('标记拖拽后逆地理编码失败:', {
                status,
                result,
                coordinates: { lng: newLng, lat: newLat },
                errorInfo: result?.info || '未知错误',
              })
              
              const location: Location = {
                lng: newLng,
                lat: newLat,
                address: `${newLng.toFixed(6)}, ${newLat.toFixed(6)}`,
              }
              setDestination(location)
            }
          })
        })
      }

      clickHandlerRef.current = clickHandler
      map.on('click', clickHandler)
    })
  }

  // 清理事件监听器
  useEffect(() => {
    return () => {
      if (mapRef.current && clickHandlerRef.current) {
        mapRef.current.off('click', clickHandlerRef.current)
      }
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
    }
  }, [])

  const onFinish = async (values: any) => {
    if (!destination) {
      message.warning('请选择收货地址')
      return
    }

    setLoading(true)
    await orderService.createOrder({
      receiverName: values.receiverName,
      receiverPhone: values.receiverPhone,
      receiverAddress: destination.address,
      productName: values.productName,
      productQuantity: values.productQuantity,
      amount: values.amount,
      destination: destination,
      logistics: values.logistics,
    })
    message.success('订单创建成功')
    setLoading(false)
    navigate('/merchant/orders')
  }

  return (
    <div>
      <h1>创建订单</h1>
      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
          >
            <Form.Item
              name="logistics"
              label="物流公司"
              rules={[{ required: true, message: '请选择物流公司' }]}
            >
              <Select placeholder="请选择物流公司">
                {logisticsCompanies.map((company) => (
                  <Select.Option key={company.id} value={company.name}>
                    {company.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="收货地址"
              rules={[{ required: true, message: '请选择收货地址' }]}
            >
              <AddressPicker
                value={destination}
                onChange={(location) => {
                  setDestination(location)
                  // 如果手动输入地址，更新地图标记
                  if (mapRef.current && AMapRef.current && location.lng && location.lat) {
                    if (markerRef.current) {
                      markerRef.current.setMap(null)
                    }
                    markerRef.current = new AMapRef.current.Marker({
                      position: [location.lng, location.lat],
                      map: mapRef.current,
                      draggable: true,
                      title: '选中位置',
                    })
                    mapRef.current.setCenter([location.lng, location.lat])
                    mapRef.current.setZoom(15)
                  }
                }}
                onMapSelect={() => {
                  // 地图选点按钮点击时，提示用户点击地图
                  message.info('请在地图上点击选择收货地址')
                }}
              />
            </Form.Item>

            <Form.Item
              name="receiverName"
              label="收货人姓名"
              rules={[{ required: true, message: '请输入收货人姓名' }]}
            >
              <Input placeholder="请输入收货人姓名" />
            </Form.Item>

            <Form.Item
              name="receiverPhone"
              label="收货人电话"
              rules={[
                { required: true, message: '请输入收货人电话' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' },
              ]}
            >
              <Input placeholder="请输入收货人电话" />
            </Form.Item>

        <Form.Item
          name="productName"
          label="商品名称"
          rules={[{ required: true, message: '请输入商品名称' }]}
        >
          <Input placeholder="请输入商品名称" />
        </Form.Item>

        <Form.Item
          name="productQuantity"
          label="商品数量"
          rules={[{ required: true, message: '请输入商品数量' }]}
        >
          <InputNumber min={1} placeholder="请输入商品数量" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="amount"
          label="订单金额"
          rules={[{ required: true, message: '请输入订单金额' }]}
        >
          <InputNumber
            min={0}
            step={0.01}
            placeholder="请输入订单金额"
            style={{ width: '100%' }}
          />
        </Form.Item>

            <Form.Item>
              <Space>
                <Button onClick={() => navigate('/merchant/orders')}>取消</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  提交
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Col>
        <Col xs={24} lg={10}>
          <div style={{ height: '500px' }}>
            <MapComponent
              id="create-order-map"
              plugins={['AMap.Geocoder']}
              onMapReady={handleMapReady}
            />
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default CreateOrderPage

