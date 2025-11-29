import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { CreateOrderDto, UpdateOrderDto, ShipOrderDto } from './dto/order.dto';
import { RouteQueueService } from './services/route-queue.service';
import { LogisticsCompaniesService } from '../logistics-companies/logistics-companies.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private routeQueueService: RouteQueueService,
    private logisticsCompaniesService: LogisticsCompaniesService,
    @Inject(forwardRef(() => TrackingGateway))
    private trackingGateway: TrackingGateway,
  ) {}

  async create(merchantId: string, dto: CreateOrderDto) {
    // 生成订单号
    const orderNo = this.generateOrderNo();

    // 获取商家信息（发货地址）
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { address: true },
    });

    // 使用商家发货地址或默认地址
    const origin = merchant?.address || dto.origin || {
      lng: 116.407396,
      lat: 39.904211,
      address: '北京市东城区天安门广场',
    };

    // 获取物流公司时效
    const logisticsCompany = await this.logisticsCompaniesService.findByName(
      dto.logistics || '顺丰速运',
    );
    const timeLimit = logisticsCompany?.timeLimit || 48; // 默认 48 小时

    // 计算预计送达时间
    const estimatedTime = new Date(
      Date.now() + timeLimit * 60 * 60 * 1000,
    );

    const order = await this.prisma.order.create({
      data: {
        orderNo,
        merchantId,
        status: OrderStatus.PENDING,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        receiverAddress: dto.receiverAddress,
        productName: dto.productName,
        productQuantity: dto.productQuantity,
        amount: dto.amount,
        origin,
        destination: dto.destination,
        logistics: dto.logistics || '顺丰速运',
        estimatedTime,
      },
    });

    // 创建时间线记录
    await this.prisma.logisticsTimeline.create({
      data: {
        orderId: order.id,
        status: '订单已创建',
        description: '商家已创建订单',
        location: (origin as any).address,
      },
    });

    return order;
  }

  async findAll(merchantId: string, status?: OrderStatus, sortBy?: string, sortOrder?: string) {
    const where: any = { merchantId };
    if (status) {
      where.status = status;
    }

    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    return this.prisma.order.findMany({
      where,
      orderBy,
      include: {
        route: true,
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        route: true,
        timeline: {
          orderBy: { timestamp: 'desc' },
        },
        merchant: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return order;
  }

  async findByOrderNo(orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        route: true,
        timeline: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return order;
  }

  async update(id: string, merchantId: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.merchantId !== merchantId) {
      throw new BadRequestException('无权限操作此订单');
    }

    return this.prisma.order.update({
      where: { id },
      data: dto,
    });
  }

  async ship(id: string, merchantId: string, dto?: ShipOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.merchantId !== merchantId) {
      throw new BadRequestException('无权限操作此订单');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('订单状态不允许发货');
    }

    // 获取路径规划
    const origin = order.origin as any;
    const destination = order.destination as any;

    // 验证 origin 坐标有效性
    if (!origin || typeof origin.lng !== 'number' || typeof origin.lat !== 'number' ||
        isNaN(origin.lng) || isNaN(origin.lat) ||
        !isFinite(origin.lng) || !isFinite(origin.lat)) {
      throw new BadRequestException(`订单起点坐标无效: ${JSON.stringify(origin)}`);
    }

    // 验证 destination 坐标有效性
    if (!destination || typeof destination.lng !== 'number' || typeof destination.lat !== 'number' ||
        isNaN(destination.lng) || isNaN(destination.lat) ||
        !isFinite(destination.lng) || !isFinite(destination.lat)) {
      throw new BadRequestException(`订单终点坐标无效: ${JSON.stringify(destination)}`);
    }

    // 使用路径队列服务获取路径（带限流和重试）
    const routePoints = await this.routeQueueService.getRoute(
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    );

    // 验证 routePoints 有效性
    if (!Array.isArray(routePoints) || routePoints.length === 0) {
      throw new BadRequestException(`路径点数组无效: ${JSON.stringify(routePoints)}`);
    }

    // 计算预计送达时间（假设平均速度 40km/h）
    const distance = this.calculateDistance(routePoints);
    const estimatedHours = distance / 40;
    const estimatedTime = new Date(Date.now() + estimatedHours * 60 * 60 * 1000);

    // 更新订单状态并创建路径（origin 已验证，可以安全使用）
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.SHIPPING,
        currentLocation: { lng: origin.lng, lat: origin.lat },
        estimatedTime,
      },
    });

    // 创建路径记录
    const route = await this.prisma.route.create({
      data: {
        orderId: id,
        points: routePoints,
        currentStep: 0,
        totalSteps: routePoints.length,
        interval: dto?.interval || 5000,
      },
    });

    // 添加时间线记录
    await this.prisma.logisticsTimeline.create({
      data: {
        orderId: id,
        status: '已揽收',
        description: '快递已从发货地揽收',
        location: origin.address,
      },
    });

    // 广播状态更新（订单已发货）
    this.trackingGateway.broadcastStatusUpdate(updatedOrder.orderNo, {
      orderNo: updatedOrder.orderNo,
      status: OrderStatus.SHIPPING,
      message: '订单已发货，正在运输中',
    });

    // 返回订单和路径信息
    return {
      ...updatedOrder,
      route,
    };
  }

  async deliver(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException('订单状态不允许签收');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.DELIVERED,
        actualTime: new Date(),
      },
    });

    // 添加时间线记录
    const destination = order.destination as any;
    await this.prisma.logisticsTimeline.create({
      data: {
        orderId: id,
        status: '已签收',
        description: '包裹已成功签收',
        location: destination.address,
      },
    });

    // 广播配送完成事件
    this.trackingGateway.broadcastDeliveryComplete(order.orderNo, {
      orderNo: order.orderNo,
      status: OrderStatus.DELIVERED,
      actualTime: updatedOrder.actualTime,
    });

    return updatedOrder;
  }

  async delete(id: string, merchantId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.merchantId !== merchantId) {
      throw new BadRequestException('无权限操作此订单');
    }

    return this.prisma.order.delete({ where: { id } });
  }

  /**
   * 获取最近的活动历史（物流时间线）
   */
  async getRecentActivities(merchantId: string, limit: number = 100) {
    // 获取该商家的所有订单ID
    const orders = await this.prisma.order.findMany({
      where: { merchantId },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    // 获取最近的活动历史
    const activities = await this.prisma.logisticsTimeline.findMany({
      where: {
        orderId: { in: orderIds },
      },
      include: {
        order: {
          select: {
            orderNo: true,
            status: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return activities;
  }

  private generateOrderNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `ORD${timestamp}${random}`;
  }

  private interpolateRoute(start: number[], end: number[], steps: number): number[][] {
    // 验证输入参数
    if (!Array.isArray(start) || start.length < 2 || !Array.isArray(end) || end.length < 2) {
      throw new Error(`插值路径参数无效: start=${JSON.stringify(start)}, end=${JSON.stringify(end)}`);
    }

    const startLng = start[0];
    const startLat = start[1];
    const endLng = end[0];
    const endLat = end[1];

    // 验证坐标有效性
    if (typeof startLng !== 'number' || typeof startLat !== 'number' ||
        typeof endLng !== 'number' || typeof endLat !== 'number' ||
        isNaN(startLng) || isNaN(startLat) || isNaN(endLng) || isNaN(endLat) ||
        !isFinite(startLng) || !isFinite(startLat) || !isFinite(endLng) || !isFinite(endLat)) {
      throw new Error(`插值路径坐标无效: start=[${startLng}, ${startLat}], end=[${endLng}, ${endLat}]`);
    }

    if (typeof steps !== 'number' || isNaN(steps) || steps <= 0 || !isFinite(steps)) {
      throw new Error(`插值路径步数无效: steps=${steps}`);
    }

    const points: number[][] = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lng = startLng + (endLng - startLng) * ratio;
      const lat = startLat + (endLat - startLat) * ratio;
      
      // 验证计算结果
      if (isNaN(lng) || isNaN(lat) || !isFinite(lng) || !isFinite(lat)) {
        throw new Error(`插值计算失败: 步骤 ${i}, ratio=${ratio}, 结果=[${lng}, ${lat}]`);
      }
      
      points.push([lng, lat]);
    }
    return points;
  }

  private calculateDistance(points: number[][]): number {
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      const [lng1, lat1] = points[i - 1];
      const [lng2, lat2] = points[i];
      distance += this.getDistanceBetweenPoints(lat1, lng1, lat2, lng2);
    }
    return distance;
  }

  private getDistanceBetweenPoints(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // 地球半径（公里）
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * 批量发货
   */
  async batchShip(merchantId: string, orderIds: string[]) {
    let shipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const orderId of orderIds) {
      try {
        const order = await this.prisma.order.findFirst({
          where: {
            id: orderId,
            merchantId,
            status: OrderStatus.PENDING,
          },
        });

        if (!order) {
          failed++;
          errors.push(`订单 ${orderId} 不存在或状态不允许发货`);
          continue;
        }

        await this.ship(orderId, merchantId);
        shipped++;
      } catch (error) {
        failed++;
        errors.push(`订单 ${orderId} 发货失败: ${error.message}`);
      }
    }

    return {
      shipped,
      failed,
      total: orderIds.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 批量删除
   * 只能删除待发货和已取消的订单
   */
  async batchDelete(merchantId: string, orderIds: string[]) {
    const result = await this.prisma.order.deleteMany({
      where: {
        id: { in: orderIds },
        merchantId,
        status: { in: [OrderStatus.PENDING, OrderStatus.CANCELLED] },
      },
    });

    return {
      deleted: result.count,
      total: orderIds.length,
      failed: orderIds.length - result.count,
    };
  }
}

