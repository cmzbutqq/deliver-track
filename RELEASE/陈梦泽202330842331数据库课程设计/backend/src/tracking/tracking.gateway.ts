import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    console.log(`客户端已连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`客户端已断开: ${client.id}`);
  }

  /**
   * 客户端订阅订单追踪
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: { route: true },
    });

    if (!order) {
      client.emit('error', { message: '订单不存在' });
      return;
    }

    // 加入订单房间
    client.join(orderNo);
    console.log(`客户端 ${client.id} 订阅了订单 ${orderNo}`);

    // 发送当前位置
    if (order.currentLocation) {
      const progress = order.route
        ? ((order.route.currentStep + 1) / order.route.totalSteps) * 100
        : 0;
      
      client.emit('location_update', {
        orderNo,
        location: order.currentLocation,
        status: order.status,
        estimatedTime: order.estimatedTime,
        progress,
      });
    }
  }

  /**
   * 客户端取消订阅
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, orderNo: string) {
    client.leave(orderNo);
    console.log(`客户端 ${client.id} 取消订阅订单 ${orderNo}`);
  }

  /**
   * 广播位置更新（由模拟器调用）
   */
  broadcastLocationUpdate(orderNo: string, data: any) {
    this.server.to(orderNo).emit('location_update', data);
  }

  /**
   * 广播订单状态更新
   * 同时发送给订阅了该订单的房间和所有连接的客户端（用于数据看板）
   */
  broadcastStatusUpdate(orderNo: string, data: any) {
    // 发送给订阅了该订单的房间（用于实时追踪页面）
    this.server.to(orderNo).emit('status_update', data);
    // 同时广播给所有连接的客户端（用于数据看板）
    this.server.emit('status_update', data);
  }

  /**
   * 广播订单配送完成
   */
  broadcastDeliveryComplete(orderNo: string, data: any) {
    this.server.to(orderNo).emit('delivery_complete', data);
  }

  /**
   * 接收浏览器控制台日志并输出到后端控制台
   */
  @SubscribeMessage('console_log')
  handleConsoleLog(client: Socket, data: { level: string; args: string[]; timestamp: string }) {
    const { level, args, timestamp } = data;
    const timeStr = new Date(timestamp).toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
    const clientId = client.id.substring(0, 8);
    
    // 将字符串数组转换回原始格式（尝试解析 JSON）
    const parsedArgs = args.map(arg => {
      try {
        // 尝试解析 JSON
        return JSON.parse(arg);
      } catch {
        // 如果不是 JSON，返回原字符串
        return arg;
      }
    });
    
    // 根据日志级别输出到后端控制台，格式与浏览器控制台保持一致
    switch (level) {
      case 'error':
        console.error(`[${timeStr}] [浏览器 ${clientId}]`, ...parsedArgs);
        break;
      case 'warn':
        console.warn(`[${timeStr}] [浏览器 ${clientId}]`, ...parsedArgs);
        break;
      case 'info':
        console.info(`[${timeStr}] [浏览器 ${clientId}]`, ...parsedArgs);
        break;
      case 'debug':
        console.debug(`[${timeStr}] [浏览器 ${clientId}]`, ...parsedArgs);
        break;
      default:
        console.log(`[${timeStr}] [浏览器 ${clientId}]`, ...parsedArgs);
    }
  }
}

