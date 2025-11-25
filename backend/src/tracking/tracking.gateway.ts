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
   */
  broadcastStatusUpdate(orderNo: string, data: any) {
    this.server.to(orderNo).emit('status_update', data);
  }

  /**
   * 广播订单配送完成
   */
  broadcastDeliveryComplete(orderNo: string, data: any) {
    this.server.to(orderNo).emit('delivery_complete', data);
  }
}

