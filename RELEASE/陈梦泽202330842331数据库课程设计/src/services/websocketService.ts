import { io, Socket } from 'socket.io-client'
import { LocationUpdateEvent, StatusUpdateEvent, DeliveryCompleteEvent } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

class WebSocketService {
  private socket: Socket | null = null
  private maxReconnectAttempts = 5
  private reconnectTimeouts: ReturnType<typeof setTimeout>[] = []

  connect() {
    if (this.socket?.connected) {
      return
    }

    this.socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    this.socket.on('connect', () => {
      console.log('WebSocket 连接成功')
      this.clearReconnectTimeouts()
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket 连接断开')
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket 连接错误', error)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.clearReconnectTimeouts()
  }

  subscribe(orderNo: string) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe', orderNo)
    } else {
      console.warn('WebSocket 未连接，无法订阅')
    }
  }

  unsubscribe(orderNo: string) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', orderNo)
    }
  }

  onLocationUpdate(callback: (data: LocationUpdateEvent) => void) {
    if (this.socket) {
      this.socket.on('location_update', callback)
    }
  }

  offLocationUpdate(callback: (data: LocationUpdateEvent) => void) {
    if (this.socket) {
      this.socket.off('location_update', callback)
    }
  }

  onStatusUpdate(callback: (data: StatusUpdateEvent) => void) {
    if (this.socket) {
      this.socket.on('status_update', callback)
    }
  }

  offStatusUpdate(callback: (data: StatusUpdateEvent) => void) {
    if (this.socket) {
      this.socket.off('status_update', callback)
    }
  }

  onDeliveryComplete(callback: (data: DeliveryCompleteEvent) => void) {
    if (this.socket) {
      this.socket.on('delivery_complete', callback)
    }
  }

  offDeliveryComplete(callback: (data: DeliveryCompleteEvent) => void) {
    if (this.socket) {
      this.socket.off('delivery_complete', callback)
    }
  }

  onError(callback: (error: { message: string }) => void) {
    if (this.socket) {
      this.socket.on('error', callback)
    }
  }

  offError(callback: (error: { message: string }) => void) {
    if (this.socket) {
      this.socket.off('error', callback)
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // 发送控制台日志到后端
  sendConsoleLog(level: string, args: any[]) {
    if (this.socket?.connected) {
      this.socket.emit('console_log', {
        level,
        args: args.map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2)
            } catch {
              return String(arg)
            }
          }
          return String(arg)
        }),
        timestamp: new Date().toISOString(),
      })
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }

  private clearReconnectTimeouts() {
    this.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout))
    this.reconnectTimeouts = []
  }
}

export const websocketService = new WebSocketService()

