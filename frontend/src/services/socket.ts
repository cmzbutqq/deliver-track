import { io, Socket } from 'socket.io-client';
import type { LocationUpdate, StatusUpdate, DeliveryComplete } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private maxReconnectAttempts = 5;

  // 连接 Socket
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket 连接成功');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket 连接断开');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket 连接错误:', error);
    });

    return this.socket;
  }

  // 订阅订单
  subscribe(orderNo: string, callbacks: {
    onLocationUpdate?: (data: LocationUpdate) => void;
    onStatusUpdate?: (data: StatusUpdate) => void;
    onDeliveryComplete?: (data: DeliveryComplete) => void;
  }): void {
    if (!this.socket) {
      this.connect();
    }

    if (!this.socket) return;

    // 订阅订单
    this.socket.emit('subscribe', orderNo);

    // 监听位置更新
    if (callbacks.onLocationUpdate) {
      this.socket.on('location_update', (data: LocationUpdate) => {
        if (data.orderNo === orderNo) {
          callbacks.onLocationUpdate!(data);
        }
      });
    }

    // 监听状态更新
    if (callbacks.onStatusUpdate) {
      this.socket.on('status_update', (data: StatusUpdate) => {
        if (data.orderNo === orderNo) {
          callbacks.onStatusUpdate!(data);
        }
      });
    }

    // 监听配送完成
    if (callbacks.onDeliveryComplete) {
      this.socket.on('delivery_complete', (data: DeliveryComplete) => {
        if (data.orderNo === orderNo) {
          callbacks.onDeliveryComplete!(data);
        }
      });
    }
  }

  // 取消订阅
  unsubscribe(orderNo: string): void {
    if (this.socket) {
      this.socket.emit('unsubscribe', orderNo);
    }
  }

  // 断开连接
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;

