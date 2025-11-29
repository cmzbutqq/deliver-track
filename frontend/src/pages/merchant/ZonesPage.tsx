import { useState, useEffect } from 'react'
import { List, Button, message, Row, Col, Modal } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { zoneService } from '@/services/zoneService'
import { DeliveryZone } from '@/types'
import ZoneEditor from '@/components/merchant/ZoneEditor'

const ZonesPage = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [loading, setLoading] = useState(false)
  const [editingZone, setEditingZone] = useState<DeliveryZone | undefined>()
  const [editorVisible, setEditorVisible] = useState(false)

  useEffect(() => {
    loadZones()
  }, [])

  const loadZones = async () => {
    setLoading(true)
    const data = await zoneService.getZones()
    setZones(data)
    setLoading(false)
  }

  const handleCreate = () => {
    setEditingZone(undefined)
    setEditorVisible(true)
  }

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone)
    setEditorVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个配送区域吗？',
      okType: 'danger',
      onOk: async () => {
        await zoneService.deleteZone(id)
        message.success('删除成功')
        loadZones()
      },
    })
  }

  const handleSave = async (data: {
    name: string
    boundary: {
      type: 'Polygon'
      coordinates: number[][][]
    }
    timeLimit: number
  }) => {
    if (editingZone) {
      await zoneService.updateZone(editingZone.id, data)
      message.success('更新成功')
    } else {
      await zoneService.createZone(data)
      message.success('创建成功')
    }
    setEditorVisible(false)
    loadZones()
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>配送区域管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建区域
        </Button>
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <List
            loading={loading}
            dataSource={zones}
            renderItem={(zone) => (
              <List.Item
                actions={[
                  <Button key="edit" type="link" onClick={() => handleEdit(zone)}>编辑</Button>,
                  <Button key="delete" type="link" danger onClick={() => handleDelete(zone.id)}>删除</Button>,
                ]}
              >
                <List.Item.Meta
                  title={zone.name}
                  description={`配送时效: ${zone.timeLimit}小时`}
                />
              </List.Item>
            )}
          />
        </Col>
        <Col xs={24} lg={8}>
          {editorVisible && (
            <ZoneEditor
              zone={editingZone}
              onSave={handleSave}
              onCancel={() => setEditorVisible(false)}
            />
          )}
        </Col>
      </Row>
    </div>
  )
}

export default ZonesPage

