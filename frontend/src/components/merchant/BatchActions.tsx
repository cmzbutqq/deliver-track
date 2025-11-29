import { Button, Space, Modal, message } from 'antd'
import { useState } from 'react'
import { orderService } from '@/services/orderService'

interface BatchActionsProps {
  selectedOrderIds: string[]
  onSuccess?: () => void
}

const BatchActions = ({ selectedOrderIds, onSuccess }: BatchActionsProps) => {
  const [loading, setLoading] = useState(false)

  const handleBatchShip = () => {
    if (selectedOrderIds.length === 0) {
      message.warning('请选择要发货的订单')
      return
    }

    Modal.confirm({
      title: '确认批量发货',
      content: `确定要对 ${selectedOrderIds.length} 个订单进行批量发货吗？`,
      onOk: async () => {
        setLoading(true)
        const result = await orderService.batchShip(selectedOrderIds)
        message.success(`成功发货 ${result.shipped} 个订单`)
        if (result.errors && result.errors.length > 0) {
          message.warning(`失败 ${result.failed} 个订单`)
        }
        onSuccess?.()
        setLoading(false)
      },
    })
  }

  const handleBatchDelete = () => {
    if (selectedOrderIds.length === 0) {
      message.warning('请选择要删除的订单')
      return
    }

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除 ${selectedOrderIds.length} 个订单吗？此操作不可恢复！`,
      okType: 'danger',
      onOk: async () => {
        setLoading(true)
        const result = await orderService.batchDelete(selectedOrderIds)
        message.success(`成功删除 ${result.deleted} 个订单`)
        onSuccess?.()
        setLoading(false)
      },
    })
  }

  const handleExportCSV = () => {
    if (selectedOrderIds.length === 0) {
      message.warning('请选择要导出的订单')
      return
    }

    // TODO: 实现 CSV 导出功能
    message.info('CSV 导出功能开发中')
  }

  return (
    <Space>
      <Button
        type="primary"
        onClick={handleBatchShip}
        disabled={selectedOrderIds.length === 0 || loading}
      >
        批量发货
      </Button>
      <Button
        danger
        onClick={handleBatchDelete}
        disabled={selectedOrderIds.length === 0 || loading}
      >
        批量删除
      </Button>
      <Button
        onClick={handleExportCSV}
        disabled={selectedOrderIds.length === 0 || loading}
      >
        导出 CSV
      </Button>
    </Space>
  )
}

export default BatchActions

