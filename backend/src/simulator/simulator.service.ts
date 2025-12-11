import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { OrderStatus } from '@prisma/client';

interface OrderTimer {
  orderId: string;
  orderNo: string;
  routeId: string;
  timeouts: NodeJS.Timeout[];
  startTime: number; // 订单开始配送的时间（毫秒时间戳）
}

@Injectable()
export class SimulatorService implements OnModuleInit {
  // 存储每个订单的定时器
  private orderTimers = new Map<string, OrderTimer>();

  // 时间加速倍率：1秒对应360秒（6分钟）的实际配送时间
  // 例如：实际配送需要3600秒（1小时），演示时只需要10秒
  private readonly SPEED_FACTOR = 900;

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
   * 启动订单的配送定时器
   * 在订单发货时调用
   */
  async startOrderTimer(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { route: true },
    });

    if (!order || !order.route || order.status !== OrderStatus.SHIPPING) {
      return;
    }

    // 如果已经有定时器，先清除
    this.stopOrderTimer(orderId);

    const route = order.route;
    const timeArray = route.timeArray as number[] | null;

    if (!timeArray || !Array.isArray(timeArray) || timeArray.length === 0) {
      console.warn(`订单 ${order.orderNo} 没有timeArray，使用旧逻辑`);
      // 如果没有timeArray，使用旧的固定间隔逻辑（向后兼容）
      return;
    }

    const points = route.points as number[][];
    if (timeArray.length !== points.length) {
      console.warn(`订单 ${order.orderNo} 的timeArray长度(${timeArray.length})与points长度(${points.length})不匹配`);
      return;
    }

    const startTime = Date.now();
    const timer: OrderTimer = {
      orderId,
      orderNo: order.orderNo,
      routeId: route.id,
      timeouts: [],
      startTime,
    };

    // 为每个路径点创建定时器（使用累计延迟）
    let cumulativeDelay = 0; // 累计延迟（毫秒）
    for (let i = 1; i < timeArray.length; i++) {
      const delta_t = timeArray[i] - timeArray[i - 1]; // 时间差（秒，实际配送时间）
      const interval = Math.max(delta_t / this.SPEED_FACTOR, 0.1); // 实际更新间隔（秒），最小0.1秒
      const delay = interval * 1000; // 转换为毫秒
      cumulativeDelay += delay; // 累计延迟

      const timeout = setTimeout(async () => {
        try {
          await this.updateOrderLocationToStep(orderId, order.orderNo, route.id, i);
        } catch (error) {
          console.error(`更新订单 ${order.orderNo} 到步骤 ${i} 失败:`, error);
        }
      }, cumulativeDelay);

      timer.timeouts.push(timeout);
    }

    this.orderTimers.set(orderId, timer);
    console.log(`🚀 启动订单 ${order.orderNo} 的配送定时器，共 ${timeArray.length - 1} 个步骤`);
  }

  /**
   * 停止订单的配送定时器
   */
  stopOrderTimer(orderId: string) {
    const timer = this.orderTimers.get(orderId);
    if (timer) {
      timer.timeouts.forEach((timeout) => clearTimeout(timeout));
      this.orderTimers.delete(orderId);
    }
  }

  /**
   * 更新订单位置到指定步骤
   */
  private async updateOrderLocationToStep(
    orderId: string,
    orderNo: string,
    routeId: string,
    targetStep: number,
  ) {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return;
    }

    const points = route.points as number[][];
    const timeArray = route.timeArray as number[] | null;

    // 验证 points 数组有效性
    if (!Array.isArray(points) || points.length === 0) {
      throw new Error(`订单 ${orderNo} 的路径点数组无效: points=${JSON.stringify(points)}`);
    }

    // 验证 targetStep 有效性
    if (typeof targetStep !== 'number' || isNaN(targetStep) || targetStep < 0 || targetStep >= points.length) {
      throw new Error(`订单 ${orderNo} 的目标步骤无效: targetStep=${targetStep}, points.length=${points.length}`);
    }

    // 如果已到达终点
    if (targetStep >= points.length - 1) {
      await this.completeDelivery(orderId, orderNo);
      return;
    }

    // 验证目标步骤的点是否存在
    if (!points[targetStep] || !Array.isArray(points[targetStep]) || points[targetStep].length < 2) {
      throw new Error(`订单 ${orderNo} 的路径点 ${targetStep} 无效: ${JSON.stringify(points[targetStep])}`);
    }

    const lng = points[targetStep][0];
    const lat = points[targetStep][1];

    // 验证坐标有效性
    if (typeof lng !== 'number' || typeof lat !== 'number' ||
        isNaN(lng) || isNaN(lat) ||
        !isFinite(lng) || !isFinite(lat)) {
      throw new Error(`订单 ${orderNo} 的路径点 ${targetStep} 坐标无效: lng=${lng} (${typeof lng}), lat=${lat} (${typeof lat})`);
    }

    // 验证坐标范围（中国大致范围：经度 73-135，纬度 18-54）
    if (lng < 73 || lng > 135 || lat < 18 || lat > 54) {
      throw new Error(`订单 ${orderNo} 的路径点 ${targetStep} 坐标超出中国范围: lng=${lng}, lat=${lat}`);
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
      data: { currentStep: targetStep },
    });

    // 计算进度（基于时间数组，如果可用）
    let progress = ((targetStep + 1) / points.length) * 100;
    if (timeArray && Array.isArray(timeArray) && timeArray.length === points.length) {
      const totalTime = timeArray[timeArray.length - 1];
      const currentTime = timeArray[targetStep];
      if (totalTime > 0) {
        progress = (currentTime / totalTime) * 100;
      }
    }

    // 通过 WebSocket 广播位置更新
    this.trackingGateway.broadcastLocationUpdate(orderNo, {
      orderNo,
      location: currentLocation,
      progress,
      currentStep: targetStep,
    });

    // 在关键节点更新时间线（基于时间进度，而非步骤数）
    if (timeArray && Array.isArray(timeArray) && timeArray.length === points.length) {
      const totalTime = timeArray[timeArray.length - 1];
      const currentTime = timeArray[targetStep];
      const timeProgress = totalTime > 0 ? currentTime / totalTime : 0;

      if (timeProgress >= 0.3 && timeProgress < 0.35) {
        // 检查是否已经创建过"运输中"时间线
        const existingTimeline = await this.prisma.logisticsTimeline.findFirst({
          where: {
            orderId,
            status: '运输中',
          },
        });
        if (!existingTimeline) {
          await this.prisma.logisticsTimeline.create({
            data: {
              orderId,
              status: '运输中',
              description: '包裹正在运输途中',
            },
          });
        }
      } else if (timeProgress >= 0.7 && timeProgress < 0.75) {
        // 检查是否已经创建过"派送中"时间线
        const existingTimeline = await this.prisma.logisticsTimeline.findFirst({
          where: {
            orderId,
            status: '派送中',
          },
        });
        if (!existingTimeline) {
          await this.prisma.logisticsTimeline.create({
            data: {
              orderId,
              status: '派送中',
              description: '包裹已到达目的地城市，正在派送',
            },
          });
        }
      }
    } else {
      // 向后兼容：基于步骤数
      if (targetStep === Math.floor(points.length * 0.3)) {
        await this.prisma.logisticsTimeline.create({
          data: {
            orderId,
            status: '运输中',
            description: '包裹正在运输途中',
          },
        });
      } else if (targetStep === Math.floor(points.length * 0.7)) {
        await this.prisma.logisticsTimeline.create({
          data: {
            orderId,
            status: '派送中',
            description: '包裹已到达目的地城市，正在派送',
          },
        });
      }
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
      throw new Error(`订单 ${orderNo} 的目的地坐标无效: ${JSON.stringify(destination)}`);
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
   * 计算已过时间，确定当前位置，然后启动定时器
   */
  private async resumeAllShippingOrders() {
    const shippingOrders = await this.prisma.order.findMany({
      where: { status: OrderStatus.SHIPPING },
      include: { route: true },
    });

    console.log(`🔄 恢复 ${shippingOrders.length} 个运输中的订单`);

    for (const order of shippingOrders) {
      if (!order.route) {
        continue;
      }

      try {
        const route = order.route;
        const timeArray = route.timeArray as number[] | null;

        if (!timeArray || !Array.isArray(timeArray) || timeArray.length === 0) {
          console.warn(`订单 ${order.orderNo} 没有timeArray，跳过恢复`);
          continue;
        }

        // 计算已过时间（秒）
        const elapsedSeconds = (Date.now() - order.createdAt.getTime()) / 1000;
        // 转换为实际配送时间（1秒对应SPEED_FACTOR秒）
        const elapsedDeliveryTime = elapsedSeconds * this.SPEED_FACTOR;

        // 找到应该到达的步骤
        let targetStep = 0;
        for (let i = 0; i < timeArray.length; i++) {
          if (timeArray[i] <= elapsedDeliveryTime) {
            targetStep = i;
          } else {
            break;
          }
        }

        // 如果已经到达终点
        if (targetStep >= timeArray.length - 1) {
          await this.completeDelivery(order.id, order.orderNo);
          continue;
        }

        // 更新当前位置到目标步骤
        await this.updateOrderLocationToStep(order.id, order.orderNo, route.id, targetStep);

        // 启动定时器，从当前步骤继续
        await this.startOrderTimerFromStep(order.id, targetStep);
      } catch (error) {
        console.error(`恢复订单 ${order.orderNo} 失败:`, error);
      }
    }
  }

  /**
   * 从指定步骤启动订单定时器
   */
  private async startOrderTimerFromStep(orderId: string, startStep: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { route: true },
    });

    if (!order || !order.route || order.status !== OrderStatus.SHIPPING) {
      return;
    }

    const route = order.route;
    const timeArray = route.timeArray as number[] | null;

    if (!timeArray || !Array.isArray(timeArray) || timeArray.length === 0) {
      return;
    }

    const points = route.points as number[][];
    if (timeArray.length !== points.length) {
      return;
    }

    // 如果已经有定时器，先清除
    this.stopOrderTimer(orderId);

    const startTime = Date.now();
    const timer: OrderTimer = {
      orderId,
      orderNo: order.orderNo,
      routeId: route.id,
      timeouts: [],
      startTime,
    };

    // 计算已过时间（秒）
    const elapsedSeconds = (Date.now() - order.createdAt.getTime()) / 1000;
    const elapsedDeliveryTime = elapsedSeconds * this.SPEED_FACTOR; // 转换为实际配送时间

    // 为剩余步骤创建定时器
    // 计算从"现在"到"该步骤应该触发的时间"的延迟
    for (let i = startStep + 1; i < timeArray.length; i++) {
      const targetTime = timeArray[i]; // 该步骤应该到达的时间（秒，实际配送时间）
      const remainingTime = targetTime - elapsedDeliveryTime; // 剩余时间（秒，实际配送时间）
      
      // 转换为演示时间：remainingTime / SPEED_FACTOR（秒），最小0.1秒
      const delay = Math.max(remainingTime / this.SPEED_FACTOR, 0.1) * 1000; // 转换为毫秒

      const timeout = setTimeout(async () => {
        try {
          await this.updateOrderLocationToStep(orderId, order.orderNo, route.id, i);
        } catch (error) {
          console.error(`更新订单 ${order.orderNo} 到步骤 ${i} 失败:`, error);
        }
      }, delay);

      timer.timeouts.push(timeout);
    }

    this.orderTimers.set(orderId, timer);
    console.log(`🚀 恢复订单 ${order.orderNo} 的配送定时器，从步骤 ${startStep} 继续，剩余 ${timeArray.length - startStep - 1} 个步骤`);
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

    const route = order.route;
    const currentStep = route.currentStep;
    const nextStep = currentStep + 1;

    if (nextStep >= (route.points as number[][]).length) {
      await this.completeDelivery(orderId, order.orderNo);
    } else {
      await this.updateOrderLocationToStep(orderId, order.orderNo, route.id, nextStep);
    }
  }
}
