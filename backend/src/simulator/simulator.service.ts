import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class SimulatorService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private trackingGateway: TrackingGateway,
  ) {}

  async onModuleInit() {
    console.log('✅ 轨迹模拟器已启动');
    // 启动时恢复所有运输中的订单
    await this.resumeAllShippingOrders();
  }

  /**
   * 定时任务：每 5 秒更新一次所有运输中的订单
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleRouteUpdate() {
    const shippingOrders = await this.prisma.order.findMany({
      where: { status: OrderStatus.SHIPPING },
      include: { route: true },
    });

    for (const order of shippingOrders) {
      if (!order.route) {
        continue;
      }

      await this.updateOrderLocation(order.id, order.orderNo, order.route.id);
    }
  }

  /**
   * 更新订单位置
   */
  private async updateOrderLocation(orderId: string, orderNo: string, routeId: string) {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return;
    }

    const points = route.points as number[][];
    const currentStep = route.currentStep;

    // 验证 points 数组有效性
    if (!Array.isArray(points) || points.length === 0) {
      console.error(`订单 ${orderNo} 的路径点数组无效: points=${JSON.stringify(points)}`);
      return;
    }

    // 验证 currentStep 有效性
    if (typeof currentStep !== 'number' || isNaN(currentStep) || currentStep < 0) {
      console.error(`订单 ${orderNo} 的当前步骤无效: currentStep=${currentStep}`);
      return;
    }

    // 如果已到达终点
    if (currentStep >= points.length - 1) {
      await this.completeDelivery(orderId, orderNo);
      return;
    }

    // 验证当前步骤的点是否存在
    if (!points[currentStep] || !Array.isArray(points[currentStep]) || points[currentStep].length < 2) {
      console.error(`订单 ${orderNo} 的路径点 ${currentStep} 无效: ${JSON.stringify(points[currentStep])}`);
      return;
    }

    const lng = points[currentStep][0];
    const lat = points[currentStep][1];

    // 验证坐标有效性
    if (typeof lng !== 'number' || typeof lat !== 'number' ||
        isNaN(lng) || isNaN(lat) ||
        !isFinite(lng) || !isFinite(lat)) {
      console.error(`订单 ${orderNo} 的路径点 ${currentStep} 坐标无效: lng=${lng} (${typeof lng}), lat=${lat} (${typeof lat})`);
      return;
    }

    // 验证坐标范围（中国大致范围：经度 73-135，纬度 18-54）
    if (lng < 73 || lng > 135 || lat < 18 || lat > 54) {
      console.error(`订单 ${orderNo} 的路径点 ${currentStep} 坐标超出中国范围: lng=${lng}, lat=${lat}`);
      return;
    }

    // 获取当前位置
    const currentLocation = {
      lng,
      lat,
    };

    // 更新订单当前位置
    await this.prisma.order.update({
      where: { id: orderId },
      data: { currentLocation },
    });

    // 更新路径步骤
    await this.prisma.route.update({
      where: { id: routeId },
      data: { currentStep: currentStep + 1 },
    });

    // 通过 WebSocket 广播位置更新
    this.trackingGateway.broadcastLocationUpdate(orderNo, {
      orderNo,
      location: currentLocation,
      progress: ((currentStep + 1) / points.length) * 100,
    });

    // 在关键节点更新时间线
    if (currentStep === Math.floor(points.length * 0.3)) {
      await this.prisma.logisticsTimeline.create({
        data: {
          orderId,
          status: '运输中',
          description: '包裹正在运输途中',
        },
      });
    } else if (currentStep === Math.floor(points.length * 0.7)) {
      await this.prisma.logisticsTimeline.create({
        data: {
          orderId,
          status: '派送中',
          description: '包裹已到达目的地城市，正在派送',
        },
      });
    }
  }

  /**
   * 完成配送
   */
  private async completeDelivery(orderId: string, orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return;
    }

    const destination = order.destination as any;

    // 验证目的地坐标有效性
    if (!destination || typeof destination.lng !== 'number' || typeof destination.lat !== 'number' ||
        isNaN(destination.lng) || isNaN(destination.lat) ||
        !isFinite(destination.lng) || !isFinite(destination.lat)) {
      console.error(`订单 ${orderNo} 的目的地坐标无效: ${JSON.stringify(destination)}`);
      return;
    }

    // 更新订单状态
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        currentLocation: { lng: destination.lng, lat: destination.lat },
        actualTime: new Date(),
      },
    });

    // 添加签收时间线
    await this.prisma.logisticsTimeline.create({
      data: {
        orderId,
        status: '已签收',
        description: '包裹已成功签收',
        location: destination.address,
      },
    });

    // 广播状态更新
    this.trackingGateway.broadcastStatusUpdate(orderNo, {
      orderNo,
      status: OrderStatus.DELIVERED,
      message: '包裹已成功签收',
    });

    console.log(`📦 订单 ${orderNo} 已完成配送`);
  }

  /**
   * 恢复所有运输中的订单
   */
  private async resumeAllShippingOrders() {
    const shippingOrders = await this.prisma.order.findMany({
      where: { status: OrderStatus.SHIPPING },
      include: { route: true },
    });

    console.log(`🔄 恢复 ${shippingOrders.length} 个运输中的订单`);
  }

  /**
   * 手动触发订单配送（用于测试）
   */
  async triggerDelivery(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { route: true },
    });

    if (!order || !order.route) {
      throw new Error('订单或路径不存在');
    }

    await this.updateOrderLocation(orderId, order.orderNo, order.route.id);
  }
}
