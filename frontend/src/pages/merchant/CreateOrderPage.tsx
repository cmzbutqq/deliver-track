import { useState, useEffect, useRef } from 'react'
import { Form, Input, InputNumber, Select, Button, message, Row, Col, Space, Alert, Tag } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { orderService } from '@/services/orderService'
import { logisticsService } from '@/services/logisticsService'
import { zoneService } from '@/services/zoneService'
import { LogisticsCompany, Location, DeliveryZone } from '@/types'
import AddressPicker from '@/components/merchant/AddressPicker'
import MapComponent from '@/components/map/MapComponent'
import { isPointInPolygon } from '@/utils/mapUtils'

const CreateOrderPage = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [logisticsCompanies, setLogisticsCompanies] = useState<LogisticsCompany[]>([])
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [destination, setDestination] = useState<Location | undefined>()
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone | null>(null)
  const mapRef = useRef<any>(null)
  const AMapRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const clickHandlerRef = useRef<any>(null)
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastMessageRef = useRef<{ content: string; timestamp: number } | null>(null)

  useEffect(() => {
    loadLogisticsCompanies().catch((error) => {
      message.error(`加载物流公司失败: ${error instanceof Error ? error.message : String(error)}`)
    })
    loadZones().catch((error) => {
      message.error(`加载配送区域失败: ${error instanceof Error ? error.message : String(error)}`)
    })
  }, [])

  const loadLogisticsCompanies = async () => {
    const data = await logisticsService.getLogisticsCompanies()
    if (!Array.isArray(data)) {
      throw new Error(`物流公司数据格式错误: 期望数组，实际得到 ${typeof data}. 数据: ${JSON.stringify(data)}`)
    }
    setLogisticsCompanies(data)
  }

  const loadZones = async () => {
    const zonesData = await zoneService.getZones()
    if (!Array.isArray(zonesData)) {
      throw new Error(`配送区域数据格式错误: 期望数组，实际得到 ${typeof zonesData}`)
    }
    setZones(zonesData)
  }

  // 检查坐标是否在配送区域内（仅坐标，不需要完整Location对象）
  const checkDeliveryZoneByCoords = (lng: number, lat: number): DeliveryZone | null => {
    if (!lng || !lat || zones.length === 0) {
      return null
    }

    const point = { lng, lat }

    for (const zone of zones) {
      if (zone.boundary && zone.boundary.coordinates && zone.boundary.coordinates[0]) {
        const polygon = zone.boundary.coordinates[0] as number[][]
        if (isPointInPolygon(point, polygon)) {
          return zone
        }
      }
    }

    return null
  }

  // 检查地址是否在配送区域内
  const checkDeliveryZone = (location: Location): DeliveryZone | null => {
    if (!location.lng || !location.lat) {
      return null
    }
    return checkDeliveryZoneByCoords(location.lng, location.lat)
  }

  // 显示消息（去重，相同消息在1秒内只显示一次）
  const showMessageOnce = (type: 'success' | 'error' | 'warning' | 'info', content: string) => {
    const now = Date.now()
    const lastMessage = lastMessageRef.current

    // 如果消息内容相同且时间间隔小于1秒，则不显示
    if (lastMessage && lastMessage.content === content && now - lastMessage.timestamp < 1000) {
      return
    }

    // 更新最后显示的消息
    lastMessageRef.current = { content, timestamp: now }

    // 显示消息
    message[type](content)
  }

  // 执行逆地理编码（带防抖）
  const performGeocode = (lng: number, lat: number, onSuccess: (location: Location, zone: DeliveryZone | null) => void, onError: (location: Location, zone: DeliveryZone | null, errorMsg: string) => void) => {
    // 清除之前的定时器
    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current)
    }

    // 先检查是否在配送区域内
    const zone = checkDeliveryZoneByCoords(lng, lat)
    
    // 如果不在配送区域内，直接返回错误，不进行逆地理编码
    if (!zone) {
      const location: Location = {
        lng,
        lat,
        address: `${lng.toFixed(6)}, ${lat.toFixed(6)}`,
      }
      setDestination(location)
      setDeliveryZone(null)
      onError(location, null, '该地址不在任何配送区域内')
      return
    }

    // 在配送区域内，延迟执行逆地理编码（防抖）
    geocodeTimerRef.current = setTimeout(() => {
      if (!geocoderRef.current) return

      geocoderRef.current.getAddress([lng, lat], (status: string, result: any) => {
        let location: Location
        if (status === 'complete' && result.info === 'OK') {
          location = {
            lng,
            lat,
            address: result.regeocode.formattedAddress,
          }
          setDestination(location)
          setDeliveryZone(zone)
          onSuccess(location, zone)
        } else {
          // 即使逆地理编码失败，如果坐标在配送区域内，也允许使用坐标
          location = {
            lng,
            lat,
            address: `${lng.toFixed(6)}, ${lat.toFixed(6)}`,
          }
          setDestination(location)
          setDeliveryZone(zone)
          const errorMsg = result?.info || '未知错误'
          onError(location, zone, errorMsg)
        }
      })
    }, 500) // 500ms 防抖延迟
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

        // 先检查是否在配送区域内，再进行逆地理编码
        performGeocode(
          lng,
          lat,
          (_location, zone) => {
            if (zone) {
              showMessageOnce('success', `地址选择成功，位于配送区域：${zone.name}`)
            }
          },
          (_location, zone) => {
            if (!zone) {
              showMessageOnce('error', '该地址不在任何配送区域内，无法创建订单')
            }
            // 在配送区域内但逆地理编码失败，静默处理
          }
        )

        // 标记拖拽事件（带防抖）
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getPosition()
          const newLng = pos.getLng()
          const newLat = pos.getLat()

          // 先检查是否在配送区域内，再进行逆地理编码（带防抖）
          performGeocode(
            newLng,
            newLat,
            (_location, zone) => {
              if (zone) {
                showMessageOnce('success', `地址已更新，位于配送区域：${zone.name}`)
              }
            },
            (_location, zone) => {
              if (!zone) {
                showMessageOnce('error', '该地址不在任何配送区域内，无法创建订单')
              }
              // 在配送区域内但逆地理编码失败，静默处理
            }
          )
        })
      }

      clickHandlerRef.current = clickHandler
      map.on('click', clickHandler)
    })
  }

  // 清理事件监听器和定时器
  useEffect(() => {
    return () => {
      if (mapRef.current && clickHandlerRef.current) {
        mapRef.current.off('click', clickHandlerRef.current)
      }
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      if (geocodeTimerRef.current) {
        clearTimeout(geocodeTimerRef.current)
        geocodeTimerRef.current = null
      }
    }
  }, [])

  const onFinish = async (values: any) => {
    if (!destination) {
      message.warning('请选择收货地址')
      return
    }

    // 再次检查配送范围（确保数据最新）
    const zone = checkDeliveryZone(destination)
    if (!zone) {
      showMessageOnce('error', '该地址不在任何配送区域内，无法创建订单')
      setDeliveryZone(null)
      return
    }
    setDeliveryZone(zone)

    setLoading(true)
    try {
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
      navigate('/merchant/orders')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建订单失败，请重试'
      message.error(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
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
                    // 先检查配送范围，再进行逆地理编码（如果需要）
                    const zone = checkDeliveryZoneByCoords(location.lng, location.lat)
                    setDeliveryZone(zone)
                    if (zone) {
                      // 在配送区域内，可以尝试获取详细地址
                      performGeocode(
                        location.lng,
                        location.lat,
                        (_updatedLocation, updatedZone) => {
                          if (updatedZone) {
                            showMessageOnce('success', `地址已更新，位于配送区域：${updatedZone.name}`)
                          }
                        },
                        (_updatedLocation, updatedZone) => {
                          if (!updatedZone) {
                            showMessageOnce('error', '该地址不在任何配送区域内，无法创建订单')
                          }
                        }
                      )
                    } else {
                      showMessageOnce('error', '该地址不在任何配送区域内，无法创建订单')
                    }
                  }
                }}
                onMapSelect={() => {
                  // 地图选点按钮点击时，提示用户点击地图
                  message.info('请在地图上点击选择收货地址')
                }}
              />
              {destination && (
                <div style={{ marginTop: 8 }}>
                  {deliveryZone ? (
                    <Alert
                      message={
                        <Space>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <span>该地址位于配送区域内</span>
                          <Tag color="success">{deliveryZone.name}</Tag>
                        </Space>
                      }
                      type="success"
                      showIcon={false}
                      style={{ marginTop: 8 }}
                    />
                  ) : (
                    <Alert
                      message={
                        <Space>
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                          <span>该地址不在任何配送区域内，无法创建订单</span>
                        </Space>
                      }
                      type="error"
                      showIcon={false}
                      style={{ marginTop: 8 }}
                      description={
                        zones.length > 0 ? (
                          <div>
                            <div style={{ marginTop: 4 }}>可用配送区域：</div>
                            <Space wrap style={{ marginTop: 4 }}>
                              {zones.map((zone) => (
                                <Tag key={zone.id}>{zone.name}</Tag>
                              ))}
                            </Space>
                          </div>
                        ) : (
                          <div style={{ marginTop: 4 }}>暂无可用配送区域，请先创建配送区域</div>
                        )
                      }
                    />
                  )}
                </div>
              )}
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
