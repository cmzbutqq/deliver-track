import { useState, useEffect } from 'react'
import { Input, Button, Space } from 'antd'
import { EnvironmentOutlined } from '@ant-design/icons'
import { Location } from '@/types'

interface AddressPickerProps {
  value?: Location
  onChange?: (location: Location) => void
  onMapSelect?: () => void
}

const AddressPicker = ({ value, onChange, onMapSelect }: AddressPickerProps) => {
  const [address, setAddress] = useState(value?.address || '')

  // 同步外部 value 变化
  useEffect(() => {
    if (value?.address) {
      setAddress(value.address)
    }
  }, [value])

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value
    setAddress(newAddress)
    // TODO: 触发自动补全，调用 onChange
  }

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        placeholder="请输入收货地址或点击地图选点"
        value={address}
        onChange={handleAddressChange}
        style={{ flex: 1 }}
      />
      <Button
        icon={<EnvironmentOutlined />}
        onClick={onMapSelect}
      >
        地图选点
      </Button>
    </Space.Compact>
  )
}

export default AddressPicker

