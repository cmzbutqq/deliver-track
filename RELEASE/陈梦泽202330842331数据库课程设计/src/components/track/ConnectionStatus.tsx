import { useEffect, useState } from 'react'
import { Alert } from 'antd'
import { websocketService } from '@/services/websocketService'

const ConnectionStatus = () => {
  const [connected, setConnected] = useState(true)
  const [reconnecting, setReconnecting] = useState(false)

  useEffect(() => {
    const checkConnection = () => {
      const isConnected = websocketService.isConnected()
      setConnected(isConnected)
      setReconnecting(!isConnected && websocketService.isConnected !== undefined)
    }

    const interval = setInterval(checkConnection, 1000)

    return () => clearInterval(interval)
  }, [])

  if (connected) {
    return null
  }

  if (reconnecting) {
    return (
      <Alert
        message="连接已断开，正在重连..."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
    )
  }

  return (
    <Alert
      message="连接失败，请刷新页面"
      type="error"
      showIcon
      style={{ marginBottom: 16 }}
    />
  )
}

export default ConnectionStatus

